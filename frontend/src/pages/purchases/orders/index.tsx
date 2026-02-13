import { useTranslation } from 'next-i18next'; 
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'; 
import Layout from '@/components/Layout'; 
 
export default function Page() { 
  const { t } = useTranslation('common'); 
  return ( 
    <Layout> 
      <div className="p-6"> 
        <h1 className="text-2xl font-bold">{t('page.title')}</h1> 
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-4"> 
          <p>Page content coming soon</p> 
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
