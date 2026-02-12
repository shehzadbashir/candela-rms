const express = require('express');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const productController = require('../controllers/productController');
const { authenticate, authorize } = require('../middleware/auth');
const { auditLog } = require('../middleware/audit');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/temp'));
  },
  filename: (req, file, cb) => {
    cb(null, `products-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel and CSV files are allowed.'));
    }
  }
});

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management
 */

/**
 * @swagger
 * /products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *       - in: query
 *         name: brandId
 *         schema:
 *           type: string
 *       - in: query
 *         name: storeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', authenticate, productController.getProducts);

/**
 * @swagger
 * /products/search:
 *   get:
 *     summary: Search products (F1 shortcut)
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/search', authenticate, productController.searchProducts);

/**
 * @swagger
 * /products/stats:
 *   get:
 *     summary: Get product statistics
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/stats', authenticate, productController.getProductStats);

/**
 * @swagger
 * /products/alerts/low-stock:
 *   get:
 *     summary: Get low stock alerts
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/alerts/low-stock', authenticate, productController.getLowStockAlert);

/**
 * @swagger
 * /products/alerts/expiring:
 *   get:
 *     summary: Get expiring products alerts
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/alerts/expiring', authenticate, productController.getExpiringProductsAlert);

/**
 * @swagger
 * /products/barcode/{barcode}:
 *   get:
 *     summary: Get product by barcode
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/barcode/:barcode', authenticate, productController.getProductByBarcode);

/**
 * @swagger
 * /products/export:
 *   get:
 *     summary: Export products to Excel
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/export', authenticate, productController.exportProducts);

/**
 * @swagger
 * /products/template:
 *   get:
 *     summary: Download product import template
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/template', authenticate, productController.downloadTemplate);

/**
 * @swagger
 * /products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:id', authenticate, productController.getProductById);

/**
 * @swagger
 * /products:
 *   post:
 *     summary: Create new product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', 
  authenticate, 
  authorize('ADMIN', 'MANAGER'),
  auditLog('CREATE', 'PRODUCT'),
  [
    body('sku').notEmpty().withMessage('SKU is required'),
    body('name').notEmpty().withMessage('Product name is required'),
    body('categoryId').notEmpty().withMessage('Category is required'),
    body('unitId').notEmpty().withMessage('Unit is required'),
    body('costPrice').isFloat({ min: 0 }).withMessage('Valid cost price is required'),
    body('retailPrice').isFloat({ min: 0 }).withMessage('Valid retail price is required'),
    body('storeId').notEmpty().withMessage('Store is required')
  ],
  productController.createProduct
);

/**
 * @swagger
 * /products/import:
 *   post:
 *     summary: Import products from Excel
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.post('/import',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  upload.single('file'),
  productController.importProducts
);

/**
 * @swagger
 * /products/{id}:
 *   put:
 *     summary: Update product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:id',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  auditLog('UPDATE', 'PRODUCT'),
  productController.updateProduct
);

/**
 * @swagger
 * /products/{id}:
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 */
router.delete('/:id',
  authenticate,
  authorize('ADMIN'),
  auditLog('DELETE', 'PRODUCT'),
  productController.deleteProduct
);

module.exports = router;