export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  nameUrdu?: string;
  description?: string;
  categoryId: string;
  brandId?: string;
  unitId: string;
  costPrice: number;
  wholesalePrice: number;
  retailPrice: number;
  discountPrice?: number;
  taxRate: number;
  minStock: number;
  maxStock?: number;
  reorderLevel: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Inventory {
  id: string;
  productId: string;
  storeId: string;
  batchNumber?: string;
  serialNumber?: string;
  expiryDate?: string;
  quantity: number;
  availableQuantity: number;
  reservedQuantity: number;
  location?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  userId: string;
  storeId: string;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  createdAt: string;
}