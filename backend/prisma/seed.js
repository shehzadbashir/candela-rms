const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  // Create main store
  const mainStore = await prisma.store.create({
    data: {
      name: 'Candela RMS - Main Branch',
      address: '123 Main Street, Lahore, Pakistan',
      phone: '+92 42 12345678',
      email: 'main@candelarms.com',
      taxNumber: 'TAX-001-2024'
    }
  });

  // Create second store
  const secondStore = await prisma.store.create({
    data: {
      name: 'Candela RMS - Gulberg Branch',
      address: '456 Gulberg Road, Lahore, Pakistan',
      phone: '+92 42 87654321',
      email: 'gulberg@candelarms.com',
      taxNumber: 'TAX-002-2024'
    }
  });

  // Create users with different roles
  const hashedPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@candelarms.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      storeId: mainStore.id
    }
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@candelarms.com',
      password: hashedPassword,
      name: 'Manager User',
      role: 'MANAGER',
      storeId: mainStore.id
    }
  });

  const cashier = await prisma.user.create({
    data: {
      email: 'cashier@candelarms.com',
      password: hashedPassword,
      name: 'Cashier User',
      role: 'CASHIER',
      storeId: mainStore.id
    }
  });

  // Create sample products
  const products = [
    {
      sku: 'SKU001',
      barcode: '1234567890123',
      name: 'Premium Rice 5kg',
      description: 'High quality basmati rice',
      category: 'Groceries',
      unitPrice: 850.00,
      costPrice: 700.00,
      taxRate: 17.0,
      minStock: 20,
      storeId: mainStore.id
    },
    {
      sku: 'SKU002',
      barcode: '1234567890124',
      name: 'Cooking Oil 3L',
      description: 'Pure vegetable cooking oil',
      category: 'Groceries',
      unitPrice: 650.00,
      costPrice: 520.00,
      taxRate: 17.0,
      minStock: 30,
      storeId: mainStore.id
    },
    {
      sku: 'SKU003',
      barcode: '1234567890125',
      name: 'Wheat Flour 10kg',
      description: 'Fine whole wheat flour',
      category: 'Groceries',
      unitPrice: 550.00,
      costPrice: 440.00,
      taxRate: 17.0,
      minStock: 25,
      storeId: mainStore.id
    }
  ];

  for (const productData of products) {
    const product = await prisma.product.create({
      data: productData
    });

    // Add inventory
    await prisma.inventory.create({
      data: {
        productId: product.id,
        storeId: mainStore.id,
        quantity: 100,
        batchNumber: `BATCH-${Date.now()}-${product.sku}`,
        expiryDate: new Date('2025-12-31')
      }
    });
  }

  // Create sample customer
  const customer = await prisma.customer.create({
    data: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+92 300 1234567',
      address: '123 Customer Street, Lahore',
      loyaltyPoints: 150
    }
  });

  // Create sample supplier
  const supplier = await prisma.supplier.create({
    data: {
      name: 'ABC Distributors',
      contactPerson: 'Ali Khan',
      email: 'ali@abcdist.com',
      phone: '+92 42 11122233',
      address: '456 Supplier Road, Lahore',
      storeId: mainStore.id
    }
  });

  console.log('Database seeded successfully!');
  console.log({
    admin: 'admin@candelarms.com / admin123',
    manager: 'manager@candelarms.com / admin123',
    cashier: 'cashier@candelarms.com / admin123'
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });