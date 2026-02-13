const { PrismaClient } = jest.requireActual('@prisma/client');

const mockPrisma = new PrismaClient();

// Mock database methods
mockPrisma.product = {
  findMany: jest.fn().mockResolvedValue([]),
  findUnique: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockResolvedValue({ id: '1', name: 'Test Product' }),
  update: jest.fn().mockResolvedValue({ id: '1', name: 'Updated Product' }),
  delete: jest.fn().mockResolvedValue({ id: '1' }),
};

mockPrisma.user = {
  findUnique: jest.fn().mockResolvedValue({ id: '1', email: 'test@example.com' }),
};

module.exports = { PrismaClient: jest.fn(() => mockPrisma) };