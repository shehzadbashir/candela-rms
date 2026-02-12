import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/Layout';
import DataTable from '@/components/Common/DataTable';
import Modal from '@/components/Common/Modal';
import ProductForm from '@/components/Inventory/ProductForm';
import ProductSearchModal from '@/components/Inventory/ProductSearchModal';
import { productsAPI, categoriesAPI, brandsAPI, unitsAPI } from '@/services/api';
import { 
  HiPlus, 
  HiDownload, 
  HiUpload, 
  HiPencil, 
  HiTrash, 
  HiSearch,
  HiRefresh,
  HiFilter,
  HiOutlineDocumentDownload,
  HiOutlineDocumentText,
  HiOutlineExclamation,
  HiOutlineClock,
  HiOutlineCube
} from 'react-icons/hi';
import { useAuth } from '@/hooks/useAuth';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export default function ProductsPage() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filters, setFilters] = useState({
    storeId: user?.storeId,
    categoryId: '',
    brandId: '',
    search: '',
    lowStock: false,
    expiring: false,
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // Queries
  const { data: productsData, isLoading, refetch } = useQuery(
    ['products', filters],
    () => productsAPI.getProducts(filters),
    { keepPreviousData: true }
  );

  const { data: categories } = useQuery('categories', categoriesAPI.getAll);
  const { data: brands } = useQuery('brands', brandsAPI.getAll);
  const { data: units } = useQuery('units', unitsAPI.getAll);

  // Mutations
  const deleteMutation = useMutation(
    (id: string) => productsAPI.deleteProduct(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('products');
        toast.success(t('products.deleteSuccess'));
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || t('products.deleteError'));
      }
    }
  );

  const exportMutation = useMutation(
    () => productsAPI.exportProducts(filters),
    {
      onSuccess: () => {
        toast.success(t('products.exportSuccess'));
      },
      onError: () => {
        toast.error(t('products.exportError'));
      }
    }
  );

  const importMutation = useMutation(
    (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return productsAPI.importProducts(formData);
    },
    {
      onSuccess: (data) => {
        queryClient.invalidateQueries('products');
        toast.success(t('products.importSuccess', { count: data.imported }));
        if (data.errors.length > 0) {
          console.warn('Import errors:', data.errors);
        }
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.error || t('products.importError'));
      }
    }
  );

  // Columns for DataTable
  const columns = [
    {
      key: 'sku',
      title: t('products.sku'),
      render: (row: any) => (
        <span className="font-mono text-sm font-medium text-primary-600 dark:text-primary-400">
          {row.sku}
        </span>
      )
    },
    {
      key: 'name',
      title: t('products.name'),
      render: (row: any) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {row.name}
          </div>
          {row.nameUrdu && (
            <div className="text-sm text-gray-500 dark:text-gray-400 font-urdu">
              {row.nameUrdu}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'barcode',
      title: t('products.barcode'),
      render: (row: any) => row.barcode || '-'
    },
    {
      key: 'category',
      title: t('products.category'),
      render: (row: any) => row.category?.name || '-'
    },
    {
      key: 'stock',
      title: t('products.stock'),
      render: (row: any) => {
        const isLowStock = row.availableStock <= row.minStock;
        return (
          <div>
            <span className={`font-medium ${isLowStock ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
              {row.availableStock || 0}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm ml-1">
              / {row.minStock}
            </span>
            {isLowStock && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                {t('products.lowStock')}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'price',
      title: t('products.retailPrice'),
      render: (row: any) => `Rs. ${row.retailPrice?.toLocaleString()}`
    },
    {
      key: 'expiry',
      title: t('products.expiry'),
      render: (row: any) => {
        const expiringItems = row.inventory?.filter(
          (inv: any) => inv.expiryDate && new Date(inv.expiryDate) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        );
        return expiringItems?.length > 0 ? (
          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
            {t('products.expiringSoon')}
          </span>
        ) : '-';
      }
    },
    {
      key: 'status',
      title: t('products.status'),
      render: (row: any) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          row.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {row.isActive ? t('products.active') : t('products.inactive')}
        </span>
      )
    },
    {
      key: 'actions',
      title: t('common.actions'),
      render: (row: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedProduct(row);
              setShowEditModal(true);
            }}
            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
            title={t('common.edit')}
          >
            <HiPencil className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleQuickSearch(row)}
            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400"
            title={t('products.quickSearch')}
          >
            <HiSearch className="h-5 w-5" />
          </button>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => handleDelete(row.id)}
              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
              title={t('common.delete')}
            >
              <HiTrash className="h-5 w-5" />
            </button>
          )}
        </div>
      )
    }
  ];

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onF1: () => setShowSearchModal(true),
    onF2: () => setShowCreateModal(true),
    onF5: () => refetch(),
    onF6: () => exportMutation.mutate(),
    onCtrlN: () => setShowCreateModal(true),
    onEscape: () => {
      setShowCreateModal(false);
      setShowEditModal(false);
      setShowSearchModal(false);
      setShowFilterModal(false);
    }
  });

  // Handlers
  const handleDelete = (id: string) => {
    if (window.confirm(t('products.confirmDelete'))) {
      deleteMutation.mutate(id);
    }
  };

  const handleExport = () => {
    exportMutation.mutate();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      importMutation.mutate(file);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      await productsAPI.downloadTemplate();
      toast.success(t('products.templateDownloaded'));
    } catch (error) {
      toast.error(t('products.templateError'));
    }
  };

  const handleQuickSearch = (product: any) => {
    setFilters({ ...filters, search: product.sku });
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page });
  };

  // Alert badges
  const AlertBadges = () => {
    const { data: lowStock } = useQuery(
      'lowStockAlert',
      () => productsAPI.getLowStockAlert({ storeId: user?.storeId }),
      { refetchInterval: 30000 }
    );

    const { data: expiring } = useQuery(
      'expiringAlert',
      () => productsAPI.getExpiringProductsAlert({ storeId: user?.storeId }),
      { refetchInterval: 30000 }
    );

    return (
      <div className="flex space-x-2">
        {lowStock?.length > 0 && (
          <button
            onClick={() => handleFilterChange('lowStock', true)}
            className="flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full hover:bg-red-200"
          >
            <HiOutlineExclamation className="h-4 w-4 mr-1" />
            {t('products.lowStockCount', { count: lowStock.length })}
          </button>
        )}
        {expiring?.length > 0 && (
          <button
            onClick={() => handleFilterChange('expiring', true)}
            className="flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full hover:bg-yellow-200"
          >
            <HiOutlineClock className="h-4 w-4 mr-1" />
            {t('products.expiringCount', { count: expiring.length })}
          </button>
        )}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t('products.title')}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('products.subtitle')}
            </p>
          </div>
          <div className="flex space-x-3">
            <AlertBadges />
            
            <div className="relative">
              <button
                onClick={() => setShowFilterModal(true)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <HiFilter className="h-5 w-5 mr-2" />
                {t('common.filter')}
              </button>
            </div>

            <div className="flex space-x-2">
              {/* Import Dropdown */}
              <div className="relative">
                <button
                  onClick={() => document.getElementById('import-file')?.click()}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <HiUpload className="h-5 w-5 mr-2" />
                  {t('products.import')}
                </button>
                <input
                  id="import-file"
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImport}
                  className="hidden"
                />
              </div>

              {/* Export Dropdown */}
              <div className="relative group">
                <button
                  onClick={handleExport}
                  disabled={exportMutation.isLoading}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50"
                >
                  <HiDownload className="h-5 w-5 mr-2" />
                  {t('products.export')}
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 hidden group-hover:block">
                  <button
                    onClick={handleExport}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {t('products.exportCurrent')}
                  </button>
                  <button
                    onClick={handleDownloadTemplate}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {t('products.downloadTemplate')}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                <HiPlus className="h-5 w-5 mr-2" />
                {t('products.addProduct')}
              </button>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder={t('products.searchPlaceholder')}
                className="w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
              <HiSearch className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            </div>
            <button
              onClick={() => setShowSearchModal(true)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <HiOutlineCube className="h-5 w-5 mr-2" />
              {t('products.quickSearch')} (F1)
            </button>
            <button
              onClick={() => refetch()}
              className="p-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
            >
              <HiRefresh className="h-5 w-5" />
            </button>
          </div>

          {/* Active Filters */}
          {(filters.categoryId || filters.brandId || filters.lowStock || filters.expiring) && (
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {t('common.activeFilters')}:
              </span>
              {filters.categoryId && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  {t('products.category')}: {categories?.find(c => c.id === filters.categoryId)?.name}
                  <button
                    onClick={() => handleFilterChange('categoryId', '')}
                    className="ml-1 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.brandId && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                  {t('products.brand')}: {brands?.find(b => b.id === filters.brandId)?.name}
                  <button
                    onClick={() => handleFilterChange('brandId', '')}
                    className="ml-1 hover:text-blue-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.lowStock && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                  {t('products.lowStock')}
                  <button
                    onClick={() => handleFilterChange('lowStock', false)}
                    className="ml-1 hover:text-red-900"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.expiring && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                  {t('products.expiringSoon')}
                  <button
                    onClick={() => handleFilterChange('expiring', false)}
                    className="ml-1 hover:text-yellow-900"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={() => setFilters({
                  ...filters,
                  categoryId: '',
                  brandId: '',
                  lowStock: false,
                  expiring: false,
                  search: ''
                })}
                className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
              >
                {t('common.clearAll')}
              </button>
            </div>
          )}
        </div>

        {/* Products Table */}
        <DataTable
          columns={columns}
          data={productsData?.data || []}
          loading={isLoading}
          pagination={productsData?.pagination}
          onPageChange={handlePageChange}
          emptyMessage={t('products.noProducts')}
        />

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('products.totalProducts')}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {productsData?.pagination?.total || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('products.totalCategories')}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {categories?.length || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('products.totalBrands')}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {brands?.length || 0}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {t('products.totalUnits')}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {units?.length || 0}
            </div>
          </div>
        </div>

        {/* Create/Edit Modals */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={t('products.addProduct')}
          size="lg"
        >
          <ProductForm
            onSuccess={() => {
              setShowCreateModal(false);
              queryClient.invalidateQueries('products');
              toast.success(t('products.createSuccess'));
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>

        <Modal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setSelectedProduct(null);
          }}
          title={t('products.editProduct')}
          size="lg"
        >
          {selectedProduct && (
            <ProductForm
              initialData={selectedProduct}
              onSuccess={() => {
                setShowEditModal(false);
                setSelectedProduct(null);
                queryClient.invalidateQueries('products');
                toast.success(t('products.updateSuccess'));
              }}
              onCancel={() => {
                setShowEditModal(false);
                setSelectedProduct(null);
              }}
            />
          )}
        </Modal>

        {/* Search Modal */}
        <ProductSearchModal
          isOpen={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSelect={(product) => {
            setSelectedProduct(product);
            setShowEditModal(true);
            setShowSearchModal(false);
          }}
          storeId={user?.storeId}
        />

        {/* Filter Modal */}
        <Modal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          title={t('common.filter')}
          size="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.category')}
              </label>
              <select
                value={filters.categoryId}
                onChange={(e) => handleFilterChange('categoryId', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">{t('common.all')}</option>
                {categories?.map((category: any) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.brand')}
              </label>
              <select
                value={filters.brandId}
                onChange={(e) => handleFilterChange('brandId', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">{t('common.all')}</option>
                {brands?.map((brand: any) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.sortBy')}
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="name">{t('products.name')}</option>
                <option value="sku">SKU</option>
                <option value="retailPrice">{t('products.price')}</option>
                <option value="createdAt">{t('products.createdAt')}</option>
                <option value="updatedAt">{t('products.updatedAt')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.sortOrder')}
              </label>
              <select
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="asc">{t('common.ascending')}</option>
                <option value="desc">{t('common.descending')}</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setShowFilterModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {t('common.apply')}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
}

export async getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}