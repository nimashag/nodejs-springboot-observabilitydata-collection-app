import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  FileText,
  Menu,
  X,
  Moon,
  Sun,
  ChevronRight,
  ChevronDown,
  Database
} from 'lucide-react'
import { useApp } from '../../context/AppContext'

interface LayoutProps {
  children: ReactNode
}

interface NavItem {
  path: string
  label: string
  icon: typeof FileText
  subItems?: { path: string; label: string }[]
}

const Layout = ({ children }: LayoutProps) => {
  const location = useLocation()
  const { darkMode, toggleDarkMode, sidebarOpen, setSidebarOpen } = useApp()
  const [expandedItems, setExpandedItems] = useState<string[]>(['logs'])

  const navItems: NavItem[] = [
    {
      path: '/logs',
      label: 'Logs',
      icon: FileText,
      subItems: [
        { path: '/logs/dashboard', label: 'Dashboard' },
        { path: '/logs', label: 'Logs Viewer' },
        { path: '/logs/metadata', label: 'Metadata Analyzer' },
        { path: '/templates', label: 'Templates' },
        { path: '/analytics', label: 'Analytics' }
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
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 text-white flex flex-col shadow-2xl border-r border-cyan-800/30 dark:border-cyan-700/30 transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo/Header */}
        <div className="p-6 border-b border-cyan-800/30 dark:border-cyan-700/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-cyan-500 via-blue-500 to-cyan-600 rounded-lg shadow-lg shadow-cyan-500/20">
                <Database className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                  Logs Dashboard
                </h1>
                <p className="text-xs text-cyan-400/70">Observability v1.0</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 hover:bg-slate-700/50 rounded transition-colors"
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
                          ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                          : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-100'
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
                      <div className="ml-4 mt-1 space-y-1 border-l-2 border-cyan-700/40 pl-4">
                        {item.subItems.map((subItem) => (
                          <Link
                            key={subItem.path}
                            to={subItem.path}
                            className={`block px-4 py-2 rounded-lg transition-all duration-200 ${
                              isSubItemActive(subItem.path)
                                ? 'bg-cyan-600/20 text-cyan-300 border-l-2 border-cyan-400 shadow-sm shadow-cyan-500/10'
                                : 'text-slate-400 hover:bg-slate-700/30 hover:text-cyan-200'
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
                        ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-cyan-100'
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
        <div className="p-4 border-t border-cyan-800/30 dark:border-cyan-700/30">
          <div className="text-xs text-cyan-400/70">
            <p className="font-semibold text-cyan-300/80 mb-1">Log Aggregation</p>
            <p className="mt-2">Observability Platform v1.0</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-cyan-800/20 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm dark:shadow-cyan-900/10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 text-gray-600 dark:text-cyan-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-cyan-100">
              {navItems.find(item => isActive(item.path))?.label || 
               navItems.flatMap(item => item.subItems || []).find(sub => isSubItemActive(sub.path))?.label ||
               'Logs Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 text-gray-600 dark:text-cyan-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Toggle dark mode"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 bg-gray-50 dark:bg-slate-950">
          {children}
        </div>
      </main>
    </div>
  )
}

export default Layout
