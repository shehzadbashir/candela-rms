const { PrismaClient } = require('@prisma/client');
const ExcelJS = require('exceljs');
const fs = require('fs-extra');
const path = require('path');
const { validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

class ProductController {
  /**
   * Get all products with advanced filtering
   */
  async getProducts(req, res) {
    try {
      const {
        storeId,
        categoryId,
        brandId,
        search,
        lowStock,
        expiring,
        expired,
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const where = {
        isActive: true
      };

      if (storeId) where.storeId = storeId;
      if (categoryId) where.categoryId = categoryId;
      if (brandId) where.brandId = brandId;

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { nameUrdu: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          unit: true,
          inventory: {
            where: storeId ? { storeId } : {},
            orderBy: { expiryDate: 'asc' }
          }
        },
        skip: (page - 1) * parseInt(limit),
        take: parseInt(limit),
        orderBy: { [sortBy]: sortOrder }
      });

      // Calculate stock levels
      const productsWithStock = products.map(product => {
        const totalStock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        const availableStock = product.inventory.reduce((sum, inv) => sum + inv.availableQuantity, 0);
        const reservedStock = product.inventory.reduce((sum, inv) => sum + inv.reservedQuantity, 0);
        
        return {
          ...product,
          totalStock,
          availableStock,
          reservedStock,
          stockValue: totalStock * product.costPrice,
          retailValue: totalStock * product.retailPrice
        };
      });

      // Apply filters
      let filteredProducts = productsWithStock;

      if (lowStock === 'true') {
        filteredProducts = filteredProducts.filter(p => p.availableStock <= p.minStock);
      }

      if (expiring === 'true') {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        
        filteredProducts = filteredProducts.filter(p => 
          p.inventory.some(inv => 
            inv.expiryDate && new Date(inv.expiryDate) <= thirtyDaysFromNow
          )
        );
      }

      if (expired === 'true') {
        const now = new Date();
        filteredProducts = filteredProducts.filter(p => 
          p.inventory.some(inv => 
            inv.expiryDate && new Date(inv.expiryDate) < now
          )
        );
      }

      const total = await prisma.product.count({ where });

      res.json({
        success: true,
        data: filteredProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get products error:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(req, res) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findUnique({
        where: { id },
        include: {
          category: true,
          brand: true,
          unit: true,
          inventory: {
            include: {
              store: {
                select: {
                  id: true,
                  name: true,
                  code: true
                }
              }
            },
            orderBy: { expiryDate: 'asc' }
          },
          priceHistory: {
            orderBy: { effectiveFrom: 'desc' },
            take: 10
          }
        }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const totalStock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const availableStock = product.inventory.reduce((sum, inv) => sum + inv.availableQuantity, 0);

      res.json({
        success: true,
        data: {
          ...product,
          totalStock,
          availableStock
        }
      });
    } catch (error) {
      console.error('Get product error:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }

  /**
   * Create new product
   */
  async createProduct(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        sku,
        barcode,
        name,
        nameUrdu,
        description,
        categoryId,
        brandId,
        unitId,
        costPrice,
        wholesalePrice,
        retailPrice,
        discountPrice,
        taxRate,
        minStock,
        maxStock,
        reorderLevel,
        weight,
        dimensions,
        color,
        size,
        isExpirable,
        isSerialized,
        isBatchTracked,
        storeId,
        initialStock,
        batchNumber,
        expiryDate,
        manufacturingDate,
        location,
        image
      } = req.body;

      // Check if SKU exists
      const existingProduct = await prisma.product.findUnique({
        where: { sku }
      });

      if (existingProduct) {
        return res.status(400).json({ error: 'Product SKU already exists' });
      }

      // Check if barcode exists
      if (barcode) {
        const existingBarcode = await prisma.product.findUnique({
          where: { barcode }
        });

        if (existingBarcode) {
          return res.status(400).json({ error: 'Barcode already exists' });
        }
      }

      // Handle image upload
      let imageUrl = null;
      if (image) {
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const filename = `product-${uuidv4()}.jpg`;
        const filepath = path.join(__dirname, '../../uploads/products', filename);
        
        await fs.writeFile(filepath, base64Data, 'base64');
        imageUrl = `/uploads/products/${filename}`;
      }

      // Create product
      const product = await prisma.$transaction(async (prisma) => {
        const newProduct = await prisma.product.create({
          data: {
            sku,
            barcode,
            name,
            nameUrdu,
            description,
            categoryId,
            brandId,
            unitId,
            costPrice: parseFloat(costPrice),
            wholesalePrice: parseFloat(wholesalePrice),
            retailPrice: parseFloat(retailPrice),
            discountPrice: discountPrice ? parseFloat(discountPrice) : null,
            taxRate: taxRate ? parseFloat(taxRate) : 17.0,
            minStock: minStock ? parseInt(minStock) : 10,
            maxStock: maxStock ? parseInt(maxStock) : null,
            reorderLevel: reorderLevel ? parseInt(reorderLevel) : 20,
            weight: weight ? parseFloat(weight) : null,
            dimensions,
            color,
            size,
            isExpirable: isExpirable || false,
            isSerialized: isSerialized || false,
            isBatchTracked: isBatchTracked !== false,
            imageUrl,
            storeId
          }
        });

        // Create price history
        await prisma.priceHistory.create({
          data: {
            productId: newProduct.id,
            storeId,
            costPrice: parseFloat(costPrice),
            wholesalePrice: parseFloat(wholesalePrice),
            retailPrice: parseFloat(retailPrice),
            discountPrice: discountPrice ? parseFloat(discountPrice) : null,
            effectiveFrom: new Date(),
            createdById: req.user.id
          }
        });

        // Create initial inventory
        if (initialStock && parseInt(initialStock) > 0) {
          const inv = await prisma.inventory.create({
            data: {
              productId: newProduct.id,
              storeId,
              quantity: parseInt(initialStock),
              availableQuantity: parseInt(initialStock),
              batchNumber: batchNumber || `BATCH-${Date.now()}`,
              expiryDate: expiryDate ? new Date(expiryDate) : null,
              manufacturingDate: manufacturingDate ? new Date(manufacturingDate) : null,
              location
            }
          });

          // Create stock movement
          await prisma.stockMovement.create({
            data: {
              productId: newProduct.id,
              inventoryId: inv.id,
              storeId,
              type: 'PURCHASE',
              quantity: parseInt(initialStock),
              beforeStock: 0,
              afterStock: parseInt(initialStock),
              reference: 'INITIAL_STOCK',
              remarks: 'Initial stock entry',
              createdById: req.user.id
            }
          });
        }

        return newProduct;
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CREATE',
          entity: 'PRODUCT',
          entityId: product.id,
          details: { product },
          ipAddress: req.ip
        }
      });

      // Emit socket event
      req.app.get('io').emit('productCreated', product);

      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: product
      });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: error.message || 'Failed to create product' });
    }
  }

  /**
   * Update product
   */
  async updateProduct(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const oldProduct = await prisma.product.findUnique({
        where: { id }
      });

      if (!oldProduct) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Check if SKU is being changed and already exists
      if (updateData.sku && updateData.sku !== oldProduct.sku) {
        const existingProduct = await prisma.product.findUnique({
          where: { sku: updateData.sku }
        });

        if (existingProduct) {
          return res.status(400).json({ error: 'Product SKU already exists' });
        }
      }

      // Check if barcode is being changed and already exists
      if (updateData.barcode && updateData.barcode !== oldProduct.barcode) {
        const existingBarcode = await prisma.product.findUnique({
          where: { barcode: updateData.barcode }
        });

        if (existingBarcode) {
          return res.status(400).json({ error: 'Barcode already exists' });
        }
      }

      // Handle image upload
      if (updateData.image) {
        const base64Data = updateData.image.replace(/^data:image\/\w+;base64,/, '');
        const filename = `product-${uuidv4()}.jpg`;
        const filepath = path.join(__dirname, '../../uploads/products', filename);
        
        await fs.writeFile(filepath, base64Data, 'base64');
        updateData.imageUrl = `/uploads/products/${filename}`;
        delete updateData.image;
      }

      const product = await prisma.$transaction(async (prisma) => {
        const updatedProduct = await prisma.product.update({
          where: { id },
          data: updateData
        });

        // Check if prices changed
        const pricesChanged = 
          oldProduct.costPrice !== updatedProduct.costPrice ||
          oldProduct.wholesalePrice !== updatedProduct.wholesalePrice ||
          oldProduct.retailPrice !== updatedProduct.retailPrice ||
          oldProduct.discountPrice !== updatedProduct.discountPrice;

        if (pricesChanged) {
          await prisma.priceHistory.create({
            data: {
              productId: updatedProduct.id,
              storeId: updatedProduct.storeId,
              costPrice: updatedProduct.costPrice,
              wholesalePrice: updatedProduct.wholesalePrice,
              retailPrice: updatedProduct.retailPrice,
              discountPrice: updatedProduct.discountPrice,
              effectiveFrom: new Date(),
              createdById: req.user.id
            }
          });
        }

        return updatedProduct;
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'UPDATE',
          entity: 'PRODUCT',
          entityId: id,
          oldValues: oldProduct,
          newValues: updateData,
          ipAddress: req.ip
        }
      });

      // Emit socket event
      req.app.get('io').emit('productUpdated', product);

      res.json({
        success: true,
        message: 'Product updated successfully',
        data: product
      });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Failed to update product' });
    }
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(req, res) {
    try {
      const { id } = req.params;

      // Check if product has transactions
      const hasTransactions = await prisma.saleItem.findFirst({
        where: { productId: id }
      });

      if (hasTransactions) {
        // Soft delete
        const product = await prisma.product.update({
          where: { id },
          data: { isActive: false }
        });

        return res.json({
          success: true,
          message: 'Product deactivated successfully',
          data: product
        });
      }

      // Hard delete if no transactions
      const product = await prisma.product.delete({
        where: { id }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'DELETE',
          entity: 'PRODUCT',
          entityId: id,
          details: { product },
          ipAddress: req.ip
        }
      });

      // Emit socket event
      req.app.get('io').emit('productDeleted', { id });

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      console.error('Delete product error:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  }

  /**
   * Import products from Excel
   */
  async importProducts(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(req.file.path);
      
      const worksheet = workbook.getWorksheet(1);
      const importedProducts = [];
      const errors = [];

      // Get or create default category
      let defaultCategory = await prisma.category.findFirst({
        where: { code: 'DEFAULT' }
      });

      if (!defaultCategory) {
        defaultCategory = await prisma.category.create({
          data: {
            name: 'General',
            code: 'DEFAULT',
            description: 'Default category'
          }
        });
      }

      // Get or create default unit
      let defaultUnit = await prisma.unit.findFirst({
        where: { code: 'PCS' }
      });

      if (!defaultUnit) {
        defaultUnit = await prisma.unit.create({
          data: {
            name: 'Pieces',
            code: 'PCS',
            symbol: 'pcs'
          }
        });
      }

      // Process each row
      for (let i = 2; i <= worksheet.rowCount; i++) {
        const row = worksheet.getRow(i);
        
        try {
          const [
            sku,
            barcode,
            name,
            nameUrdu,
            description,
            category,
            brand,
            unit,
            costPrice,
            wholesalePrice,
            retailPrice,
            discountPrice,
            taxRate,
            minStock,
            maxStock,
            reorderLevel,
            initialStock,
            expiryDays
          ] = row.values.slice(1);

          if (!sku || !name) {
            errors.push(`Row ${i}: SKU and Name are required`);
            continue;
          }

          // Check if product exists
          const existingProduct = await prisma.product.findUnique({
            where: { sku: sku.toString() }
          });

          if (existingProduct) {
            errors.push(`Row ${i}: Product with SKU ${sku} already exists`);
            continue;
          }

          // Get or create category
          let categoryRecord = defaultCategory;
          if (category) {
            categoryRecord = await prisma.category.findFirst({
              where: { name: category.toString() }
            });

            if (!categoryRecord) {
              categoryRecord = await prisma.category.create({
                data: {
                  name: category.toString(),
                  code: category.toString().toUpperCase().replace(/\s+/g, '_'),
                  description: category.toString()
                }
              });
            }
          }

          // Get or create brand
          let brandRecord = null;
          if (brand) {
            brandRecord = await prisma.brand.findFirst({
              where: { name: brand.toString() }
            });

            if (!brandRecord) {
              brandRecord = await prisma.brand.create({
                data: {
                  name: brand.toString(),
                  code: brand.toString().toUpperCase().replace(/\s+/g, '_')
                }
              });
            }
          }

          // Get or create unit
          let unitRecord = defaultUnit;
          if (unit) {
            unitRecord = await prisma.unit.findFirst({
              where: { name: unit.toString() }
            });

            if (!unitRecord) {
              unitRecord = await prisma.unit.create({
                data: {
                  name: unit.toString(),
                  code: unit.toString().toUpperCase().substring(0, 3),
                  symbol: unit.toString().substring(0, 3)
                }
              });
            }
          }

          // Create product
          const product = await prisma.product.create({
            data: {
              sku: sku.toString(),
              barcode: barcode?.toString(),
              name: name.toString(),
              nameUrdu: nameUrdu?.toString(),
              description: description?.toString(),
              categoryId: categoryRecord.id,
              brandId: brandRecord?.id,
              unitId: unitRecord.id,
              costPrice: parseFloat(costPrice) || 0,
              wholesalePrice: parseFloat(wholesalePrice) || 0,
              retailPrice: parseFloat(retailPrice) || 0,
              discountPrice: discountPrice ? parseFloat(discountPrice) : null,
              taxRate: parseFloat(taxRate) || 17.0,
              minStock: parseInt(minStock) || 10,
              maxStock: maxStock ? parseInt(maxStock) : null,
              reorderLevel: parseInt(reorderLevel) || 20,
              isExpirable: !!expiryDays,
              storeId: req.user.storeId
            }
          });

          // Create initial inventory
          if (initialStock && parseInt(initialStock) > 0) {
            const expiryDate = expiryDays 
              ? new Date(Date.now() + parseInt(expiryDays) * 24 * 60 * 60 * 1000)
              : null;

            await prisma.inventory.create({
              data: {
                productId: product.id,
                storeId: req.user.storeId,
                quantity: parseInt(initialStock),
                availableQuantity: parseInt(initialStock),
                batchNumber: `BATCH-${Date.now()}-${product.sku}`,
                expiryDate
              }
            });
          }

          importedProducts.push(product);
        } catch (error) {
          errors.push(`Row ${i}: ${error.message}`);
        }
      }

      // Delete uploaded file
      await fs.remove(req.file.path);

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'IMPORT',
          entity: 'PRODUCT',
          details: {
            count: importedProducts.length,
            errors: errors.length
          },
          ipAddress: req.ip
        }
      });

      // Emit socket event
      req.app.get('io').emit('productsImported', {
        count: importedProducts.length,
        errors: errors.length
      });

      res.json({
        success: true,
        message: `Imported ${importedProducts.length} products`,
        imported: importedProducts.length,
        errors,
        products: importedProducts
      });
    } catch (error) {
      console.error('Import products error:', error);
      res.status(500).json({ error: 'Failed to import products' });
    }
  }

  /**
   * Export products to Excel
   */
  async exportProducts(req, res) {
    try {
      const { storeId, categoryId, brandId, search } = req.query;

      const where = {
        isActive: true
      };
      
      if (storeId) where.storeId = storeId;
      if (categoryId) where.categoryId = categoryId;
      if (brandId) where.brandId = brandId;
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { barcode: { contains: search, mode: 'insensitive' } }
        ];
      }

      const products = await prisma.product.findMany({
        where,
        include: {
          category: true,
          brand: true,
          unit: true,
          inventory: {
            where: storeId ? { storeId } : {}
          }
        },
        orderBy: {
          name: 'asc'
        }
      });

      // Create workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Candela RMS';
      workbook.lastModifiedBy = req.user.name;
      workbook.created = new Date();
      workbook.modified = new Date();

      // Products worksheet
      const productsSheet = workbook.addWorksheet('Products');
      productsSheet.columns = [
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Barcode', key: 'barcode', width: 15 },
        { header: 'Product Name', key: 'name', width: 30 },
        { header: 'Name (Urdu)', key: 'nameUrdu', width: 30 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Brand', key: 'brand', width: 20 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Cost Price', key: 'costPrice', width: 15 },
        { header: 'Wholesale Price', key: 'wholesalePrice', width: 15 },
        { header: 'Retail Price', key: 'retailPrice', width: 15 },
        { header: 'Discount Price', key: 'discountPrice', width: 15 },
        { header: 'Tax Rate %', key: 'taxRate', width: 12 },
        { header: 'Min Stock', key: 'minStock', width: 10 },
        { header: 'Max Stock', key: 'maxStock', width: 10 },
        { header: 'Reorder Level', key: 'reorderLevel', width: 12 },
        { header: 'Current Stock', key: 'currentStock', width: 12 },
        { header: 'Available Stock', key: 'availableStock', width: 12 },
        { header: 'Stock Value', key: 'stockValue', width: 15 }
      ];

      // Style header row
      productsSheet.getRow(1).font = { bold: true };
      productsSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add products
      products.forEach(product => {
        const currentStock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        const availableStock = product.inventory.reduce((sum, inv) => sum + inv.availableQuantity, 0);
        const stockValue = currentStock * product.costPrice;

        productsSheet.addRow({
          sku: product.sku,
          barcode: product.barcode,
          name: product.name,
          nameUrdu: product.nameUrdu,
          description: product.description,
          category: product.category?.name,
          brand: product.brand?.name,
          unit: product.unit?.name,
          costPrice: product.costPrice,
          wholesalePrice: product.wholesalePrice,
          retailPrice: product.retailPrice,
          discountPrice: product.discountPrice,
          taxRate: product.taxRate,
          minStock: product.minStock,
          maxStock: product.maxStock,
          reorderLevel: product.reorderLevel,
          currentStock,
          availableStock,
          stockValue
        });
      });

      // Inventory worksheet
      const inventorySheet = workbook.addWorksheet('Inventory Details');
      inventorySheet.columns = [
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Product', key: 'product', width: 30 },
        { header: 'Batch Number', key: 'batch', width: 20 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Available', key: 'available', width: 10 },
        { header: 'Reserved', key: 'reserved', width: 10 },
        { header: 'Expiry Date', key: 'expiry', width: 15 },
        { header: 'Location', key: 'location', width: 20 },
        { header: 'Store', key: 'store', width: 20 }
      ];

      inventorySheet.getRow(1).font = { bold: true };
      inventorySheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      products.forEach(product => {
        product.inventory.forEach(inv => {
          inventorySheet.addRow({
            sku: product.sku,
            product: product.name,
            batch: inv.batchNumber,
            quantity: inv.quantity,
            available: inv.availableQuantity,
            reserved: inv.reservedQuantity,
            expiry: inv.expiryDate ? new Date(inv.expiryDate).toLocaleDateString() : '',
            location: inv.location,
            store: inv.store?.name
          });
        });
      });

      // Price history worksheet
      const priceSheet = workbook.addWorksheet('Price History');
      priceSheet.columns = [
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Product', key: 'product', width: 30 },
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Cost Price', key: 'costPrice', width: 15 },
        { header: 'Wholesale', key: 'wholesale', width: 15 },
        { header: 'Retail', key: 'retail', width: 15 },
        { header: 'Discount', key: 'discount', width: 15 },
        { header: 'Changed By', key: 'changedBy', width: 20 }
      ];

      priceSheet.getRow(1).font = { bold: true };
      priceSheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Get price history for products
      const priceHistory = await prisma.priceHistory.findMany({
        where: {
          productId: {
            in: products.map(p => p.id)
          }
        },
        include: {
          product: true,
          createdBy: true
        },
        orderBy: {
          effectiveFrom: 'desc'
        },
        take: 1000
      });

      priceHistory.forEach(ph => {
        priceSheet.addRow({
          sku: ph.product.sku,
          product: ph.product.name,
          date: new Date(ph.effectiveFrom).toLocaleDateString(),
          costPrice: ph.costPrice,
          wholesale: ph.wholesalePrice,
          retail: ph.retailPrice,
          discount: ph.discountPrice,
          changedBy: ph.createdBy?.name
        });
      });

      // Set response headers
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=products-export-${Date.now()}.xlsx`);

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Export products error:', error);
      res.status(500).json({ error: 'Failed to export products' });
    }
  }

  /**
   * Download product import template
   */
  async downloadTemplate(req, res) {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Product Template');

      // Define columns
      worksheet.columns = [
        { header: 'SKU*', key: 'sku', width: 15 },
        { header: 'Barcode', key: 'barcode', width: 15 },
        { header: 'Product Name*', key: 'name', width: 30 },
        { header: 'Name (Urdu)', key: 'nameUrdu', width: 30 },
        { header: 'Description', key: 'description', width: 40 },
        { header: 'Category', key: 'category', width: 20 },
        { header: 'Brand', key: 'brand', width: 20 },
        { header: 'Unit', key: 'unit', width: 10 },
        { header: 'Cost Price', key: 'costPrice', width: 15 },
        { header: 'Wholesale Price', key: 'wholesalePrice', width: 15 },
        { header: 'Retail Price', key: 'retailPrice', width: 15 },
        { header: 'Discount Price', key: 'discountPrice', width: 15 },
        { header: 'Tax Rate %', key: 'taxRate', width: 12 },
        { header: 'Min Stock', key: 'minStock', width: 10 },
        { header: 'Max Stock', key: 'maxStock', width: 10 },
        { header: 'Reorder Level', key: 'reorderLevel', width: 12 },
        { header: 'Initial Stock', key: 'initialStock', width: 12 },
        { header: 'Expiry Days', key: 'expiryDays', width: 12 }
      ];

      // Style header row
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F81BD' }
      };
      headerRow.font = { color: { argb: 'FFFFFFFF' } };

      // Add sample row
      worksheet.addRow({
        sku: 'SKU001',
        barcode: '1234567890123',
        name: 'Sample Product',
        nameUrdu: 'نمونہ پروڈکٹ',
        description: 'This is a sample product',
        category: 'Groceries',
        brand: 'Generic',
        unit: 'PCS',
        costPrice: 100,
        wholesalePrice: 120,
        retailPrice: 150,
        discountPrice: 140,
        taxRate: 17,
        minStock: 10,
        maxStock: 100,
        reorderLevel: 20,
        initialStock: 50,
        expiryDays: 365
      });

      // Add instructions
      worksheet.addRow([]);
      worksheet.addRow(['INSTRUCTIONS:']);
      worksheet.addRow(['1. Fields marked with * are required']);
      worksheet.addRow(['2. SKU must be unique']);
      worksheet.addRow(['3. Barcode must be unique if provided']);
      worksheet.addRow(['4. Categories, Brands, and Units will be created automatically if they don\'t exist']);
      worksheet.addRow(['5. Date format: YYYY-MM-DD']);
      worksheet.addRow(['6. Tax Rate should be in percentage (e.g., 17 for 17%)']);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=product-import-template.xlsx');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Download template error:', error);
      res.status(500).json({ error: 'Failed to download template' });
    }
  }

  /**
   * Search products (F1 shortcut)
   */
  async searchProducts(req, res) {
    try {
      const { q, storeId } = req.query;

      if (!q || q.length < 2) {
        return res.json([]);
      }

      const products = await prisma.product.findMany({
        where: {
          storeId,
          isActive: true,
          OR: [
            { sku: { contains: q, mode: 'insensitive' } },
            { barcode: { contains: q, mode: 'insensitive' } },
            { name: { contains: q, mode: 'insensitive' } },
            { nameUrdu: { contains: q, mode: 'insensitive' } }
          ]
        },
        include: {
          category: true,
          unit: true,
          inventory: {
            where: { storeId }
          }
        },
        take: 20,
        orderBy: {
          name: 'asc'
        }
      });

      const formattedProducts = products.map(p => ({
        ...p,
        currentStock: p.inventory.reduce((sum, inv) => sum + inv.quantity, 0),
        availableStock: p.inventory.reduce((sum, inv) => sum + inv.availableQuantity, 0)
      }));

      res.json(formattedProducts);
    } catch (error) {
      console.error('Search products error:', error);
      res.status(500).json({ error: 'Failed to search products' });
    }
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(req, res) {
    try {
      const { barcode } = req.params;
      const { storeId } = req.query;

      const product = await prisma.product.findUnique({
        where: { barcode },
        include: {
          category: true,
          brand: true,
          unit: true,
          inventory: {
            where: {
              storeId,
              quantity: { gt: 0 }
            },
            orderBy: { expiryDate: 'asc' }
          }
        }
      });

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      const totalStock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
      const availableStock = product.inventory.reduce((sum, inv) => sum + inv.availableQuantity, 0);

      res.json({
        ...product,
        currentStock: totalStock,
        availableStock
      });
    } catch (error) {
      console.error('Get product by barcode error:', error);
      res.status(500).json({ error: 'Failed to fetch product' });
    }
  }

  /**
   * Get low stock alert
   */
  async getLowStockAlert(req, res) {
    try {
      const { storeId } = req.query;

      const products = await prisma.product.findMany({
        where: {
          storeId,
          isActive: true
        },
        include: {
          category: true,
          inventory: {
            where: { storeId }
          }
        }
      });

      const lowStockProducts = products
        .filter(p => {
          const totalStock = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
          const availableStock = p.inventory.reduce((sum, inv) => sum + inv.availableQuantity, 0);
          return availableStock <= p.minStock;
        })
        .map(p => ({
          ...p,
          currentStock: p.inventory.reduce((sum, inv) => sum + inv.quantity, 0),
          availableStock: p.inventory.reduce((sum, inv) => sum + inv.availableQuantity, 0),
          requiredStock: p.reorderLevel - p.inventory.reduce((sum, inv) => sum + inv.availableQuantity, 0)
        }));

      res.json(lowStockProducts);
    } catch (error) {
      console.error('Get low stock alert error:', error);
      res.status(500).json({ error: 'Failed to fetch low stock alert' });
    }
  }

  /**
   * Get expiring products alert
   */
  async getExpiringProductsAlert(req, res) {
    try {
      const { storeId, days = 30 } = req.query;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(days));

      const inventory = await prisma.inventory.findMany({
        where: {
          storeId,
          expiryDate: {
            lte: expiryDate,
            gte: new Date()
          },
          quantity: {
            gt: 0
          }
        },
        include: {
          product: {
            include: {
              category: true,
              unit: true
            }
          }
        },
        orderBy: {
          expiryDate: 'asc'
        }
      });

      res.json(inventory);
    } catch (error) {
      console.error('Get expiring products alert error:', error);
      res.status(500).json({ error: 'Failed to fetch expiring products' });
    }
  }

  /**
   * Get product statistics
   */
  async getProductStats(req, res) {
    try {
      const { storeId } = req.query;

      const where = storeId ? { storeId } : {};

      const [
        totalProducts,
        totalCategories,
        totalBrands,
        lowStockCount,
        expiringCount,
        outOfStockCount,
        totalStockValue
      ] = await Promise.all([
        prisma.product.count({ where: { ...where, isActive: true } }),
        prisma.category.count(),
        prisma.brand.count(),
        prisma.product.count({
          where: {
            ...where,
            isActive: true,
            inventory: {
              some: {
                availableQuantity: {
                  lte: prisma.product.fields.minStock
                }
              }
            }
          }
        }),
        prisma.inventory.count({
          where: {
            ...where,
            expiryDate: {
              lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              gte: new Date()
            },
            quantity: { gt: 0 }
          }
        }),
        prisma.product.count({
          where: {
            ...where,
            isActive: true,
            inventory: {
              every: {
                availableQuantity: 0
              }
            }
          }
        }),
        prisma.inventory.aggregate({
          where,
          _sum: {
            quantity: true
          }
        }).then(result => {
          // This is simplified - actual calculation would need product costs
          return result._sum.quantity || 0;
        })
      ]);

      res.json({
        totalProducts,
        totalCategories,
        totalBrands,
        lowStockCount,
        expiringCount,
        outOfStockCount,
        totalStockValue
      });
    } catch (error) {
      console.error('Get product stats error:', error);
      res.status(500).json({ error: 'Failed to fetch product statistics' });
    }
  }
}

module.exports = new ProductController();