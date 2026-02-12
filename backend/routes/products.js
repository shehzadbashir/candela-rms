const express = require('express');
const { body, validationResult } = require('express-validator');
const { prisma } = require('../server');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

// Get all products (with filters)
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      storeId, 
      category, 
      search, 
      lowStock,
      expiring,
      page = 1, 
      limit = 20 
    } = req.query;

    const where = {};
    
    if (storeId) where.storeId = storeId;
    if (category) where.category = category;
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
        inventory: {
          where: storeId ? { storeId } : {},
          orderBy: { expiryDate: 'asc' }
        }
      },
      skip: (page - 1) * parseInt(limit),
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    });

    // Filter low stock products
    if (lowStock === 'true') {
      const filtered = products.filter(p => {
        const totalStock = p.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
        return totalStock <= p.minStock;
      });
      return res.json(filtered);
    }

    // Filter expiring products (next 30 days)
    if (expiring === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const filtered = products.filter(p => {
        return p.inventory.some(inv => 
          inv.expiryDate && new Date(inv.expiryDate) <= thirtyDaysFromNow
        );
      });
      return res.json(filtered);
    }

    const total = await prisma.product.count({ where });

    res.json({
      data: products,
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

// Get single product
router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: {
        inventory: {
          include: { store: true },
          orderBy: { expiryDate: 'asc' }
        }
      }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create product (Admin/Manager only)
router.post('/', 
  authenticate, 
  authorize('ADMIN', 'MANAGER'),
  auditLog('CREATE', 'PRODUCT'),
  [
    body('sku').notEmpty(),
    body('name').notEmpty(),
    body('unitPrice').isFloat({ min: 0 }),
    body('costPrice').isFloat({ min: 0 }),
    body('storeId').notEmpty(),
    body('category').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const product = await prisma.product.create({
        data: {
          ...req.body,
          taxRate: req.body.taxRate || 17.0
        }
      });

      // Create initial inventory record
      if (req.body.initialStock) {
        await prisma.inventory.create({
          data: {
            productId: product.id,
            storeId: req.body.storeId,
            quantity: req.body.initialStock,
            batchNumber: req.body.batchNumber || `BATCH-${Date.now()}`,
            expiryDate: req.body.expiryDate
          }
        });
      }

      res.status(201).json(product);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
});

// Update product
router.put('/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  auditLog('UPDATE', 'PRODUCT'),
  async (req, res) => {
    try {
      const product = await prisma.product.update({
        where: { id: req.params.id },
        data: req.body
      });

      res.json(product);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
});

// Delete product (Admin only)
router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  auditLog('DELETE', 'PRODUCT'),
  async (req, res) => {
    try {
      await prisma.product.delete({
        where: { id: req.params.id }
      });

      res.json({ message: 'Product deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
});

// Get product by barcode (for POS)
router.get('/barcode/:barcode', authenticate, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { barcode: req.params.barcode },
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
      return res.status(404).json({ error: 'Product not found' });
    }

    const totalStock = product.inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    
    res.json({
      ...product,
      availableStock: totalStock
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;