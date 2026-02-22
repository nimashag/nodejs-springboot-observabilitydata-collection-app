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
  CheckCircle,
  Mail,
  Send,
  Loader
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { apiService } from '../services/api'

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
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })
  
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

  const handleSendTestEmail = async () => {
    setSendingEmail(true)
    setEmailStatus({ type: null, message: '' })
    
    try {
      const result = await apiService.sendEmail({ test_mode: true })
      
      if (result.success) {
        setEmailStatus({ 
          type: 'success', 
          message: 'Test emails sent successfully! Check your inbox.' 
        })
        addNotification({
          type: 'success',
          title: 'Email Sent',
          message: 'Test emails have been sent to nayanaharikusalanajani@gmail.com',
          autoClose: true
        })
      } else {
        throw new Error(result.error || 'Failed to send email')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send email'
      setEmailStatus({ 
        type: 'error', 
        message: errorMessage 
      })
      addNotification({
        type: 'error',
        title: 'Email Send Failed',
        message: errorMessage,
        autoClose: true
      })
    } finally {
      setSendingEmail(false)
      setTimeout(() => {
        setEmailStatus({ type: null, message: '' })
      }, 5000)
    }
  }

  const handleSendCustomEmail = async () => {
    setSendingEmail(true)
    setEmailStatus({ type: null, message: '' })
    
    // Create a sample alert for testing
    const sampleAlert = {
      service_name: 'users-service',
      alert_name: 'Manual Test Alert',
      alert_type: 'error',
      severity: 'high',
      alert_state: 'fired',
      error_count: 25,
      request_count: 100,
      average_response_time: 1500,
      process_cpu_usage: 75.5,
      process_memory_usage: 2000000000,
      timestamp: new Date().toISOString()
    }
    
    try {
      const result = await apiService.sendEmail({ 
        alert_data: sampleAlert,
        test_mode: false 
      })
      
      if (result.success) {
        setEmailStatus({ 
          type: 'success', 
          message: 'Email sent successfully! Check your inbox.' 
        })
        addNotification({
          type: 'success',
          title: 'Email Sent',
          message: 'Alert email has been sent to nayanaharikusalanajani@gmail.com',
          autoClose: true
        })
      } else {
        throw new Error(result.error || 'Failed to send email')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to send email'
      setEmailStatus({ 
        type: 'error', 
        message: errorMessage 
      })
      addNotification({
        type: 'error',
        title: 'Email Send Failed',
        message: errorMessage,
        autoClose: true
      })
    } finally {
      setSendingEmail(false)
      setTimeout(() => {
        setEmailStatus({ type: null, message: '' })
      }, 5000)
    }
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
      
      {/* Data Refresh Settings
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
      </div> */}
      
      {/* Email Notification Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Notifications
        </h2>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Email Configuration</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {/* Recipient: <strong className="text-gray-900 dark:text-gray-100">nayanaharikusalanajani@gmail.com</strong> */}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Emails are automatically sent when alerts are detected. You can also manually send test emails to verify the system is working.
            </p>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-start gap-2 mb-4">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="text-sm text-green-800 dark:text-green-200">
                <p className="font-medium">Email System Active</p>
                <p>Automatic email notifications are enabled and working</p>
              </div>
            </div>
          </div>

          {emailStatus.type && (
            <div className={`p-4 rounded-lg border ${
              emailStatus.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {emailStatus.type === 'success' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div className={`text-sm ${
                  emailStatus.type === 'success'
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  <p className="font-medium">{emailStatus.type === 'success' ? 'Success' : 'Error'}</p>
                  <p>{emailStatus.message}</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleSendTestEmail}
              disabled={sendingEmail}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed"
            >
              {sendingEmail ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Send Test Emails
                </>
              )}
            </button>
            
            <button
              onClick={handleSendCustomEmail}
              disabled={sendingEmail}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed"
            >
              {sendingEmail ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Send Sample Alert Email
                </>
              )}
            </button>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium">Manual Email Sending</p>
                <p>Use these buttons to manually test the email system. Test emails will send sample alerts for all priority levels (P0-P3).</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Data Export Settings
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
      </div> */}
      
      {/* API Configuration
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
      </div> */}
      
      {/* Save Button
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
      </div> */}
      
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
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">v1.1.1</p>
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

