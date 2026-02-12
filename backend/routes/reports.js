const express = require('express');
const { prisma } = require('../server');
const { authenticate, authorize } = require('../middleware/auth');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');

const router = express.Router();

// Sales report
router.get('/sales', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { startDate, endDate, storeId, groupBy = 'day' } = req.query;

    const where = {
      createdAt: {
        gte: new Date(startDate),
        lte: new Date(endDate)
      },
      status: 'COMPLETED'
    };

    if (storeId) where.storeId = storeId;

    const sales = await prisma.sale.findMany({
      where,
      include: {
        items: {
          include: {
            product: true
          }
        },
        store: true
      }
    });

    // Group sales by date
    const groupedSales = {};
    sales.forEach(sale => {
      let key;
      const date = new Date(sale.createdAt);
      
      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'year') {
        key = date.getFullYear().toString();
      }

      if (!groupedSales[key]) {
        groupedSales[key] = {
          period: key,
          sales: 0,
          revenue: 0,
          tax: 0,
          profit: 0,
          items: 0
        };
      }

      groupedSales[key].sales += 1;
      groupedSales[key].revenue += sale.totalAmount;
      groupedSales[key].tax += sale.taxAmount;
      
      // Calculate profit
      let profit = 0;
      sale.items.forEach(item => {
        profit += (item.unitPrice - item.product.costPrice) * item.quantity;
      });
      groupedSales[key].profit += profit;
      
      groupedSales[key].items += sale.items.reduce((sum, item) => sum + item.quantity, 0);
    });

    const summary = {
      totalSales: sales.length,
      totalRevenue: sales.reduce((sum, s) => sum + s.totalAmount, 0),
      totalTax: sales.reduce((sum, s) => sum + s.taxAmount, 0),
      totalProfit: sales.reduce((sum, s) => {
        let profit = 0;
        s.items.forEach(item => {
          profit += (item.unitPrice - item.product.costPrice) * item.quantity;
        });
        return sum + profit;
      }, 0),
      averageOrderValue: sales.reduce((sum, s) => sum + s.totalAmount, 0) / sales.length || 0
    };

    res.json({
      summary,
      daily: Object.values(groupedSales),
      raw: sales
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Inventory valuation report
router.get('/inventory-valuation', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const { storeId } = req.query;

    const where = {};
    if (storeId) where.storeId = storeId;

    const inventory = await prisma.inventory.findMany({
      where,
      include: {
        product: true,
        store: true
      }
    });

    const valuation = {
      totalCost: 0,
      totalRetail: 0,
      potentialProfit: 0,
      items: []
    };

    inventory.forEach(item => {
      const costValue = item.quantity * item.product.costPrice;
      const retailValue = item.quantity * item.product.unitPrice;
      
      valuation.totalCost += costValue;
      valuation.totalRetail += retailValue;
      valuation.potentialProfit += retailValue - costValue;
      
      valuation.items.push({
        productName: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        costPrice: item.product.costPrice,
        retailPrice: item.product.unitPrice,
        costValue,
        retailValue,
        profit: retailValue - costValue,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        store: item.store.name
      });
    });

    res.json(valuation);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Export to Excel
router.get('/export/excel', authenticate, async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Candela RMS';
    workbook.lastModifiedBy = req.user.name;
    workbook.created = new Date();
    workbook.modified = new Date();

    let data;
    let worksheet;

    if (reportType === 'sales') {
      worksheet = workbook.addWorksheet('Sales Report');
      
      // Fetch sales data
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
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

      // Add headers
      worksheet.columns = [
        { header: 'Invoice #', key: 'invoice', width: 20 },
        { header: 'Date', key: 'date', width: 20 },
        { header: 'Store', key: 'store', width: 20 },
        { header: 'Cashier', key: 'cashier', width: 20 },
        { header: 'Customer', key: 'customer', width: 20 },
        { header: 'Items', key: 'items', width: 10 },
        { header: 'Subtotal', key: 'subtotal', width: 15 },
        { header: 'Tax', key: 'tax', width: 15 },
        { header: 'Discount', key: 'discount', width: 15 },
        { header: 'Total', key: 'total', width: 15 },
        { header: 'Payment', key: 'payment', width: 15 }
      ];

      // Add data
      sales.forEach(sale => {
        worksheet.addRow({
          invoice: sale.invoiceNumber,
          date: sale.createdAt,
          store: sale.store.name,
          cashier: sale.user.name,
          customer: sale.customer?.name || 'Walk-in',
          items: sale.items.reduce((sum, item) => sum + item.quantity, 0),
          subtotal: sale.subtotal,
          tax: sale.taxAmount,
          discount: sale.discountAmount,
          total: sale.totalAmount,
          payment: sale.paymentMethod
        });
      });

      // Add summary row
      worksheet.addRow({});
      worksheet.addRow({
        invoice: 'TOTAL',
        subtotal: sales.reduce((sum, s) => sum + s.subtotal, 0),
        tax: sales.reduce((sum, s) => sum + s.taxAmount, 0),
        discount: sales.reduce((sum, s) => sum + s.discountAmount, 0),
        total: sales.reduce((sum, s) => sum + s.totalAmount, 0)
      });

    } else if (reportType === 'inventory') {
      worksheet = workbook.addWorksheet('Inventory Report');
      
      const inventory = await prisma.inventory.findMany({
        include: {
          product: true,
          store: true
        }
      });

      worksheet.columns = [
        { header: 'SKU', key: 'sku', width: 15 },
        { header: 'Product', key: 'product', width: 30 },
        { header: 'Store', key: 'store', width: 20 },
        { header: 'Quantity', key: 'quantity', width: 10 },
        { header: 'Batch', key: 'batch', width: 15 },
        { header: 'Expiry', key: 'expiry', width: 15 },
        { header: 'Cost Price', key: 'cost', width: 15 },
        { header: 'Retail Price', key: 'retail', width: 15 },
        { header: 'Total Cost', key: 'totalCost', width: 15 },
        { header: 'Total Retail', key: 'totalRetail', width: 15 }
      ];

      inventory.forEach(item => {
        worksheet.addRow({
          sku: item.product.sku,
          product: item.product.name,
          store: item.store.name,
          quantity: item.quantity,
          batch: item.batchNumber,
          expiry: item.expiryDate,
          cost: item.product.costPrice,
          retail: item.product.unitPrice,
          totalCost: item.quantity * item.product.costPrice,
          totalRetail: item.quantity * item.product.unitPrice
        });
      });
    }

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report-${Date.now()}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate Excel report' });
  }
});

// Export to PDF
router.get('/export/pdf', authenticate, async (req, res) => {
  try {
    const { reportType, startDate, endDate } = req.query;
    
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${reportType}-report-${Date.now()}.pdf`);
    
    doc.pipe(res);
    
    // Add header
    doc.fontSize(20).text('Candela RMS', { align: 'center' });
    doc.fontSize(16).text(`${reportType.toUpperCase()} REPORT`, { align: 'center' });
    doc.fontSize(12).text(`Period: ${startDate} to ${endDate}`, { align: 'center' });
    doc.moveDown();
    
    if (reportType === 'sales') {
      const sales = await prisma.sale.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate)
          }
        },
        include: {
          store: true,
          user: true
        }
      });

      // Summary
      doc.fontSize(14).text('Summary', { underline: true });
      doc.fontSize(12).text(`Total Sales: ${sales.length}`);
      doc.fontSize(12).text(`Total Revenue: $${sales.reduce((sum, s) => sum + s.totalAmount, 0).toFixed(2)}`);
      doc.fontSize(12).text(`Average Order: $${(sales.reduce((sum, s) => sum + s.totalAmount, 0) / sales.length || 0).toFixed(2)}`);
      doc.moveDown();

      // Table
      let y = doc.y;
      doc.fontSize(10);
      
      sales.forEach((sale, i) => {
        if (y > 700) {
          doc.addPage();
          y = 50;
        }
        
        doc.text(`${sale.invoiceNumber}`, 50, y);
        doc.text(`${new Date(sale.createdAt).toLocaleDateString()}`, 150, y);
        doc.text(sale.store.name, 250, y);
        doc.text(`$${sale.totalAmount.toFixed(2)}`, 400, y);
        y += 20;
      });
    }
    
    doc.end();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to generate PDF report' });
  }
});

module.exports = router;