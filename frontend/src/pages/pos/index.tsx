import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/Layout';
import { posAPI, productsAPI } from '../../services/api';
import { HiSearch, HiX, HiPrinter, HiCash, HiCreditCard } from 'react-icons/hi';
import toast from 'react-hot-toast';
import BarcodeScanner from '@/components/POS/BarcodeScanner';
import CartItem from '@/components/POS/CartItem';
import PaymentModal from '@/components/POS/PaymentModal';

interface CartItem {
  id: string;
  productId: string;
  name: string;
  barcode: string;
  price: number;
  quantity: number;
  total: number;
}

export default function POS() {
  const { t } = useTranslation('common');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const { data: products, refetch: searchProducts } = useQuery(
    ['products', 'search', searchTerm],
    () => productsAPI.search(searchTerm),
    { enabled: false }
  );

  const createSaleMutation = useMutation(posAPI.createSale, {
    onSuccess: (data) => {
      toast.success(t('pos.saleComplete'));
      handlePrintReceipt(data.data?.id);
      setCart([]);
      setShowPayment(false);
    },
    onError: () => {
      toast.error(t('pos.saleError'));
    }
  });

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const product = await productsAPI.getByBarcode(barcode);
      addToCart(product);
    } catch (error) {
      toast.error(t('pos.productNotFound'));
    }
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      
      if (existing) {
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
            : item
        );
      }

      return [
        ...prev,
        {
          id: `cart-${Date.now()}`,
          productId: product.id,
          name: product.name,
          barcode: product.barcode,
          price: product.unitPrice,
          quantity: 1,
          total: product.unitPrice
        }
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }

    setCart(prev =>
      prev.map(item =>
        item.productId === productId
          ? { ...item, quantity, total: quantity * item.price }
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.17; // 17% FBR tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleCheckout = (paymentMethod: string) => {
    const saleData = {
      items: cart.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.price
      })),
      paymentMethod,
      customerId,
      discount: 0
    };

    createSaleMutation.mutate(saleData);
  };

  const handlePrintReceipt = async (saleId: string) => {
    try {
      await posAPI.printReceipt(saleId);
      toast.success(t('pos.receiptPrinted'));
    } catch (error) {
      toast.error(t('pos.printError'));
    }
  };

  // Focus barcode input on mount
  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  return (
    <Layout>
      <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-100px)]">
        {/* Products Section */}
        <div className="lg:w-2/3 space-y-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              {t('pos.products')}
            </h2>
            
            {/* Barcode Scanner */}
            <BarcodeScanner 
              onScan={handleBarcodeScan}
              inputRef={barcodeInputRef}
            />

            {/* Search */}
            <div className="relative mt-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchProducts()}
                placeholder={t('pos.searchProducts')}
                className="w-full px-4 py-2 pl-10 pr-4 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <HiSearch className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 overflow-y-auto max-h-[500px]">
              {products?.data?.map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg hover:shadow-md transition-shadow text-left"
                >
                  <h3 className="font-medium text-gray-900 dark:text-white truncate">
                    {product.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {product.sku}
                  </p>
                  <p className="text-lg font-bold text-primary-600 dark:text-primary-400 mt-2">
                    Rs. {product.unitPrice.toLocaleString()}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:w-1/3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow h-full flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('pos.cart')}
              </h2>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {cart.map((item) => (
                <CartItem
                  key={item.id}
                  item={item}
                  onUpdateQuantity={updateQuantity}
                  onRemove={removeItem}
                />
              ))}

              {cart.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  {t('pos.emptyCart')}
                </div>
              )}
            </div>

            {/* Cart Summary */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{t('pos.subtotal')}:</span>
                <span>Rs. {calculateSubtotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>{t('pos.tax')} (17%):</span>
                <span>Rs. {calculateTax().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
                <span>{t('pos.total')}:</span>
                <span>Rs. {calculateTotal().toLocaleString()}</span>
              </div>

              <button
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0}
                className="w-full bg-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('pos.checkout')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPayment && (
        <PaymentModal
          total={calculateTotal()}
          onClose={() => setShowPayment(false)}
          onConfirm={handleCheckout}
          isProcessing={createSaleMutation.isLoading}
        />
      )}
    </Layout>
  );
}

export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
