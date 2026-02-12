const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../server');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');
const escpos = require('node-escpos');

const router = express.Router();

// Create new sale
router.post('/sale',
  authenticate,
  authorize('ADMIN', 'MANAGER', 'CASHIER'),
  auditLog('CREATE', 'SALE'),
  [
    body('items').isArray().notEmpty(),
    body('paymentMethod').isIn(['CASH', 'CARD', 'MOBILE_PAYMENT', 'CREDIT']),
    body('customerId').optional(),
    body('discount').optional().isFloat({ min: 0 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { items, paymentMethod, customerId, discount = 0 } = req.body;

      // Start transaction
      const result = await prisma.$transaction(async (prisma) => {
        // Calculate totals
        let subtotal = 0;
        let taxAmount = 0;

        // Verify stock and get product details
        const saleItems = [];
        for (const item of items) {
          const product = await prisma.product.findUnique({
            where: { id: item.productId },
            include: {
              inventory: {
                where: { 
                  storeId: req.user.storeId,
                  quantity: { gt: 0 }
                },
                orderBy: { expiryDate: 'asc' }
              }
            }
          });

          if (!product) {
            throw new Error(`Product ${item.productId} not found`);
          }

          // Check stock
          const totalStock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
          if (totalStock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name}`);
          }

          // Deduct from inventory (FIFO)
          let remainingQuantity = item.quantity;
          for (const inv of product.inventory) {
            if (remainingQuantity <= 0) break;
            
            const deductQuantity = Math.min(inv.quantity, remainingQuantity);
            await prisma.inventory.update({
              where: { id: inv.id },
              data: { quantity: { decrement: deductQuantity } }
            });
            
            remainingQuantity -= deductQuantity;
          }

          const itemTotal = product.unitPrice * item.quantity;
          const itemTax = itemTotal * (product.taxRate / 100);
          
          subtotal += itemTotal;
          taxAmount += itemTax;

          saleItems.push({
            productId: product.id,
            quantity: item.quantity,
            unitPrice: product.unitPrice,
            discount: item.discount || 0,
            taxRate: product.taxRate,
            totalPrice: itemTotal + itemTax - (item.discount || 0)
          });
        }

        const discountAmount = subtotal * (discount / 100);
        const totalAmount = subtotal + taxAmount - discountAmount;

        // Generate invoice number
        const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        // Create sale
        const sale = await prisma.sale.create({
          data: {
            invoiceNumber,
            customerId,
            userId: req.user.id,
            storeId: req.user.storeId,
            subtotal,
            taxAmount,
            discountAmount,
            totalAmount,
            paymentMethod,
            status: 'COMPLETED',
            items: {
              create: saleItems
            }
          },
          include: {
            items: {
              include: {
                product: true
              }
            },
            customer: true,
            user: true,
            store: true
          }
        });

        // Update customer loyalty points
        if (customerId) {
          await prisma.customer.update({
            where: { id: customerId },
            data: {
              loyaltyPoints: { increment: Math.floor(totalAmount / 10) },
              totalSpent: { increment: totalAmount }
            }
          });
        }

        return sale;
      });

      res.status(201).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message || 'Server error' });
    }
});

// Print receipt
router.post('/print-receipt/:saleId',
  authenticate,
  async (req, res) => {
    try {
      const sale = await prisma.sale.findUnique({
        where: { id: req.params.saleId },
        include: {
          items: {
            include: {
              product: true
            }
          },
          customer: true,
          store: true,
          user: true
        }
      });

      if (!sale) {
        return res.status(404).json({ error: 'Sale not found' });
      }

      // Generate ESC/POS commands
      const device = new escpos.USB();
      const printer = new escpos.Printer(device);

      device.open(() => {
        printer
          .font('a')
          .align('ct')
          .style('bu')
          .size(1, 1)
          .text(sale.store.name)
          .text(sale.store.address)
          .text(`Tel: ${sale.store.phone}`)
          .text(`Tax #: ${sale.store.taxNumber}`)
          .drawLine()
          .align('lt')
          .text(`Invoice: ${sale.invoiceNumber}`)
          .text(`Date: ${new Date(sale.createdAt).toLocaleString()}`)
          .text(`Cashier: ${sale.user.name}`)
          .text(`Customer: ${sale.customer?.name || 'Walk-in'}`)
          .drawLine()
          .tableCustom([
            { text: 'Item', width: 0.4 },
            { text: 'Qty', width: 0.15 },
            { text: 'Price', width: 0.15 },
            { text: 'Total', width: 0.3 }
          ]);

        // Print items
        sale.items.forEach(item => {
          printer.tableCustom([
            { text: item.product.name.substring(0, 20), width: 0.4 },
            { text: item.quantity.toString(), width: 0.15 },
            { text: item.unitPrice.toFixed(2), width: 0.15 },
            { text: (item.quantity * item.unitPrice).toFixed(2), width: 0.3 }
          ]);
        });

        printer
          .drawLine()
          .align('rt')
          .text(`Subtotal: ${sale.subtotal.toFixed(2)}`)
          .text(`Tax: ${sale.taxAmount.toFixed(2)}`)
          .text(`Discount: ${sale.discountAmount.toFixed(2)}`)
          .style('b')
          .text(`Total: ${sale.totalAmount.toFixed(2)}`)
          .style('normal')
          .text(`Paid via: ${sale.paymentMethod}`)
          .drawLine()
          .align('ct')
          .text('Thank you for shopping!')
          .text('FBR Registered')
          .cut()
          .close();
      });

      res.json({ message: 'Print job sent successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to print receipt' });
    }
});

// Get sales history
router.get('/sales',
  authenticate,
  async (req, res) => {
    try {
      const { 
        startDate, 
        endDate, 
        page = 1, 
        limit = 20 
      } = req.query;

      const where = {
        storeId: req.user.storeId
      };

      if (startDate && endDate) {
        where.createdAt = {
          gte: new Date(startDate),
          lte: new Date(endDate)
        };
      }

      const sales = await prisma.sale.findMany({
        where,
        include: {
          items: {
            include: {
              product: true
            }
          },
          customer: true,
          user: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * parseInt(limit),
        take: parseInt(limit)
      });

      const total = await prisma.sale.count({ where });

      res.json({
        data: sales,
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
});

module.exports = router;