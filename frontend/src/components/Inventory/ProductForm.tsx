import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from 'react-query';
import { useTranslation } from 'next-i18next';
import { categoriesAPI, brandsAPI, unitsAPI } from '@/services/api';
import { HiUpload } from 'react-icons/hi';
import toast from 'react-hot-toast';

interface ProductFormProps {
  initialData?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const { t } = useTranslation('common');
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.imageUrl || null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: initialData || {
      sku: '',
      barcode: '',
      name: '',
      nameUrdu: '',
      description: '',
      categoryId: '',
      brandId: '',
      unitId: '',
      costPrice: 0,
      wholesalePrice: 0,
      retailPrice: 0,
      discountPrice: 0,
      taxRate: 17,
      minStock: 10,
      maxStock: '',
      reorderLevel: 20,
      isExpirable: false,
      isSerialized: false,
      isBatchTracked: true,
      initialStock: 0,
      batchNumber: '',
      expiryDate: '',
      location: ''
    }
  });

  const { data: categories } = useQuery('categories', categoriesAPI.getAll);
  const { data: brands } = useQuery('brands', brandsAPI.getAll);
  const { data: units } = useQuery('units', unitsAPI.getAll);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setValue('image', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = (data: any) => {
    // Handle form submission
    console.log('Form data:', data);
    toast.success(initialData ? t('products.updateSuccess') : t('products.createSuccess'));
    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Basic Information */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.sku')} *
          </label>
          <input
            {...register('sku', { required: t('validation.required') })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          {errors.sku && (
            <p className="mt-1 text-sm text-red-600">{errors.sku.message?.toString()}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.barcode')}
          </label>
          <input
            {...register('barcode')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.name')} *
          </label>
          <input
            {...register('name', { required: t('validation.required') })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message?.toString()}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.nameUrdu')}
          </label>
          <input
            {...register('nameUrdu')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.description')}
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.category')} *
          </label>
          <select
            {...register('categoryId', { required: t('validation.required') })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">{t('common.select')}</option>
            {categories?.data?.map((category: any) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          {errors.categoryId && (
            <p className="mt-1 text-sm text-red-600">{errors.categoryId.message?.toString()}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.brand')}
          </label>
          <select
            {...register('brandId')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">{t('common.select')}</option>
            {brands?.data?.map((brand: any) => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.unit')} *
          </label>
          <select
            {...register('unitId', { required: t('validation.required') })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="">{t('common.select')}</option>
            {units?.data?.map((unit: any) => (
              <option key={unit.id} value={unit.id}>{unit.name}</option>
            ))}
          </select>
          {errors.unitId && (
            <p className="mt-1 text-sm text-red-600">{errors.unitId.message?.toString()}</p>
          )}
        </div>

        {/* Pricing */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.costPrice')} *
          </label>
          <input
            type="number"
            step="0.01"
            {...register('costPrice', { required: t('validation.required'), min: 0 })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          {errors.costPrice && (
            <p className="mt-1 text-sm text-red-600">{errors.costPrice.message?.toString()}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.wholesalePrice')} *
          </label>
          <input
            type="number"
            step="0.01"
            {...register('wholesalePrice', { required: t('validation.required'), min: 0 })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          {errors.wholesalePrice && (
            <p className="mt-1 text-sm text-red-600">{errors.wholesalePrice.message?.toString()}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.retailPrice')} *
          </label>
          <input
            type="number"
            step="0.01"
            {...register('retailPrice', { required: t('validation.required'), min: 0 })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
          {errors.retailPrice && (
            <p className="mt-1 text-sm text-red-600">{errors.retailPrice.message?.toString()}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.discountPrice')}
          </label>
          <input
            type="number"
            step="0.01"
            {...register('discountPrice')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.taxRate')} %
          </label>
          <input
            type="number"
            step="0.1"
            {...register('taxRate')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        {/* Stock Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.minStock')}
          </label>
          <input
            type="number"
            {...register('minStock')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.maxStock')}
          </label>
          <input
            type="number"
            {...register('maxStock')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.reorderLevel')}
          </label>
          <input
            type="number"
            {...register('reorderLevel')}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        {/* Initial Stock (for new products) */}
        {!initialData && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.initialStock')}
              </label>
              <input
                type="number"
                {...register('initialStock')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.batchNumber')}
              </label>
              <input
                {...register('batchNumber')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.expiryDate')}
              </label>
              <input
                type="date"
                {...register('expiryDate')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('products.location')}
              </label>
              <input
                {...register('location')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </>
        )}

        {/* Image Upload */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {t('products.image')}
          </label>
          <div className="flex items-center space-x-4">
            {imagePreview && (
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <label className="flex items-center px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700">
              <HiUpload className="h-5 w-5 mr-2" />
              <span>{t('products.uploadImage')}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Checkboxes */}
        <div className="md:col-span-2 space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register('isExpirable')}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('products.isExpirable')}
            </span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register('isSerialized')}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('products.isSerialized')}
            </span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              {...register('isBatchTracked')}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {t('products.isBatchTracked')}
            </span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          {initialData ? t('common.update') : t('common.save')}
        </button>
      </div>
    </form>
  );
}