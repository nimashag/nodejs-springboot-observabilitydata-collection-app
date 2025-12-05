import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UtensilsCrossed,
  Truck,
  BarChart2,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Search,
  Moon,
  Sun,
} from 'lucide-react';

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('theme');
    return stored === 'dark';
  });

  const [user, setUser] = useState({ firstName: 'Admin', lastName: 'User' });

  const location = useLocation();
  const navigate = useNavigate();

  // Apply theme from localStorage
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Handle screen resizing
  useEffect(() => {
    const handleResize = () => {
      const nowMobile = window.innerWidth < 768;
      setIsMobile(nowMobile);
      setIsSidebarOpen(!nowMobile);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    navigate('/login/admin');
  };

  const navigation = [
    { name: 'Dashboard', href: '/admin-dashboard', icon: LayoutDashboard },
    { name: 'Customers', href: '/admin/customers', icon: Users },
    { name: 'Restaurants', href: '/admin/restaurants', icon: UtensilsCrossed },
    { name: 'Drivers', href: '/admin/drivers', icon: Truck },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart2 },
    // name: 'Approvals', href: '/admin/approvals', icon: Bell },
    //{ name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-900 font-['Inter'] transition-colors duration-300">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-800 border-r border-gray-200 dark:border-neutral-700 transform transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-neutral-700">
            <Link to="/" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              HungerJet Admin
            </Link>
            <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-gray-500 dark:text-gray-300">
              <X size={20} />
            </button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition ${
                  location.pathname === item.href
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-600 dark:text-white'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700'
                }`}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
            <div className="flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
              <div>
                <div className="font-semibold">{user.firstName} {user.lastName}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Admin</div>
              </div>
              <button onClick={handleLogout} title="Logout" className="hover:text-red-600 dark:hover:text-red-400">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-0'} pt-16`}>
        {/* Top Nav */}
        <header className="fixed top-0 left-0 right-0 md:left-64 z-40 h-16 bg-white dark:bg-neutral-800 border-b border-gray-200 dark:border-neutral-700 px-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Menu
              size={20}
              className="cursor-pointer text-gray-600 dark:text-gray-300 md:hidden"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            />
            <div className="relative w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-full bg-white dark:bg-neutral-700 text-sm placeholder-gray-500 dark:placeholder-neutral-400 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsDark(!isDark)}
              title="Toggle Theme"
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-700"
            >
              {isDark ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-gray-600" />}
            </button>
            <Bell size={20} className="text-gray-500 dark:text-gray-300" />
            <button className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              {user.firstName} {user.lastName}
              <ChevronDown size={16} className="ml-1" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="pt-6 px-6">{children}</main>
      </div>

      {/* Overlay for mobile */}
      {isMobile && isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default AdminLayout;
