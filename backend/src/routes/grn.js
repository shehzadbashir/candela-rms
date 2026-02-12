const express = require('express');
const { body } = require('express-validator');
const grnController = require('../controllers/grnController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all GRNs
router.get('/', authenticate, authorize('ADMIN', 'MANAGER', 'WAREHOUSE'), grnController.getGRNs);

// Get purchase orders for GRN
router.get('/purchase-orders', authenticate, grnController.getPurchaseOrdersForGRN);

// Get GRN by ID
router.get('/:id', authenticate, grnController.getGRNById);

// Export GRN to Excel
router.get('/:id/export', authenticate, grnController.exportGRN);

// Create GRN
router.post('/', 
  authenticate, 
  authorize('ADMIN', 'MANAGER', 'WAREHOUSE'),
  [
    body('supplierId').notEmpty(),
    body('items').isArray().notEmpty()
  ],
  grnController.createGRN
);

// Update GRN
router.put('/:id', authenticate, authorize('ADMIN', 'MANAGER'), grnController.updateGRN);

// Delete GRN
router.delete('/:id', authenticate, authorize('ADMIN'), grnController.deleteGRN);

module.exports = router;