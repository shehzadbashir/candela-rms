import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { 
  HiHome, 
  HiShoppingCart, 
  HiCube, 
  HiUsers, 
  HiChartBar,
  HiCog,
  HiLogout,
  HiClipboardList,
  HiTruck,
  HiDocumentReport
} from 'react-icons/hi';
import { useAuth } from '@/hooks/useAuth';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export default function Sidebar({ open, setOpen }: SidebarProps) {
  const router = useRouter();
  const { t } = useTranslation('common');
  const { user, logout } = useAuth();

  const menuItems = [
    {
      title: t('menu.dashboard'),
      icon: HiHome,
      path: '/',
      roles: ['ADMIN', 'MANAGER', 'CASHIER']
    },
    {
      title: t('menu.pos'),
      icon: HiShoppingCart,
      path: '/pos',
      roles: ['ADMIN', 'MANAGER', 'CASHIER']
    },
    {
      title: t('menu.products'),
      icon: HiCube,
      path: '/inventory/products',
      roles: ['ADMIN', 'MANAGER', 'WAREHOUSE']
    },
    {
      title: t('menu.grn'),
      icon: HiClipboardList,
      path: '/inventory/grn',
      roles: ['ADMIN', 'MANAGER', 'WAREHOUSE']
    },
    {
      title: t('menu.purchaseOrders'),
      icon: HiTruck,
      path: '/purchases/orders',
      roles: ['ADMIN', 'MANAGER']
    },
    {
      title: t('menu.customers'),
      icon: HiUsers,
      path: '/customers',
      roles: ['ADMIN', 'MANAGER', 'CASHIER']
    },
    {
      title: t('menu.reports'),
      icon: HiDocumentReport,
      path: '/reports',
      roles: ['ADMIN', 'MANAGER']
    },
    {
      title: t('menu.settings'),
      icon: HiCog,
      path: '/settings',
      roles: ['ADMIN']
    }
  ];

  const filteredMenu = menuItems.filter(item => 
    item.roles.includes(user?.role || '')
  );

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-800 shadow-lg transition-all duration-300 z-30 ${
        open ? 'w-64' : 'w-20'
      }`}
    >
      <div className="flex items-center justify-center h-16 border-b border-gray-200 dark:border-gray-700">
        <h1 className={`font-bold text-xl text-primary-600 ${!open && 'hidden'}`}>
          Candela RMS
        </h1>
        {!open && <span className="text-xl font-bold text-primary-600">C</span>}
      </div>

      <nav className="p-4 space-y-2">
        {filteredMenu.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`flex items-center p-3 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 ${
              router.pathname === item.path
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            <item.icon className="h-5 w-5 min-w-[20px]" />
            {open && <span className="ml-3">{item.title}</span>}
          </Link>
        ))}

        <button
          onClick={handleLogout}
          className="w-full flex items-center p-3 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 mt-auto"
        >
          <HiLogout className="h-5 w-5 min-w-[20px]" />
          {open && <span className="ml-3">{t('menu.logout')}</span>}
        </button>
      </nav>
    </aside>
  );
}