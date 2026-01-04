import { useState, useEffect } from 'react'
import { 
  Settings, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw,
  Clock,
  Activity,
  Zap
} from 'lucide-react'
import { apiService, ThresholdRecommendation, AdaptiveConfig } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ThresholdInfo {
  name: string
  key: string
  description: string
  defaultValue: string
  category: 'error' | 'latency' | 'availability'
  icon: any
  color: string
}

const THRESHOLD_INFO: ThresholdInfo[] = [
  {
    name: 'Error Burst Threshold',
    key: 'error_burst_threshold',
    description: 'Number of errors in a time window that triggers an alert',
    defaultValue: '5 errors',
    category: 'error',
    icon: AlertCircle,
    color: 'text-red-600'
  },
  {
    name: 'Error Burst Window',
    key: 'error_burst_window',
    description: 'Time window for counting error bursts',
    defaultValue: '1 minute',
    category: 'error',
    icon: Clock,
    color: 'text-red-600'
  },
  {
    name: 'High Latency Threshold',
    key: 'high_latency_threshold',
    description: 'Maximum acceptable response time before alerting',
    defaultValue: '3 seconds',
    category: 'latency',
    icon: Clock,
    color: 'text-yellow-600'
  },
  {
    name: 'High Latency Count',
    key: 'high_latency_count',
    description: 'Number of consecutive slow requests to trigger alert',
    defaultValue: '3 requests',
    category: 'latency',
    icon: Zap,
    color: 'text-yellow-600'
  },
  {
    name: 'Availability Error Rate',
    key: 'availability_error_rate',
    description: 'Acceptable error rate percentage for availability monitoring',
    defaultValue: '50%',
    category: 'availability',
    icon: Activity,
    color: 'text-green-600'
  },
  {
    name: 'Metrics Window',
    key: 'metrics_window',
    description: 'Time window for calculating availability metrics',
    defaultValue: '5 minutes',
    category: 'availability',
    icon: Clock,
    color: 'text-green-600'
  }
]

const ThresholdConfig = () => {
  const [recommendations, setRecommendations] = useState<ThresholdRecommendation[]>([])
  const [config, setConfig] = useState<AdaptiveConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [recsData, configData] = await Promise.all([
        apiService.getThresholdRecommendations(),
        apiService.getAdaptiveConfig()
      ])
      setRecommendations(recsData)
      setConfig(configData)
      setError(null)
    } catch (err) {
      setError('Failed to load threshold data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getConfidenceIcon = (confidence: string) => {
    switch (confidence.toLowerCase()) {
      case 'high': return <CheckCircle className="w-4 h-4" />
      case 'medium': return <AlertCircle className="w-4 h-4" />
      case 'low': return <AlertCircle className="w-4 h-4" />
      default: return <AlertCircle className="w-4 h-4" />
    }
  }

  const exportConfig = () => {
    if (!config) return
    
    const dataStr = JSON.stringify(config, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `adaptive-threshold-config-${new Date().toISOString()}.json`
    a.click()
  }

  const formatValue = (value: number, key: string): string => {
    if (key === 'error_burst_window' || key === 'metrics_window') {
      if (value >= 60000) return `${(value / 60000).toFixed(1)} min`
      if (value >= 1000) return `${(value / 1000).toFixed(1)} sec`
      return `${value} ms`
    }
    if (key === 'high_latency_threshold') {
      if (value >= 1000) return `${(value / 1000).toFixed(1)} sec`
      return `${value} ms`
    }
    if (key === 'availability_error_rate') {
      // Value is 0.5 for 50%, so multiply by 100
      return `${(value * 100).toFixed(0)}%`
    }
    if (key === 'error_burst_threshold' || key === 'high_latency_count') {
      return `${value}`
    }
    return `${value}`
  }

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'error':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Error</span>
      case 'latency':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Latency</span>
      case 'availability':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Availability</span>
      default:
        return null
    }
  }

  // Prepare chart data - comparison of current vs recommended
  const chartData = recommendations
    .filter(rec => rec.alert_type === 'error')
    .map(rec => ({
      service: rec.service_name.replace('-service', ''),
      current: rec.current_threshold,
      recommended: rec.recommended_threshold
    }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Threshold Configuration</h1>
          <p className="text-gray-600 mt-1">Monitor and manage alert thresholds across all services</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Refresh
          </button>
          <button
            onClick={exportConfig}
            disabled={!config}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-5 h-5" />
            Export Config
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Threshold Types Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary-600" />
            Threshold Types
          </h3>
          <p className="text-sm text-gray-600 mt-1">Configuration parameters for alert monitoring</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Threshold Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Default Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Values
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {THRESHOLD_INFO.map((threshold, index) => {
                const Icon = threshold.icon
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getCategoryBadge(threshold.category)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${threshold.color}`} />
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{threshold.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{threshold.key}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 max-w-md">{threshold.description}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-primary-600">{threshold.defaultValue}</span>
                    </td>
                    <td className="px-6 py-4">
                      {config && (
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(config.thresholds).map(([serviceName, serviceThresholds]) => {
                            const value = (serviceThresholds as any)[threshold.key]
                            if (value === undefined) return null
                            return (
                              <div key={serviceName} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs">
                                <span className="text-gray-600">{serviceName.replace('-service', '')}:</span>
                                <span className="font-semibold text-gray-900">{formatValue(value, threshold.key)}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Threshold Comparison Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            Error Threshold Comparison (Current vs Recommended)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="service" angle={-45} textAnchor="end" height={100} />
              <YAxis label={{ value: 'Threshold Value', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="current" fill="#ef4444" name="Current Threshold" />
              <Bar dataKey="recommended" fill="#0ea5e9" name="Recommended Threshold" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recommendations Table */}
      {recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Threshold Recommendations</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alert Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Recommended
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rationale
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recommendations.map((rec, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {rec.service_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rec.alert_type}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {rec.current_threshold}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-primary-600">
                        {rec.recommended_threshold}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">
                          +{rec.adjustment_percentage.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${getConfidenceColor(rec.confidence)}`}>
                        {getConfidenceIcon(rec.confidence)}
                        {rec.confidence}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-md">
                      {rec.rationale}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Current Configuration by Service */}
      {config && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Configuration by Service</h3>
          <div className="text-sm text-gray-600 mb-4">
            Generated at: {new Date(config.generated_at).toLocaleString()}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(config.thresholds).map(([service, thresholds]) => (
              <div key={service} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
                <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-primary-600" />
                  {service}
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Error Burst:</span>
                    <span className="font-medium text-gray-900">{thresholds.error_burst_threshold} errors</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Burst Window:</span>
                    <span className="font-medium text-gray-900">{formatValue(thresholds.error_burst_window, 'error_burst_window')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Latency:</span>
                    <span className="font-medium text-gray-900">{formatValue(thresholds.high_latency_threshold, 'high_latency_threshold')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Availability:</span>
                    <span className="font-medium text-gray-900">{formatValue(thresholds.availability_error_rate, 'availability_error_rate')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ThresholdConfig
