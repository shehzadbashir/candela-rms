import { useState, useEffect, useRef } from 'react';
import { useQuery } from 'react-query';
import { useTranslation } from 'next-i18next';
import { productsAPI } from '@/services/api';
import Modal from '@/components/Common/Modal';
import { HiSearch, HiX } from 'react-icons/hi';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: any) => void;
  storeId?: string;
}

export default function ProductSearchModal({
  isOpen,
  onClose,
  onSelect,
  storeId
}: ProductSearchModalProps) {
  const { t } = useTranslation('common');
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: products, isLoading } = useQuery(
    ['productSearch', searchTerm, storeId],
    () => productsAPI.search(searchTerm, storeId),
    {
      enabled: searchTerm.length >= 2,
      keepPreviousData: true
    }
  );

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    } else {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && products?.length > 0) {
        onSelect(products[0]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        // Navigate down
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        // Navigate up
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, products, onSelect]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('product.search')} size="lg">
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('product.searchPlaceholder')}
            className="w-full px-4 py-3 pl-12 pr-10 text-lg border-2 border-gray-300 rounded-lg focus:border-primary-500 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-600"
          />
          <HiSearch className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            >
              <HiX className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Quick Search Hint */}
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t('product.searchHint')}
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : products?.length > 0 ? (
            <div className="grid grid-cols-1 gap-2">
              {products.map((product: any) => (
                <button
                  key={product.id}
                  onClick={() => {
                    onSelect(product);
                    onClose();
                  }}
                  className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors text-left"
                >
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-2xl text-gray-400">📦</span>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 ml-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {product.name}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                            {product.sku}
                          </span>
                          {product.barcode && (
                            <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                              {product.barcode}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-primary-600 dark:text-primary-400">
                          Rs. {product.retailPrice?.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {t('product.stock')}: {product.availableStock || 0}
                        </div>
                      </div>
                    </div>

                    {/* Stock Status */}
                    {product.availableStock <= product.minStock && (
                      <div className="mt-2">
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                          {t('product.lowStock')}
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : searchTerm.length >= 2 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('product.noResults')}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {t('product.typeToSearch')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {t('product.shortcuts')}: F1 - {t('product.search')}, ↑↓ - {t('product.navigate')}, Enter - {t('product.select')}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('common.close')} (ESC)
          </button>
        </div>
      </div>
    </Modal>
  );
}