import { ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { useTranslation } from 'next-i18next';
import Sidebar from './Sidebar';
import Header from './Header';
import { useState } from 'react';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation('common');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <Header 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          theme={theme}
          setTheme={setTheme}
          i18n={i18n}
        />
        
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}