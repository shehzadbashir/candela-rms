const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');

const prisma = new PrismaClient();

class GRNController {
  // Get all GRNs
  async getGRNs(req, res) {
    try {
      const {
        storeId,
        supplierId,
        status,
        startDate,
        endDate,
        page = 1,
        limit = 20
      } = req.query;

      const where = {
        storeId
      };

      if (supplierId) where.supplierId = supplierId;
      if (status) where.status = status;
      if (startDate && endDate) {
        where.receivedDate = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const grns = await prisma.gRN.findMany({
        where,
        include: {
          supplier: true,
          purchaseOrder: true,
          receivedBy: true,
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: (page - 1) * parseInt(limit),
        take: parseInt(limit)
      });

      const total = await prisma.gRN.count({ where });

      res.json({
        data: grns,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Get GRN by ID
  async getGRNById(req, res) {
    try {
      const { id } = req.params;

      const grn = await prisma.gRN.findUnique({
        where: { id },
        include: {
          supplier: true,
          purchaseOrder: {
            include: {
              items: {
                include: {
                  product: true
                }
              }
            }
          },
          receivedBy: true,
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  unit: true
                }
              }
            }
          }
        }
      });

      if (!grn) {
        return res.status(404).json({ error: 'GRN not found' });
      }

      res.json(grn);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Create GRN
  async createGRN(req, res) {
    try {
      const {
        purchaseOrderId,
        supplierId,
        receivedDate,
        invoiceNumber,
        invoiceDate,
        items,
        discountPercent,
        discountAmount,
        shippingCost,
        otherCharges,
        notes
      } = req.body;

      // Generate GRN number
      const grnNumber = `GRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;

      const grnItems = [];

      // Start transaction
      const result = await prisma.$transaction(async (prisma) => {
        // Process each item
        for (const item of items) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId }
          });

          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          const itemTotal = item.receivedQuantity * item.unitPrice;
          const itemTax = itemTotal * (product.taxRate / 100);
          
          subtotal += itemTotal;
          taxAmount += itemTax;

          // Create inventory record
          const batchNumber = item.batchNumber || `BATCH-${Date.now()}-${product.sku}`;
          
          const inventory = await prisma.inventory.create({
            data: {
              productId: product.id,
              storeId: req.user.storeId,
              quantity: item.receivedQuantity,
              availableQuantity: item.receivedQuantity,
              batchNumber,
              expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
              manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
              location: item.location
            }
          });

          // Create stock movement
          await prisma.stockMovement.create({
            data: {
              productId: product.id,
              inventoryId: inventory.id,
              storeId: req.user.storeId,
              type: 'PURCHASE',
              quantity: item.receivedQuantity,
              beforeStock: 0,
              afterStock: item.receivedQuantity,
              reference: grnNumber,
              remarks: `GRN received from supplier`,
              createdById: req.user.id
            }
          });

          grnItems.push({
            productId: product.id,
            quantity: item.quantity || item.receivedQuantity,
            receivedQuantity: item.receivedQuantity,
            freeQuantity: item.freeQuantity || 0,
            unitPrice: item.unitPrice,
            discountPercent: item.discountPercent || 0,
            discountAmount: item.discountAmount || 0,
            taxRate: product.taxRate,
            taxAmount: itemTax,
            totalPrice: itemTotal + itemTax,
            batchNumber,
            expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
            manufacturingDate: item.manufacturingDate ? new Date(item.manufacturingDate) : null,
            location: item.location
          });

          // Update purchase order item if linked
          if (item.purchaseItemId) {
            await prisma.purchaseItem.update({
              where: { id: item.purchaseItemId },
              data: {
                receivedQuantity: {
                  increment: item.receivedQuantity
                }
              }
            });
          }
        }

        const totalDiscount = discountAmount || (subtotal * (discountPercent || 0) / 100);
        const totalAmount = subtotal + taxAmount + (shippingCost || 0) + (otherCharges || 0) - totalDiscount;

        // Create GRN
        const grn = await prisma.gRN.create({
          data: {
            grnNumber,
            purchaseOrderId,
            supplierId,
            storeId: req.user.storeId,
            receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
            invoiceNumber,
            invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
            status: 'COMPLETED',
            subtotal,
            discountAmount: totalDiscount,
            discountPercent: discountPercent || 0,
            taxAmount,
            shippingCost: shippingCost || 0,
            otherCharges: otherCharges || 0,
            totalAmount,
            notes,
            receivedById: req.user.id,
            items: {
              create: grnItems
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            },
            supplier: true
          }
        });

        // Update purchase order status if linked
        if (purchaseOrderId) {
          const purchaseOrder = await prisma.purchaseOrder.findUnique({
            where: { id: purchaseOrderId },
            include: { items: true }
          });

          const allItemsReceived = purchaseOrder.items.every(
            item => item.receivedQuantity >= item.quantity
          );

          await prisma.purchaseOrder.update({
            where: { id: purchaseOrderId },
            data: {
              status: allItemsReceived ? 'RECEIVED' : 'PARTIAL',
              deliveryDate: new Date()
            }
          });
        }

        // Update supplier balance
        await prisma.supplier.update({
          where: { id: supplierId },
          data: {
            currentBalance: {
              increment: totalAmount
            }
          }
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: req.user.id,
            action: 'CREATE',
            entity: 'GRN',
            entityId: grn.id,
            details: { grn },
            ipAddress: req.ip
          }
        });

        return grn;
      });

      res.status(201).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
  }

  // Update GRN
  async updateGRN(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const grn = await prisma.gRN.update({
        where: { id },
        data: updateData
      });

      res.json(grn);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Delete GRN
  async deleteGRN(req, res) {
    try {
      const { id } = req.params;

      // Get GRN items to reverse inventory
      const grn = await prisma.gRN.findUnique({
        where: { id },
        include: { items: true }
      });

      // Start transaction
      await prisma.$transaction(async (prisma) => {
        // Reverse inventory
        for (const item of grn.items) {
          await prisma.inventory.deleteMany({
            where: {
              productId: item.productId,
              storeId: grn.storeId,
              batchNumber: item.batchNumber
            }
          });

          // Create stock movement for reversal
          await prisma.stockMovement.create({
            data: {
              productId: item.productId,
              storeId: grn.storeId,
              type: 'ADJUSTMENT',
              quantity: -item.receivedQuantity,
              beforeStock: item.receivedQuantity,
              afterStock: 0,
              reference: grn.grnNumber,
              remarks: 'GRN deleted - stock reversed',
              createdById: req.user.id
            }
          });
        }

        // Update supplier balance
        await prisma.supplier.update({
          where: { id: grn.supplierId },
          data: {
            currentBalance: {
              decrement: grn.totalAmount
            }
          }
        });

        // Delete GRN
        await prisma.gRN.delete({
          where: { id }
        });
      });

      res.json({ message: 'GRN deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Get purchase orders for GRN
  async getPurchaseOrdersForGRN(req, res) {
    try {
      const { storeId } = req.query;

      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: {
          storeId,
          status: {
            in: ['APPROVED', 'PARTIAL']
          }
        },
        include: {
          supplier: true,
          items: {
            include: {
              product: true
            }
          }
        },
        orderBy: {
          orderDate: 'desc'
        }
      });

      // Calculate received quantities
      const posWithPending = purchaseOrders.map(po => {
        const items = po.items.map(item => ({
          ...item,
          pendingQuantity: item.quantity - item.receivedQuantity
        }));

        return {
          ...po,
          items,
          totalPending: items.reduce((sum, item) => sum + item.pendingQuantity, 0)
        };
      });

      res.json(posWithPending);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Export GRN to Excel
  async exportGRN(req, res) {
    try {
      const { id } = req.params;

      const grn = await prisma.gRN.findUnique({
        where: { id },
        include: {
          supplier: true,
          receivedBy: true,
          items: {
            include: {
              product: true
            }
          }
        }
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('GRN');

      // Add company info
      worksheet.mergeCells('A1:H1');
      worksheet.getCell('A1').value = 'Candela RMS';
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.getCell('A1').alignment = { horizontal: 'center' };

      worksheet.mergeCells('A2:H2');
      worksheet.getCell('A2').value = 'Goods Received Note';
      worksheet.getCell('A2').font = { size: 14, bold: true };
      worksheet.getCell('A2').alignment = { horizontal: 'center' };

      // Add GRN details
      worksheet.addRow([]);
      worksheet.addRow(['GRN Number:', grn.grnNumber, 'Date:', new Date(grn.receivedDate).toLocaleDateString()]);
      worksheet.addRow(['Supplier:', grn.supplier.name, 'Invoice #:', grn.invoiceNumber || 'N/A']);
      worksheet.addRow(['Received By:', grn.receivedBy.name, 'Status:', grn.status]);

      // Add items table
      worksheet.addRow([]);
      
      const headerRow = worksheet.addRow([
        'SKU',
        'Product',
        'Batch',
        'Quantity',
        'Unit Price',
        'Discount',
        'Tax',
        'Total'
      ]);

      headerRow.eachCell(cell => {
        cell.font = { bold: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFE0E0E0' }
        };
      });

      // Add items
      grn.items.forEach(item => {
        worksheet.addRow([
          item.product.sku,
          item.product.name,
          item.batchNumber,
          item.receivedQuantity,
          item.unitPrice,
          item.discountAmount,
          item.taxAmount,
          item.totalPrice
        ]);
      });

      // Add summary
      worksheet.addRow([]);
      worksheet.addRow(['Subtotal:', '', '', '', '', '', '', grn.subtotal]);
      worksheet.addRow(['Discount:', '', '', '', '', '', '', grn.discountAmount]);
      worksheet.addRow(['Tax:', '', '', '', '', '', '', grn.taxAmount]);
      worksheet.addRow(['Shipping:', '', '', '', '', '', '', grn.shippingCost || 0]);
      worksheet.addRow(['Other Charges:', '', '', '', '', '', '', grn.otherCharges || 0]);
      
      const totalRow = worksheet.addRow(['TOTAL:', '', '', '', '', '', '', grn.totalAmount]);
      totalRow.font = { bold: true };

      // Set column widths
      worksheet.columns = [
        { width: 15 },
        { width: 30 },
        { width: 20 },
        { width: 10 },
        { width: 15 },
        { width: 15 },
        { width: 15 },
        { width: 15 }
      ];

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=GRN-${grn.grnNumber}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to export GRN' });
    }
  }
}

module.exports = new GRNController();