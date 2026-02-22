import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  FileText,
  AlertTriangle,
  TrendingUp,
  Menu,
  X,
  Moon,
  Sun,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { useApp } from '../context/AppContext'

interface LayoutProps {
  children: ReactNode
}

interface NavItem {
  path: string
  label: string
  icon: typeof Activity
  subItems?: { path: string; label: string }[]
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const { darkMode, toggleDarkMode, sidebarOpen, setSidebarOpen } = useApp()
  const [expandedItems, setExpandedItems] = useState<string[]>(['metrics', 'logs', 'alerts', 'anomalies'])

  const navItems: NavItem[] = [
    {
      path: '/',
      label: 'Dashboard',
      icon: Activity
    },
    {
      path: '/metrics',
      label: 'Metrics',
      icon: BarChart3,
      subItems: [
        { path: '/metrics/subpart1', label: 'Subpart 1' },
        { path: '/metrics/subpart2', label: 'Subpart 2' },
        { path: '/metrics/subpart3', label: 'Subpart 3' }
      ]
    },
    {
      path: '/logs',
      label: 'Logs',
      icon: FileText,
      subItems: [
        { path: '/logs/dashboard', label: 'Dashboard' },
        { path: '/logs/subpart1', label: 'Logs Viewer' },
        { path: '/logs/subpart2', label: 'Templates' },
        { path: '/logs/subpart3', label: 'Analytics' }
      ]
    },
    {
      path: '/alerts',
      label: 'Alerts',
      icon: AlertTriangle,
      subItems: [
        { path: '/alerts/subpart1', label: 'Subpart 1' },
        { path: '/alerts/subpart2', label: 'Subpart 2' },
        { path: '/alerts/subpart3', label: 'Subpart 3' }
      ]
    },
    {
      path: '/anomalies',
      label: 'Anomalies',
      icon: TrendingUp,
      subItems: [
        { path: '/anomalies/subpart1', label: 'Subpart 1' },
        { path: '/anomalies/subpart2', label: 'Subpart 2' },
        { path: '/anomalies/subpart3', label: 'Subpart 3' }
      ]
    }
  ]

  const toggleExpanded = (path: string) => {
    setExpandedItems(prev =>
      prev.includes(path)
        ? prev.filter(item => item !== path)
        : [...prev, path]
    )
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const isSubItemActive = (subPath: string) => location.pathname === subPath

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 to-slate-800 dark:from-gray-900 dark:to-gray-800 text-white flex flex-col shadow-2xl border-r border-slate-700 dark:border-gray-700 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo/Header */}
        <div className="p-6 border-b border-slate-700 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Observability
                </h1>
                <p className="text-xs text-slate-400">Dashboard v1.0</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-slate-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const itemKey = item.path.replace('/', '') || 'dashboard'
            const isExpanded = expandedItems.includes(itemKey)
            const hasActiveSubItem = item.subItems?.some(sub => isSubItemActive(sub.path))

            return (
              <div key={item.path}>
                {item.subItems ? (
                  <>
                    <button
                      onClick={() => toggleExpanded(itemKey)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                        isActive(item.path) || hasActiveSubItem
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-700 pl-4">
                        {item.subItems.map((subItem) => (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={`block px-4 py-2 rounded-lg transition-all duration-200 ${
                              isSubItemActive(subItem.path)
                                ? 'bg-blue-600/20 text-blue-300 border-l-2 border-blue-500'
                                : 'text-slate-400 hover:bg-slate-700/30 hover:text-slate-200'
                            }`}
                          >
                            {subItem.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <Link
                    to={item.path}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive(item.path)
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 dark:border-gray-700">
          <div className="text-xs text-slate-400">
            <p className="font-semibold text-slate-300 mb-1">Observability Platform</p>
            <p className="mt-2">Unified Dashboard v1.0</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {navItems.find(item => isActive(item.path))?.label || 
               navItems.flatMap(item => item.subItems || []).find(sub => isSubItemActive(sub.path))?.label ||
               'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 bg-gray-50 dark:bg-gray-900">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout

