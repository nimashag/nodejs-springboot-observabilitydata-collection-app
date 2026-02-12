import { useState } from 'react'
import { 
  Settings as SettingsIcon, 
  Moon, 
  Sun, 
  RefreshCw, 
  Bell,
  Download,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useApp } from '../context/AppContext'

const Settings = () => {
  const { 
    darkMode, 
    toggleDarkMode, 
    autoRefresh, 
    setAutoRefresh, 
    refreshInterval, 
    setRefreshInterval,
    addNotification
  } = useApp()
  
  const [localRefreshInterval, setLocalRefreshInterval] = useState(refreshInterval)
  const [saved, setSaved] = useState(false)
  
  const handleSaveSettings = () => {
    setRefreshInterval(localRefreshInterval)
    setSaved(true)
    addNotification({
      type: 'success',
      title: 'Settings Saved',
      message: 'Your preferences have been saved successfully',
      autoClose: true
    })
    setTimeout(() => setSaved(false), 3000)
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary-600" />
          Settings & Configuration
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Customize your dashboard experience and preferences
        </p>
      </div>
      
      {/* Appearance Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          Appearance
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Toggle between light and dark theme
              </p>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                darkMode ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  darkMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
      
      {/* Data Refresh Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Data Refresh
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Auto-Refresh</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically refresh dashboard data
              </p>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                autoRefresh ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  autoRefresh ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Refresh Interval</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  How often to refresh data (in seconds)
                </p>
              </div>
              <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                {localRefreshInterval}s
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="300"
              step="10"
              value={localRefreshInterval}
              onChange={(e) => setLocalRefreshInterval(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary-600"
              disabled={!autoRefresh}
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
              <span>10s</span>
              <span>60s</span>
              <span>120s</span>
              <span>300s</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Browser Notifications</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive notifications for critical alerts
              </p>
            </div>
            <button
              className="relative inline-flex h-8 w-14 items-center rounded-full bg-gray-300 cursor-not-allowed"
              disabled
            >
              <span className="inline-block h-6 w-6 transform rounded-full bg-white translate-x-1" />
            </button>
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">Coming Soon</p>
                <p>Browser notifications will be available in a future update</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Data Export Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          Data Export
        </h2>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Export Format</h3>
              <select className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-gray-100">
                <option>CSV</option>
                <option>JSON</option>
                <option>Excel</option>
              </select>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Date Range</h3>
              <select className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-gray-100">
                <option>Last 24 hours</option>
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>All time</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* API Configuration */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          API Configuration
        </h2>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Backend URL</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={window.location.hostname === 'localhost' ? 'http://localhost:3008' : `${window.location.protocol}//${window.location.hostname}:31000`}
                disabled
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-700 dark:text-gray-300 cursor-not-allowed"
              />
              <button
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed"
                disabled
              >
                Update
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Auto-detected based on environment
            </p>
          </div>
          
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-800 dark:text-green-200">
                API Connection Active
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg"
        >
          {saved ? (
            <>
              <CheckCircle className="w-5 h-5" />
              Saved!
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Save Settings
            </>
          )}
        </button>
      </div>
      
      {/* System Information */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          System Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3 bg-white dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Dashboard Version</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">v1.0.0</p>
          </div>
          <div className="p-3 bg-white dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">AATA System</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">v1.0.0</p>
          </div>
          <div className="p-3 bg-white dark:bg-gray-700/50 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400">Last Build</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings

