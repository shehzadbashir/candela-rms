import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/Layout';
import { grnAPI, suppliersAPI, productsAPI } from '../../../services/api';
import DataTable from '@/components/Common/DataTable';
import Modal from '@/components/Common/Modal';
import GRNForm from '@/components/Inventory/GRNForm';
import { HiPlus, HiDownload, HiEye, HiTrash } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';

export default function GRNPage() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedGRN, setSelectedGRN] = useState(null);
  const [filters, setFilters] = useState({
    storeId: user?.storeId,
    status: '',
    startDate: '',
    endDate: ''
  });

  const { data: grns, isLoading, refetch } = useQuery(
    ['grns', filters],
    () => grnAPI.getGRNs(filters)
  );

  const deleteGRNMutation = useMutation(grnAPI.deleteGRN, {
    onSuccess: () => {
      toast.success(t('grn.deleteSuccess'));
      refetch();
    },
    onError: () => {
      toast.error(t('grn.deleteError'));
    }
  });

  const columns = [
    {
      key: 'grnNumber',
      title: t('grn.grnNumber'),
      render: (row: any) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">
          {row.grnNumber}
        </span>
      )
    },
    {
      key: 'receivedDate',
      title: t('grn.receivedDate'),
      render: (row: any) => new Date(row.receivedDate).toLocaleDateString()
    },
    {
      key: 'supplier',
      title: t('grn.supplier'),
      render: (row: any) => row.supplier?.name
    },
    {
      key: 'invoiceNumber',
      title: t('grn.invoiceNumber')
    },
    {
      key: 'items',
      title: t('grn.items'),
      render: (row: any) => row.items?.length || 0
    },
    {
      key: 'totalAmount',
      title: t('grn.totalAmount'),
      render: (row: any) => `Rs. ${row.totalAmount?.toLocaleString()}`
    },
    {
      key: 'status',
      title: t('grn.status'),
      render: (row: any) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          row.status === 'COMPLETED' 
            ? 'bg-green-100 text-green-800' 
            : row.status === 'PENDING'
            ? 'bg-yellow-100 text-yellow-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {row.status}
        </span>
      )
    },
    {
      key: 'actions',
      title: t('common.actions'),
      render: (row: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedGRN(row)}
            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            <HiEye className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleExport(row.id)}
            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400"
          >
            <HiDownload className="h-5 w-5" />
          </button>
          {user?.role === 'ADMIN' && (
            <button
              onClick={() => handleDelete(row.id)}
              className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
            >
              <HiTrash className="h-5 w-5" />
            </button>
          )}
        </div>
      )
    }
  ];

  const handleExport = async (id: string) => {
    try {
      await grnAPI.exportGRN(id);
      toast.success(t('grn.exportSuccess'));
    } catch (error) {
      toast.error(t('grn.exportError'));
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t('grn.confirmDelete'))) {
      deleteGRNMutation.mutate(id);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('grn.title')}
          </h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <HiPlus className="h-5 w-5 mr-2" />
            {t('grn.newGRN')}
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('grn.status')}
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="">{t('common.all')}</option>
                <option value="PENDING">Pending</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('grn.startDate')}
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('grn.endDate')}
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          </div>
        </div>

        {/* GRN List */}
        <DataTable
          columns={columns}
          data={grns?.data || []}
          loading={isLoading}
          pagination={grns?.pagination}
        />

        {/* Create GRN Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={t('grn.createGRN')}
          size="lg"
        >
          <GRNForm
            onSuccess={() => {
              setShowCreateModal(false);
              refetch();
            }}
            onCancel={() => setShowCreateModal(false)}
          />
        </Modal>

        {/* View GRN Modal */}
        <Modal
          isOpen={!!selectedGRN}
          onClose={() => setSelectedGRN(null)}
          title={t('grn.viewGRN')}
          size="lg"
        >
          {selectedGRN && (
            <GRNView grn={selectedGRN} onClose={() => setSelectedGRN(null)} />
          )}
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