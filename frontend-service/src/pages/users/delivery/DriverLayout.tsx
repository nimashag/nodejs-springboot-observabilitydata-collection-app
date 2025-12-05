import { useState, useEffect, ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  UserCircle,
  LogOut,
  Menu,
  X,
  Truck,
} from "lucide-react";

interface DriverLayoutProps {
  children: ReactNode;
}

const DriverLayout = ({ children }: DriverLayoutProps) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState({ name: "Driver", lastName: "User" });

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleResize = () => {
      const nowMobile = window.innerWidth < 768;
      setIsMobile(nowMobile);
      setIsSidebarOpen(!nowMobile);
    };

    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error("Failed to parse user from localStorage", error);
      }
    }

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login/delivery");
  };

  const navigation = [
    { name: "Dashboard", href: "/driver/dashboard", icon: LayoutDashboard },
    { name: "Profile", href: "/driver/profile", icon: UserCircle },
    { name: "My Deliveries", href: "/driver/mydeliveries", icon: Truck },
   
  ];

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 text-neutral-800 dark:text-neutral-100">
      {/* Mobile Header */}
      <div className="fixed top-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        <button onClick={handleLogout} title="Logout">
          <LogOut size={20} />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700 transform transition-transform duration-300 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b">
            <Link to="/driver/dashboard" className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
              {user?.name}
            </Link>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-4 rounded-md text-md font-medium transition-colors ${
                  location.pathname === item.href
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-600 dark:text-white"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-neutral-700"
                }`}
              >
                <item.icon className="mr-3 h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">{user?.name}</div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400">Driver</div>
              </div>
              <button onClick={handleLogout} title="Logout" className="text-neutral-400 hover:text-neutral-600">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 pt-16 md:pt-16 ${
          isSidebarOpen ? "md:ml-64" : "md:ml-0"
        } p-4`}
      >
        {children}
      </main>
    </div>
  );
};

export default DriverLayout;
