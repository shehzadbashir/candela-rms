const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');
const fs = require('fs-extra');

dotenv.config();

const app = express();
const httpServer = createServer(app);
const prisma = new PrismaClient();

// Socket.io for real-time updates
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Candela RMS API',
      version: '2.0.0',
      description: 'Complete Retail Management System API',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}/api`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/categories', require('./src/routes/categories'));
app.use('/api/brands', require('./src/routes/brands'));
app.use('/api/units', require('./src/routes/units'));
app.use('/api/inventory', require('./src/routes/inventory'));
app.use('/api/grn', require('./src/routes/grn'));
app.use('/api/purchase-orders', require('./src/routes/purchaseOrders'));
app.use('/api/suppliers', require('./src/routes/suppliers'));
app.use('/api/pos', require('./src/routes/pos'));
app.use('/api/sales', require('./src/routes/sales'));
app.use('/api/customers', require('./src/routes/customers'));
app.use('/api/reports', require('./src/routes/reports'));
app.use('/api/stores', require('./src/routes/stores'));
app.use('/api/backup', require('./src/routes/backup'));
app.use('/api/settings', require('./src/routes/settings'));
app.use('/api/audit', require('./src/routes/audit'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

// Create uploads directory if not exists
fs.ensureDirSync(path.join(__dirname, 'uploads/products'));
fs.ensureDirSync(path.join(__dirname, 'uploads/receipts'));
fs.ensureDirSync(path.join(__dirname, 'uploads/temp'));
fs.ensureDirSync(path.join(__dirname, '../database/backups'));

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    prisma.$disconnect();
  });
});

module.exports = { app, httpServer, prisma, io };