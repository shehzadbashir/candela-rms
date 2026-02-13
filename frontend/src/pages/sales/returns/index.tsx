import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Layout from '@/components/Layout';

export default function SalesReturnsPage() {
  const { t } = useTranslation('common');

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {t('sales.returns')}
        </h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <p className="text-gray-600 dark:text-gray-400">
            Sales returns content will be here
          </p>
        </div>
      </div>
    </Layout>
  );
}

// ✅ FIXED: Added type for the 'locale' parameter
export async function getStaticProps({ locale }: { locale: string }) {
  return {
    props: {
      // ✅ FIXED: 'locale' is now correctly passed
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}
