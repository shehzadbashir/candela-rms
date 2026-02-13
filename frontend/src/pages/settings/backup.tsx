import { useState } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/Layout';
import { backupAPI } from '../../services/api';
import DataTable from '@/components/Common/DataTable';
import { HiDownload, HiUpload, HiTrash, HiRefresh } from 'react-icons/hi';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

export default function BackupPage() {
  const { t } = useTranslation('common');
  const { user } = useAuth();
  const [schedule, setSchedule] = useState({
    enabled: false,
    frequency: 'daily',
    time: '02:00'
  });

  const { data: backups, isLoading, refetch } = useQuery(
    'backups',
    backupAPI.getBackups
  );

  const createBackupMutation = useMutation(backupAPI.createBackup, {
    onSuccess: () => {
      toast.success(t('backup.createSuccess'));
      refetch();
    },
    onError: () => {
      toast.error(t('backup.createError'));
    }
  });

  const restoreBackupMutation = useMutation(
    (id: string) => backupAPI.restoreBackup(id),
    {
      onSuccess: () => {
        toast.success(t('backup.restoreSuccess'));
      },
      onError: () => {
        toast.error(t('backup.restoreError'));
      }
    }
  );

  const deleteBackupMutation = useMutation(
    (id: string) => backupAPI.deleteBackup(id),
    {
      onSuccess: () => {
        toast.success(t('backup.deleteSuccess'));
        refetch();
      },
      onError: () => {
        toast.error(t('backup.deleteError'));
      }
    }
  );

  const scheduleBackupMutation = useMutation(backupAPI.scheduleBackup, {
    onSuccess: () => {
      toast.success(t('backup.scheduleSuccess'));
    }
  });

  const columns = [
    {
      key: 'fileName',
      title: t('backup.fileName'),
      render: (row: any) => (
        <span className="font-medium text-primary-600 dark:text-primary-400">
          {row.fileName}
        </span>
      )
    },
    {
      key: 'fileSize',
      title: t('backup.fileSize')
    },
    {
      key: 'backupType',
      title: t('backup.type'),
      render: (row: any) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          row.backupType === 'MANUAL' 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-green-100 text-green-800'
        }`}>
          {row.backupType}
        </span>
      )
    },
    {
      key: 'createdAt',
      title: t('backup.createdAt'),
      render: (row: any) => format(new Date(row.createdAt), 'dd/MM/yyyy HH:mm:ss')
    },
    {
      key: 'createdBy',
      title: t('backup.createdBy'),
      render: (row: any) => row.createdBy?.name
    },
    {
      key: 'status',
      title: t('backup.status'),
      render: (row: any) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          row.status === 'COMPLETED' 
            ? 'bg-green-100 text-green-800' 
            : row.status === 'FAILED'
            ? 'bg-red-100 text-red-800'
            : 'bg-yellow-100 text-yellow-800'
        }`}>
          {row.status}
        </span>
      )
    },
    {
      key: 'restoredAt',
      title: t('backup.restoredAt'),
      render: (row: any) => row.restoredAt 
        ? format(new Date(row.restoredAt), 'dd/MM/yyyy HH:mm:ss')
        : '-'
    },
    {
      key: 'actions',
      title: t('common.actions'),
      render: (row: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleDownload(row.id)}
            className="p-1 text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            <HiDownload className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleRestore(row.id)}
            className="p-1 text-green-600 hover:text-green-800 dark:text-green-400"
          >
            <HiUpload className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1 text-red-600 hover:text-red-800 dark:text-red-400"
          >
            <HiTrash className="h-5 w-5" />
          </button>
        </div>
      )
    }
  ];

  const handleCreateBackup = () => {
    const notes = prompt(t('backup.enterNotes'));
    createBackupMutation.mutate({ notes, type: 'MANUAL' });
  };

  const handleDownload = async (id: string) => {
    try {
      await backupAPI.downloadBackup(id);
      toast.success(t('backup.downloadSuccess'));
    } catch (error) {
      toast.error(t('backup.downloadError'));
    }
  };

  const handleRestore = (id: string) => {
    if (window.confirm(t('backup.confirmRestore'))) {
      restoreBackupMutation.mutate(id);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('backup.confirmDelete'))) {
      deleteBackupMutation.mutate(id);
    }
  };

  const handleScheduleSave = () => {
    scheduleBackupMutation.mutate(schedule);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('backup.title')}
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={() => refetch()}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <HiRefresh className="h-5 w-5 mr-2" />
              {t('common.refresh')}
            </button>
            <button
              onClick={handleCreateBackup}
              disabled={createBackupMutation.isLoading}
              className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              <HiDownload className="h-5 w-5 mr-2" />
              {t('backup.createBackup')}
            </button>
          </div>
        </div>

        {/* Backup Schedule */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {t('backup.schedule')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('backup.enableSchedule')}
              </label>
              <select
                value={schedule.enabled ? 'yes' : 'no'}
                onChange={(e) => setSchedule({ ...schedule, enabled: e.target.value === 'yes' })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="no">{t('common.no')}</option>
                <option value="yes">{t('common.yes')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('backup.frequency')}
              </label>
              <select
                value={schedule.frequency}
                onChange={(e) => setSchedule({ ...schedule, frequency: e.target.value })}
                disabled={!schedule.enabled}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
              >
                <option value="hourly">{t('backup.hourly')}</option>
                <option value="daily">{t('backup.daily')}</option>
                <option value="weekly">{t('backup.weekly')}</option>
                <option value="monthly">{t('backup.monthly')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('backup.time')}
              </label>
              <input
                type="time"
                value={schedule.time}
                onChange={(e) => setSchedule({ ...schedule, time: e.target.value })}
                disabled={!schedule.enabled}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleScheduleSave}
              disabled={!schedule.enabled}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {t('backup.saveSchedule')}
            </button>
          </div>
        </div>

        {/* Backup List */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {t('backup.backupList')}
          </h2>
          <DataTable
            columns={columns}
            data={backups?.data || []}
            loading={isLoading}
          />
        </div>

        {/* Database Info */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {t('backup.databaseInfo')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('backup.totalBackups')}
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {backups?.data?.length || 0}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('backup.latestBackup')}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {backups?.data?.[0] ? format(new Date(backups.data[0].createdAt), 'dd/MM/yyyy HH:mm') : '-'}
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('backup.totalSize')}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {backups?.data?.reduce((total: number, b: any) => {
  const size = parseFloat(b.fileSize);
  return total + (isNaN(size) ? 0 : size);
}, 0).toFixed(2)} MB
              </div>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {t('backup.lastRestore')}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
               {backups?.data?.find((b: any) => b.restoredAt) 
  ? format(new Date(backups.data.find((b: any) => b.restoredAt).restoredAt), 'dd/MM/yyyy HH:mm')
  : '-'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-300 mb-2">
            {t('backup.recommendations')}
          </h3>
          <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
            <li>{t('backup.recommendation1')}</li>
            <li>{t('backup.recommendation2')}</li>
            <li>{t('backup.recommendation3')}</li>
            <li>{t('backup.recommendation4')}</li>
          </ul>
        </div>
      </div>
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