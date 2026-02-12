import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  AlertTriangle, 
  Settings as SettingsIcon, 
  Brain,
  Activity,
  History,
  Sparkles,
  GitMerge,
  TrendingUp,
  Zap,
  Server,
  Sliders,
  Moon,
  Sun,
  RefreshCw,
  Bell
} from 'lucide-react'
import { useApp } from '../context/AppContext'

interface LayoutProps {
  children: ReactNode
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const { darkMode, toggleDarkMode, autoRefresh, lastRefresh, refreshData, notifications } = useApp()

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/alert-data', icon: AlertTriangle, label: 'Alert Data' },
    { path: '/historical-analysis', icon: History, label: 'Historical Analysis' },
    { path: '/threshold-config', icon: Sliders, label: 'Threshold Config' },
    { path: '/ml-analytics', icon: Brain, label: 'ML Analytics' },
    { path: '/correlations', icon: GitMerge, label: 'Correlations'},
    { path: '/settings', icon: SettingsIcon, label: 'Settings' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar-bg dark:bg-gray-800 text-white flex flex-col shadow-xl border-r border-gray-700 dark:border-gray-700">
        {/* Logo/Header */}
        <div className="p-6 border-b border-gray-700 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary-400" />
            <div>
              <h1 className="text-xl font-bold">Adaptive Alert</h1>
              <p className="text-xs text-gray-400">Dashboard v1.0</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive(item.path)
                    ? 'bg-sidebar-active dark:bg-primary-600 text-white shadow-lg'
                    : 'text-gray-300 hover:bg-sidebar-hover dark:hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-700 dark:border-gray-700">
          <div className="text-xs text-gray-400">
            <p className="font-semibold text-gray-300 mb-1">Administrator Panel</p>
            <p className="mt-2">AATA System v1.0</p>
            {lastRefresh && (
              <p className="mt-2 text-gray-500">
                Last refresh: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {navItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
            </h2>
            {autoRefresh && (
              <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Auto-refresh active
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {/* Notifications Badge */}
            <button className="relative p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Bell className="w-5 h-5" />
              {notifications.length > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            
            {/* Manual Refresh */}
            <button 
              onClick={refreshData}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            
            {/* Dark Mode Toggle */}
            <button 
              onClick={toggleDarkMode}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            {/* Settings Link */}
            <Link 
              to="/settings"
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Settings"
            >
              <SettingsIcon className="w-5 h-5" />
            </Link>
          </div>
        </header>
        
        {/* Page Content */}
        <div className="flex-1 p-8 bg-gray-50 dark:bg-gray-900">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout

