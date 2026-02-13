import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useQuery, useMutation } from 'react-query';
import { useTranslation } from 'next-i18next';
import { grnAPI, suppliersAPI, productsAPI } from '../../services/api';
import { HiPlus, HiTrash, HiSearch } from 'react-icons/hi';
import toast from 'react-hot-toast';
import ProductSearchModal from './ProductSearchModal';

interface GRNFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any;
}

export default function GRNForm({ onSuccess, onCancel, initialData }: GRNFormProps) {
  const { t } = useTranslation('common');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: initialData || {
      supplierId: '',
      purchaseOrderId: '',
      receivedDate: new Date().toISOString().split('T')[0],
      invoiceNumber: '',
      invoiceDate: '',
      items: [],
      discountPercent: 0,
      shippingCost: 0,
      otherCharges: 0,
      notes: ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const { data: suppliers } = useQuery('suppliers', () => suppliersAPI.getAll());
  const { data: purchaseOrders } = useQuery(
    ['purchaseOrders', 'pending'],
    () => grnAPI.getPurchaseOrdersForGRN()
  );

  const createGRNMutation = useMutation(grnAPI.createGRN, {
    onSuccess: () => {
      toast.success(t('grn.createSuccess'));
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || t('grn.createError'));
    }
  });

  const watchItems = watch('items');
  const watchDiscountPercent = watch('discountPercent');
  const watchShippingCost = watch('shippingCost');
  const watchOtherCharges = watch('otherCharges');

  // Calculate totals
  const subtotal = watchItems?.reduce((sum: number, item: any) => {
    const itemTotal = (item.receivedQuantity || 0) * (item.unitPrice || 0);
    const itemDiscount = itemTotal * ((item.discountPercent || 0) / 100);
    return sum + itemTotal - itemDiscount;
  }, 0) || 0;

  const taxAmount = watchItems?.reduce((sum: number, item: any) => {
    const itemTotal = (item.receivedQuantity || 0) * (item.unitPrice || 0);
    const itemTax = itemTotal * ((item.taxRate || 17) / 100);
    return sum + itemTax;
  }, 0) || 0;

  const discountAmount = subtotal * (watchDiscountPercent / 100);
  const totalAmount = subtotal + taxAmount + (watchShippingCost || 0) + (watchOtherCharges || 0) - discountAmount;

  const handleAddProduct = (product: any) => {
    if (selectedItemIndex !== null) {
      // Update existing item
      const items = [...watchItems];
      items[selectedItemIndex] = {
        ...items[selectedItemIndex],
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        unitPrice: product.costPrice,
        taxRate: product.taxRate,
        receivedQuantity: 1
      };
      setValue('items', items);
      setSelectedItemIndex(null);
    } else {
      // Add new item
      append({
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        barcode: product.barcode,
        unitPrice: product.costPrice,
        taxRate: product.taxRate,
        receivedQuantity: 1,
        discountPercent: 0,
        batchNumber: `BATCH-${Date.now()}`,
        expiryDate: ''
      });
    }
    setShowProductSearch(false);
  };

  const handlePOSelect = (poId: string) => {
    const po = purchaseOrders?.data?.find((p: any) => p.id === poId);
    if (po) {
      setValue('supplierId', po.supplierId);
      
      // Add items from PO
      po.items.forEach((item: any) => {
        if (item.pendingQuantity > 0) {
          append({
            purchaseItemId: item.id,
            productId: item.productId,
            productName: item.product.name,
            sku: item.product.sku,
            barcode: item.product.barcode,
            unitPrice: item.unitPrice,
            taxRate: item.product.taxRate,
            quantity: item.quantity,
            receivedQuantity: item.pendingQuantity,
            discountPercent: item.discountPercent,
            batchNumber: `BATCH-${Date.now()}`,
            expiryDate: ''
          });
        }
      });
    }
  };

  const onSubmit = (data: any) => {
    const grnData = {
      ...data,
      items: data.items.map((item: any) => ({
        ...item,
        receivedQuantity: parseInt(item.receivedQuantity),
        unitPrice: parseFloat(item.unitPrice)
      }))
    };
    createGRNMutation.mutate(grnData);
  };

  // Handle F1 key for product search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setShowProductSearch(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('grn.supplier')} *
            </label>
            <select
              {...register('supplierId', { required: t('validation.required') })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">{t('common.select')}</option>
              {suppliers?.data?.map((supplier: any) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {errors.supplierId && (
              <p className="mt-1 text-sm text-red-600">{errors.supplierId?.message?.toString() || ''}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('grn.purchaseOrder')}
            </label>
            <select
              {...register('purchaseOrderId')}
              onChange={(e) => handlePOSelect(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="">{t('common.select')}</option>
              {purchaseOrders?.data?.map((po: any) => (
                <option key={po.id} value={po.id}>
                  {po.poNumber} - {po.supplier.name} (Pending: {po.totalPending})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('grn.receivedDate')} *
            </label>
            <input
              type="date"
              {...register('receivedDate', { required: t('validation.required') })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('grn.invoiceNumber')}
            </label>
            <input
              type="text"
              {...register('invoiceNumber')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('grn.invoiceDate')}
            </label>
            <input
              type="date"
              {...register('invoiceDate')}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
            />
          </div>
        </div>

        {/* Items */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {t('grn.items')}
            </h3>
            <button
              type="button"
              onClick={() => setShowProductSearch(true)}
              className="flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            >
              <HiSearch className="h-4 w-4 mr-1" />
              {t('grn.addItem')} (F1)
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('grn.product')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('grn.batch')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('grn.quantity')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('grn.unitPrice')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('grn.discount')} %
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('grn.tax')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('grn.total')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('grn.expiry')}
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {fields.map((field, index) => {
                  const itemTotal = watchItems[index]?.receivedQuantity * watchItems[index]?.unitPrice || 0;
                  const itemDiscount = itemTotal * (watchItems[index]?.discountPercent || 0) / 100;
                  const itemTax = itemTotal * (watchItems[index]?.taxRate || 17) / 100;
                  const itemFinalTotal = itemTotal - itemDiscount + itemTax;

                  return (
                    <tr key={field.id}>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          {...register(`items.${index}.productName`)}
                          readOnly
                          className="w-full px-2 py-1 bg-gray-50 border rounded dark:bg-gray-800"
                        />
                        <input
                          type="hidden"
                          {...register(`items.${index}.productId`)}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          {...register(`items.${index}.batchNumber`)}
                          className="w-full px-2 py-1 border rounded dark:bg-gray-800"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          {...register(`items.${index}.receivedQuantity`)}
                          className="w-20 px-2 py-1 border rounded dark:bg-gray-800"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          {...register(`items.${index}.unitPrice`)}
                          className="w-24 px-2 py-1 border rounded dark:bg-gray-800"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          {...register(`items.${index}.discountPercent`)}
                          className="w-16 px-2 py-1 border rounded dark:bg-gray-800"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-2">
                        {watchItems[index]?.taxRate || 17}%
                      </td>
                      <td className="px-4 py-2">
                        Rs. {itemFinalTotal.toFixed(2)}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="date"
                          {...register(`items.${index}.expiryDate`)}
                          className="w-32 px-2 py-1 border rounded dark:bg-gray-800"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <HiTrash className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('grn.notes')}
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('grn.subtotal')}:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Rs. {subtotal.toFixed(2)}
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('grn.discount')}:</span>
                <div className="flex items-center">
                  <input
                    type="number"
                    {...register('discountPercent')}
                    className="w-16 px-2 py-1 border rounded mr-2 dark:bg-gray-700"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                  <span className="text-gray-900 dark:text-white">
                    Rs. {discountAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('grn.tax')}:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  Rs. {taxAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('grn.shipping')}:</span>
                <input
                  type="number"
                  {...register('shippingCost')}
                  className="w-24 px-2 py-1 border rounded dark:bg-gray-700"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('grn.otherCharges')}:</span>
                <input
                  type="number"
                  {...register('otherCharges')}
                  className="w-24 px-2 py-1 border rounded dark:bg-gray-700"
                  step="0.01"
                  min="0"
                />
              </div>

              <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-900 dark:text-white">{t('grn.total')}:</span>
                <span className="text-primary-600 dark:text-primary-400">
                  Rs. {totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={createGRNMutation.isLoading}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {createGRNMutation.isLoading ? t('common.processing') : t('common.save')}
          </button>
        </div>
      </form>

      {/* Product Search Modal */}
      <ProductSearchModal
        isOpen={showProductSearch}
        onClose={() => {
          setShowProductSearch(false);
          setSelectedItemIndex(null);
        }}
        onSelect={handleAddProduct}
        storeId={watch('storeId')}
      />
    </>
  );
}