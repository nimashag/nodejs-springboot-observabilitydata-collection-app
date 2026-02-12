import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { apiService, AlertSummary } from '../services/api'

interface AppContextType {
  // Theme
  darkMode: boolean
  toggleDarkMode: () => void
  
  // Global data
  alertSummary: AlertSummary | null
  isLoading: boolean
  error: string | null
  
  // Refresh
  refreshData: () => Promise<void>
  lastRefresh: Date | null
  autoRefresh: boolean
  setAutoRefresh: (value: boolean) => void
  refreshInterval: number
  setRefreshInterval: (seconds: number) => void
  
  // Notifications
  notifications: Notification[]
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  // Filters (global)
  globalFilters: GlobalFilters
  setGlobalFilters: (filters: Partial<GlobalFilters>) => void
  resetGlobalFilters: () => void
}

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  timestamp: Date
  autoClose?: boolean
}

export interface GlobalFilters {
  services: string[]
  severity: string[]
  dateRange: { start: Date | null; end: Date | null }
  searchQuery: string
}

const defaultFilters: GlobalFilters = {
  services: [],
  severity: [],
  dateRange: { start: null, end: null },
  searchQuery: ''
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  // Theme state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode')
    return saved === 'true'
  })
  
  // Global data state
  const [alertSummary, setAlertSummary] = useState<AlertSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  
  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(() => {
    const saved = localStorage.getItem('autoRefresh')
    return saved === 'true'
  })
  const [refreshInterval, setRefreshInterval] = useState(() => {
    const saved = localStorage.getItem('refreshInterval')
    return saved ? parseInt(saved, 10) : 30
  })
  
  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([])
  
  // Global filters state
  const [globalFilters, setGlobalFiltersState] = useState<GlobalFilters>(defaultFilters)
  
  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const newValue = !prev
      localStorage.setItem('darkMode', String(newValue))
      return newValue
    })
  }
  
  // Refresh data
  const refreshData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await apiService.getAlertSummary()
      setAlertSummary(data)
      setLastRefresh(new Date())
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data'
      setError(errorMessage)
      addNotification({
        type: 'error',
        title: 'Data Refresh Failed',
        message: errorMessage,
        autoClose: true
      })
    } finally {
      setIsLoading(false)
    }
  }
  
  // Add notification
  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date()
    }
    setNotifications(prev => [newNotification, ...prev].slice(0, 10)) // Keep max 10 notifications
    
    // Auto-remove after 5 seconds if autoClose is true
    if (notification.autoClose !== false) {
      setTimeout(() => {
        removeNotification(newNotification.id)
      }, 5000)
    }
  }
  
  // Remove notification
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }
  
  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([])
  }
  
  // Set global filters
  const setGlobalFilters = (filters: Partial<GlobalFilters>) => {
    setGlobalFiltersState(prev => ({ ...prev, ...filters }))
  }
  
  // Reset global filters
  const resetGlobalFilters = () => {
    setGlobalFiltersState(defaultFilters)
  }
  
  // Initial data fetch
  useEffect(() => {
    refreshData()
  }, [])
  
  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const intervalId = setInterval(() => {
        refreshData()
      }, refreshInterval * 1000)
      
      return () => clearInterval(intervalId)
    }
  }, [autoRefresh, refreshInterval])
  
  // Save auto-refresh settings
  useEffect(() => {
    localStorage.setItem('autoRefresh', String(autoRefresh))
  }, [autoRefresh])
  
  useEffect(() => {
    localStorage.setItem('refreshInterval', String(refreshInterval))
  }, [refreshInterval])
  
  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])
  
  const value: AppContextType = {
    darkMode,
    toggleDarkMode,
    alertSummary,
    isLoading,
    error,
    refreshData,
    lastRefresh,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
    notifications,
    addNotification,
    removeNotification,
    clearNotifications,
    globalFilters,
    setGlobalFilters,
    resetGlobalFilters
  }
  
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider')
  }
  return context
}

