import { X, Clock, Server, AlertTriangle, Activity, Tag, Calendar, TrendingUp } from 'lucide-react'

interface AlertDetailModalProps {
  alert: any
  onClose: () => void
}

export function AlertDetailModal({ alert, onClose }: AlertDetailModalProps) {
  if (!alert) return null
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleString()
    } catch {
      return dateString
    }
  }
  
  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }
  
  const getStateColor = (state: string) => {
    switch (state?.toLowerCase()) {
      case 'fired':
      case 'active':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'acknowledged':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }
  
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70 flex items-center justify-center p-4 z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Alert Details
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Comprehensive alert information and context
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-800/50 rounded-lg p-5 border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Alert Name</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {alert.alert_name || alert.alertname || 'Unknown Alert'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Alert Type</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {alert.alert_type || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Severity</p>
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getSeverityColor(alert.severity)}`}>
                  {alert.severity || 'unknown'}
                </span>
              </div>
              {alert.state && alert.state !== 'unknown' && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">State</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getStateColor(alert.state)}`}>
                    {alert.state}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Service & Instance Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 border border-blue-200 dark:border-blue-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                Service Details
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Service Name</p>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {alert.service_name || alert.job || 'N/A'}
                  </p>
                </div>
                {alert.instance && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Instance</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
                      {alert.instance}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            {(alert.started_at || alert.startsAt || alert.ended_at || alert.endsAt || alert.duration || alert.timestamp) && (
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-5 border border-purple-200 dark:border-purple-800">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  Timeline
                </h3>
                <div className="space-y-3">
                  {(alert.started_at || alert.startsAt || alert.timestamp) && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {alert.started_at || alert.startsAt ? 'Started At' : 'Timestamp'}
                      </p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatDate(alert.started_at || alert.startsAt || alert.timestamp)}
                      </p>
                    </div>
                  )}
                  {(alert.ended_at || alert.endsAt) && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Ended At</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {formatDate(alert.ended_at || alert.endsAt)}
                      </p>
                    </div>
                  )}
                  {alert.duration && (
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Duration</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {alert.duration}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Description */}
          {(alert.description || alert.message || alert.summary) && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-5 border border-yellow-200 dark:border-yellow-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                Description
              </h3>
              <p className="text-gray-900 dark:text-gray-100 leading-relaxed">
                {alert.description || alert.message || alert.summary}
              </p>
            </div>
          )}
          
          {/* Metrics & Values */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-5 border border-green-200 dark:border-green-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              Metrics & Values
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {alert.error_count !== undefined && (
                <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Error Count</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {alert.error_count}
                  </p>
                </div>
              )}
              {alert.response_time !== undefined && (
                <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Response Time</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {alert.response_time}ms
                  </p>
                </div>
              )}
              {alert.cpu_usage !== undefined && (
                <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">CPU Usage</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {alert.cpu_usage}%
                  </p>
                </div>
              )}
              {alert.memory_usage !== undefined && (
                <div className="bg-white dark:bg-gray-700/50 rounded-lg p-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Memory Usage</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {alert.memory_usage}%
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Labels/Tags */}
          {alert.labels && Object.keys(alert.labels).length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-5 border border-gray-200 dark:border-gray-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Tag className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Labels & Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(alert.labels).map(([key, value]) => (
                  <div 
                    key={key}
                    className="px-3 py-1 bg-white dark:bg-gray-600 rounded-full border border-gray-300 dark:border-gray-500"
                  >
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{key}:</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 ml-1">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Raw Data (Expandable) */}
          <details className="bg-gray-800 dark:bg-gray-900 rounded-lg border border-gray-700">
            <summary className="p-4 cursor-pointer hover:bg-gray-700 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-100 font-semibold">
              Raw Alert Data (JSON)
            </summary>
            <pre className="p-4 text-xs text-gray-300 overflow-x-auto">
              {JSON.stringify(alert, null, 2)}
            </pre>
          </details>
        </div>
        
        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-semibold transition-colors"
          >
            Close
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(alert, null, 2))
              alert('Alert data copied to clipboard!')
            }}
            className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
          >
            Copy JSON
          </button>
        </div>
      </div>
    </div>
  )
}

