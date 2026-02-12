const express = require('express');
const backupController = require('../controllers/backupController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Get all backups
router.get('/', authenticate, authorize('ADMIN'), backupController.getBackups);

// Create backup
router.post('/', authenticate, authorize('ADMIN'), backupController.createBackup);

// Schedule backup
router.post('/schedule', authenticate, authorize('ADMIN'), backupController.scheduleBackup);

// Restore backup
router.post('/:id/restore', authenticate, authorize('ADMIN'), backupController.restoreBackup);

// Download backup
router.get('/:id/download', authenticate, authorize('ADMIN'), backupController.downloadBackup);

// Delete backup
router.delete('/:id', authenticate, authorize('ADMIN'), backupController.deleteBackup);

module.exports = router;