import { useState, useEffect } from 'react'
import { 
  Zap,
  Target,
  TrendingUp,
  AlertTriangle,
  Activity,
  RefreshCw,
  Filter,
  BarChart3,
  PieChart
} from 'lucide-react'
import { 
  apiService, 
  MLAgentResults,
  MLClassifiedAlertsResponse
} from '../services/api'
import { 
  BarChart, 
  Bar, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6']

const AlertPrioritization = () => {
  const [mlResults, setMlResults] = useState<MLAgentResults | null>(null)
  const [classifiedAlerts, setClassifiedAlerts] = useState<MLClassifiedAlertsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load both ML results and classified alerts
      const [mlData, classifiedData] = await Promise.all([
        apiService.getMLAgentResults().catch(() => null),
        apiService.getMLClassifiedAlerts().catch(() => null)
      ])
      
      console.log('[AlertPrioritization] ML Results:', mlData)
      console.log('[AlertPrioritization] Classified Alerts:', classifiedData)
      
      setMlResults(mlData)
      setClassifiedAlerts(classifiedData)
    } catch (err) {
      setError('Unable to load prioritization data. Please ensure the backend service is running.')
      console.error('[AlertPrioritization] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading prioritization data...</p>
        </div>
      </div>
    )
  }

  if (error && !mlResults && !classifiedAlerts) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary-600" />
            Alert Prioritization
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">ML-powered priority scoring and distribution</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            <div>
              <h3 className="text-red-800 dark:text-red-200 font-semibold">Error Loading Data</h3>
              <p className="text-red-600 dark:text-red-300 text-sm">{error}</p>
              <button 
                onClick={loadData}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Get priority data from either source
  const priorityDistribution = mlResults?.predictions?.priority_distribution || []
  const byPriority = mlResults?.classified_alerts?.by_priority || classifiedAlerts?.summary?.by_priority || {}
  
  // Calculate totals for percentage calculation
  const totalAlerts = mlResults?.summary?.total_classified || 
                      mlResults?.summary?.total_processed || 
                      classifiedAlerts?.summary?.total_classified || 0

  // Prepare chart data
  const priorityChartData = priorityDistribution.length > 0 
    ? priorityDistribution.map(item => ({
        level: item.level,
        count: item.count,
        percentage: item.percentage
      }))
    : Object.entries(byPriority).map(([level, count]) => ({
        level,
        count: count as number,
        percentage: totalAlerts > 0 ? ((count as number) / totalAlerts * 100).toFixed(1) : 0
      }))

  // Filter alerts if filters are set
  const alertsToShow = classifiedAlerts?.alerts || mlResults?.recent_ml_alerts || []
  const filteredAlerts = alertsToShow.filter(alert => {
    const priority = alert.ml_predictions?.priority?.priority_level || 
                    (alert as any).priority?.priority_level ||
                    getPriorityFromSeverity(alert.severity)
    
    const matchesPriority = priorityFilter === 'all' || priority === priorityFilter
    const matchesService = serviceFilter === 'all' || alert.service_name === serviceFilter
    
    return matchesPriority && matchesService
  })

  function getPriorityFromSeverity(severity: string): string {
    const severityLower = (severity || "medium").toLowerCase()
    const severityToPriority: Record<string, string> = {
      critical: "P0",
      high: "P1",
      medium: "P2",
      low: "P3",
      warning: "P2",
      info: "P3",
    }
    return severityToPriority[severityLower] || "P2"
  }

  const getPriorityColor = (priorityLevel: string) => {
    switch (priorityLevel) {
      case 'P0': return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-500', chart: '#ef4444' }
      case 'P1': return { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-500', chart: '#f97316' }
      case 'P2': return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-500', chart: '#eab308' }
      case 'P3': return { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-500', chart: '#3b82f6' }
      default: return { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-500', chart: '#6b7280' }
    }
  }

  const uniqueServices = Array.from(new Set(filteredAlerts.map(a => a.service_name)))

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary-600" />
            Alert Prioritization
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">ML-powered priority scoring and intelligent alert classification</p>
        </div>
        {/* <button
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button> */}
      </div>

      {/* Priority Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {['P0', 'P1', 'P2', 'P3'].map(level => {
          const count = byPriority[level] || 0
          const percentage = totalAlerts > 0 ? ((count / totalAlerts) * 100).toFixed(1) : '0'
          const colors = getPriorityColor(level)
          
          return (
            <div key={level} className={`${colors.bg} border-l-4 ${colors.border} rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-semibold ${colors.text}`}>{level}</span>
                <span className={`text-xs font-bold ${colors.text}`}>{percentage}%</span>
              </div>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">alerts</p>
            </div>
          )
        })}
      </div>

      {/* Filters
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Priorities</option>
            <option value="P0">P0 - Critical</option>
            <option value="P1">P1 - High</option>
            <option value="P2">P2 - Medium</option>
            <option value="P3">P3 - Low</option>
          </select>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Services</option>
            {uniqueServices.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
        </div>
      </div> */}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution Bar Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary-600" />
            Priority Distribution
          </h3>
          {priorityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="level" tick={{ fill: '#6b7280' }} />
                <YAxis tick={{ fill: '#6b7280' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'count') return [`${value} alerts`, 'Count']
                    if (name === 'percentage') return [`${value}%`, 'Percentage']
                    return [value, name]
                  }}
                />
                <Legend />
                <Bar dataKey="count" fill="#0ea5e9" name="Alert Count" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No priority data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Priority Distribution Pie Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary-600" />
            Priority Breakdown
          </h3>
          {priorityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={priorityChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ level, percentage }) => `${level}: ${percentage}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {priorityChartData.map((entry, index) => {
                    const colors = getPriorityColor(entry.level)
                    return <Cell key={`cell-${index}`} fill={colors.chart} />
                  })}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => `${value} alerts`}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
              </RechartsPieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No priority data available</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Priority by Service */}
      {mlResults?.classified_alerts?.by_service && Object.keys(mlResults.classified_alerts.by_service).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary-600" />
            Priority by Service
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Service
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Alert Count
                  </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Avg Priority Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(mlResults.classified_alerts.by_service).map(([service, data]) => (
                  <tr key={service} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {service}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {data.count}
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {data.avg_priority_score.toFixed(1)}/100
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Alerts Table with Priority */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary-600" />
            Prioritized Alerts ({filteredAlerts.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Alert Name
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
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400 dark:text-gray-500 opacity-50" />
                    <p className="text-lg font-medium">No alerts found</p>
                    <p className="text-sm">Try adjusting your filters or ensure alerts are being collected</p>
                  </td>
                </tr>
              ) : (
                filteredAlerts.slice(0, 50).map((alert, index) => {
                  const priority = alert.ml_predictions?.priority?.priority_level || 
                                 (alert as any).priority?.priority_level ||
                                 getPriorityFromSeverity(alert.severity)
                  const priorityScore = alert.ml_predictions?.priority?.priority_score || 
                                      (alert as any).priority?.priority_score ||
                                      (priority === 'P0' ? 90 : priority === 'P1' ? 70 : priority === 'P2' ? 50 : 30)
                  const colors = getPriorityColor(priority)
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className={`px-2.5 py-1 inline-flex text-xs font-semibold rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                            {priority}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {priorityScore.toFixed(1)}/100
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                        {alert.service_name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
                        {alert.alert_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {alert.alert_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          alert.severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                          alert.severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                          alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          alert.alert_state === 'resolved' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {alert.alert_state}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {new Date(alert.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AlertPrioritization

