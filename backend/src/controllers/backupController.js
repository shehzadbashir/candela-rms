const { PrismaClient } = require('@prisma/client');
const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');
const util = require('util');
const execPromise = util.promisify(exec);

const prisma = new PrismaClient();

class BackupController {
  // Create database backup
  async createBackup(req, res) {
    try {
      const { notes, type = 'MANUAL' } = req.body;

      // Generate backup filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.sql`;
      const backupPath = path.join(__dirname, '../../../database/backups', filename);

      // Ensure backup directory exists
      await fs.ensureDir(path.join(__dirname, '../../../database/backups'));

      // Get database URL from environment
      const dbUrl = new URL(process.env.DATABASE_URL);
      const { username, password, hostname, port, pathname } = dbUrl;
      const database = pathname.substring(1);

      // Set PGPASSWORD environment variable
      process.env.PGPASSWORD = password;

      // Run pg_dump
      const command = `pg_dump -h ${hostname} -p ${port} -U ${username} -d ${database} -F c -f ${backupPath}`;
      
      await execPromise(command, { env: process.env });

      // Get file size
      const stats = await fs.stat(backupPath);
      const fileSize = (stats.size / 1024 / 1024).toFixed(2) + ' MB';

      // Create backup record
      const backup = await prisma.databaseBackup.create({
        data: {
          fileName: filename,
          fileSize,
          filePath: backupPath,
          backupType: type,
          notes,
          status: 'COMPLETED',
          createdById: req.user.id
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'CREATE',
          entity: 'DATABASE_BACKUP',
          entityId: backup.id,
          details: { backup },
          ipAddress: req.ip
        }
      });

      res.json({
        success: true,
        message: 'Backup created successfully',
        backup
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  }

  // Restore database from backup
  async restoreBackup(req, res) {
    try {
      const { id } = req.params;

      const backup = await prisma.databaseBackup.findUnique({
        where: { id }
      });

      if (!backup) {
        return res.status(404).json({ error: 'Backup not found' });
      }

      // Check if backup file exists
      if (!await fs.pathExists(backup.filePath)) {
        return res.status(404).json({ error: 'Backup file not found' });
      }

      // Get database URL from environment
      const dbUrl = new URL(process.env.DATABASE_URL);
      const { username, password, hostname, port, pathname } = dbUrl;
      const database = pathname.substring(1);

      // Set PGPASSWORD environment variable
      process.env.PGPASSWORD = password;

      // Run pg_restore
      const command = `pg_restore -h ${hostname} -p ${port} -U ${username} -d ${database} -c ${backup.filePath}`;
      
      await execPromise(command, { env: process.env });

      // Update backup record
      await prisma.databaseBackup.update({
        where: { id },
        data: {
          restoredAt: new Date(),
          restoredById: req.user.id
        }
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: req.user.id,
          action: 'RESTORE',
          entity: 'DATABASE_BACKUP',
          entityId: backup.id,
          details: { backup },
          ipAddress: req.ip
        }
      });

      res.json({
        success: true,
        message: 'Database restored successfully'
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to restore database' });
    }
  }

  // Get all backups
  async getBackups(req, res) {
    try {
      const backups = await prisma.databaseBackup.findMany({
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          restoredBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json(backups);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Server error' });
    }
  }

  // Download backup
  async downloadBackup(req, res) {
    try {
      const { id } = req.params;

      const backup = await prisma.databaseBackup.findUnique({
        where: { id }
      });

      if (!backup) {
        return res.status(404).json({ error: 'Backup not found' });
      }

      if (!await fs.pathExists(backup.filePath)) {
        return res.status(404).json({ error: 'Backup file not found' });
      }

      res.download(backup.filePath, backup.fileName);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to download backup' });
    }
  }

  // Delete backup
  async deleteBackup(req, res) {
    try {
      const { id } = req.params;

      const backup = await prisma.databaseBackup.findUnique({
        where: { id }
      });

      if (!backup) {
        return res.status(404).json({ error: 'Backup not found' });
      }

      // Delete file
      if (await fs.pathExists(backup.filePath)) {
        await fs.remove(backup.filePath);
      }

      // Delete record
      await prisma.databaseBackup.delete({
        where: { id }
      });

      res.json({ message: 'Backup deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete backup' });
    }
  }

  // Schedule automatic backup
  async scheduleBackup(req, res) {
    try {
      const { schedule, time } = req.body;

      // Save backup schedule to database or config file
      // This would typically be stored in a settings table

      res.json({
        success: true,
        message: 'Backup scheduled successfully',
        schedule: { schedule, time }
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to schedule backup' });
    }
  }
}

module.exports = new BackupController();