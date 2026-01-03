import { useState, useEffect } from 'react'
import { 
  Settings, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Download,
  RefreshCw
} from 'lucide-react'
import { apiService, ThresholdRecommendation, AdaptiveConfig } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
          <p className="text-gray-600 mt-1">Adaptive threshold recommendations and configuration</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-primary-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Recommendations</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{recommendations.length}</p>
            </div>
            <div className="bg-primary-100 p-3 rounded-lg">
              <TrendingUp className="w-8 h-8 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Confidence</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {recommendations.filter(r => r.confidence === 'high').length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Services Covered</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {new Set(recommendations.map(r => r.service_name)).size}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Settings className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Threshold Comparison Chart */}
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

      {/* Recommendations Table */}
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
                  Samples
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rec.based_on_samples}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rationale Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendation Rationale</h3>
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    {rec.service_name} - {rec.alert_type}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.rationale}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(rec.confidence)}`}>
                  {rec.confidence}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Current Configuration */}
      {config && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Configuration</h3>
          <div className="text-sm text-gray-600 mb-4">
            Generated at: {new Date(config.generated_at).toLocaleString()}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(config.thresholds).map(([service, thresholds]) => (
              <div key={service} className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-3">{service}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Error Burst Threshold:</span>
                    <span className="font-medium text-gray-900">{thresholds.error_burst_threshold}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Burst Window:</span>
                    <span className="font-medium text-gray-900">{thresholds.error_burst_window}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Latency Threshold:</span>
                    <span className="font-medium text-gray-900">{thresholds.high_latency_threshold}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Availability Rate:</span>
                    <span className="font-medium text-gray-900">{(thresholds.availability_error_rate * 100).toFixed(0)}%</span>
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

