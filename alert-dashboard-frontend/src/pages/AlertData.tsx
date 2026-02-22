import { useState, useEffect } from 'react'
import { 
  AlertTriangle, 
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw
} from 'lucide-react'
import { apiService } from '../services/api'
import { AlertDetailModal } from '../components/AlertDetailModal'
import { exportToCSV, exportToJSON } from '../utils/exportUtils'
import { useApp } from '../context/AppContext'

interface Alert {
  timestamp: string
  service_name: string
  alert_name?: string
  alert_type: 'error' | 'latency' | 'availability' | 'resource' | 'traffic' | string
  severity: 'low' | 'medium' | 'high' | 'critical' | string
  alert_state: 'fired' | 'resolved' | string
  error_count?: number
  request_count?: number
  average_response_time?: number
  response_time?: number
  process_cpu_usage?: number
  process_memory_usage?: number
  event_loop_lag?: number
  traffic_rate?: number
  normalized_timestamp?: number
  service_type?: 'nodejs' | 'java' | string
  [key: string]: any
}

const AlertData = () => {
  const { addNotification } = useApp()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterService, setFilterService] = useState('all')
  const [filterType, setFilterType] = useState('all')
  const [filterSeverity, setFilterSeverity] = useState('all')
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null)

  useEffect(() => {
    loadAlerts()
  }, [page])

  const loadAlerts = async () => {
    try {
      setLoading(true)
      const response = await apiService.getAlerts(page, 1000)
      console.log('Alerts API response:', response)
      
      // Handle different response formats
      const alertsArray = response.data || response.alerts || (Array.isArray(response) ? response : [])
      
      // Log unique alert types for debugging
      const uniqueTypes = Array.from(new Set(alertsArray.map((a: Alert) => a.alert_type)))
      console.log('Unique alert types in data:', uniqueTypes)
      
      // Sort by timestamp in descending order (most recent first)
      // Use normalized_timestamp if available (more reliable), otherwise parse timestamp string
      const sortedAlerts = [...alertsArray].sort((a: Alert, b: Alert) => {
        // Try normalized_timestamp first (Unix timestamp in milliseconds)
        const timeA = (a as any).normalized_timestamp 
          ? (a as any).normalized_timestamp 
          : new Date(a.timestamp).getTime()
        const timeB = (b as any).normalized_timestamp 
          ? (b as any).normalized_timestamp 
          : new Date(b.timestamp).getTime()
        
        // Descending order: newest first (larger timestamp first)
        return timeB - timeA
      })
      
      setAlerts(sortedAlerts)
      setError(null)
    } catch (err) {
      setError('Failed to load alert data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // All supported alert types in the system
  const allSupportedTypes = ['error', 'latency', 'availability', 'resource', 'traffic']
  
  // Get unique values for filters with safe array check
  const services = alerts && Array.isArray(alerts) 
    ? ['all', ...Array.from(new Set(alerts.map(a => a.service_name)))]
    : ['all']
  
  // Combine types from data with all supported types to ensure all options are available
  // Normalize all types to lowercase for consistency
  const dataTypes = alerts && Array.isArray(alerts)
    ? Array.from(new Set(alerts.map(a => a.alert_type ? a.alert_type.toLowerCase() : '').filter(Boolean)))
    : []
  const types = ['all', ...Array.from(new Set([...allSupportedTypes, ...dataTypes]))]
  
  // Count alerts by type for display
  const typeCount = (type: string): number => {
    if (type === 'all') return alerts.length
    return alerts.filter(a => a.alert_type && a.alert_type.toLowerCase() === type.toLowerCase()).length
  }
  
  const severities = alerts && Array.isArray(alerts)
    ? ['all', ...Array.from(new Set(alerts.map(a => a.severity)))]
    : ['all']

  // Filter alerts with safe array check
  const filteredAlerts = (alerts && Array.isArray(alerts) ? alerts : [])
    .filter(alert => {
      const matchesSearch = searchTerm === '' || 
        Object.values(alert).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      const matchesService = filterService === 'all' || alert.service_name === filterService
      // Case-insensitive type matching
      const matchesType = filterType === 'all' || 
        (alert.alert_type && alert.alert_type.toLowerCase() === filterType.toLowerCase())
      const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity

      return matchesSearch && matchesService && matchesType && matchesSeverity
    })
    // Sort filtered results by timestamp in descending order (most recent first)
    .sort((a: Alert, b: Alert) => {
      // Try normalized_timestamp first (Unix timestamp in milliseconds)
      const timeA = (a as any).normalized_timestamp 
        ? (a as any).normalized_timestamp 
        : new Date(a.timestamp).getTime()
      const timeB = (b as any).normalized_timestamp 
        ? (b as any).normalized_timestamp 
        : new Date(b.timestamp).getTime()
      
      // Descending order: newest first (larger timestamp first)
      return timeB - timeA
    })

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStateColor = (state: string) => {
    return state === 'resolved' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
  }

  const handleExportCSV = () => {
    try {
      const exportData = filteredAlerts.map(alert => ({
        timestamp: alert.timestamp,
        service: alert.service_name,
        alert_name: alert.alert_name || 'N/A',
        type: alert.alert_type,
        severity: alert.severity,
        state: alert.alert_state,
        error_count: alert.error_count || 0,
        request_count: alert.request_count || 0,
        average_response_time: alert.average_response_time || alert.response_time || 0,
        cpu_usage: alert.process_cpu_usage || 0,
        memory_usage: alert.process_memory_usage || 0,
        service_type: alert.service_type || 'N/A'
      }))
      exportToCSV(exportData, `alert-data-${new Date().toISOString()}.csv`)
      addNotification({
        type: 'success',
        title: 'Export Successful',
        message: `Exported ${exportData.length} alerts to CSV`,
        autoClose: true
      })
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export data to CSV',
        autoClose: true
      })
    }
  }
  
  const handleExportJSON = () => {
    try {
      exportToJSON(filteredAlerts, `alert-data-${new Date().toISOString()}.json`)
      addNotification({
        type: 'success',
        title: 'Export Successful',
        message: `Exported ${filteredAlerts.length} alerts to JSON`,
        autoClose: true
      })
    } catch (err) {
      addNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export data to JSON',
        autoClose: true
      })
    }
  }

  if (loading && alerts.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetailModal 
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Alert Data</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive alert history and analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAlerts}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </button>
          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
          >
            <Download className="w-5 h-5" />
            Export JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search alerts..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          {/* Service Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Service
            </label>
            <select
              value={filterService}
              onChange={(e) => setFilterService(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {services.map(service => (
                <option key={service} value={service}>
                  {service === 'all' ? 'All Services' : service}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Alert Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {types.map(type => (
                <option key={type} value={type}>
                  {type === 'all' ? 'All Types' : type}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Severity
            </label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              {severities.map(severity => (
                <option key={severity} value={severity}>
                  {severity === 'all' ? 'All Severities' : severity}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {filteredAlerts.length} of {alerts.length} alerts
        </div>
      </div>

      {/* Alert Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  State
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Errors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Requests
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
                    <p className="text-lg font-medium">No alerts found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {new Date(alert.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {alert.service_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {alert.alert_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStateColor(alert.alert_state)}`}>
                        {alert.alert_state}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {alert.error_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {alert.request_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="flex items-center gap-1 px-3 py-1 bg-primary-100 dark:bg-primary-900/30 hover:bg-primary-200 dark:hover:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-md transition-colors"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-600">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Page {page} • Showing {filteredAlerts.length} alerts
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-gray-900 dark:text-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={filteredAlerts.length < 100}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-gray-900 dark:text-gray-100 transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}
    </div>
  )
}

export default AlertData

