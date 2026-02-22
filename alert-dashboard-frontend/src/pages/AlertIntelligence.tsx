import { useState, useEffect } from 'react'
import { 
  AlertCircle,
  Shield,
  Activity,
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Filter
} from 'lucide-react'
import { 
  apiService, 
  MLAgentResults as AlertIntelligenceData
} from '../services/api'
import { 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart as RechartsPieChart,
  Pie
} from 'recharts'

const AlertIntelligence = () => {
  const [data, setData] = useState<AlertIntelligenceData | null>(null)
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
      const result = await apiService.getMLAgentResults()
      setData(result)
      setError(null)
    } catch (err) {
      setError('Unable to load alert intelligence data. Please ensure the backend service is running.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading alert intelligence data...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary-600" />
            Alert Intelligence
          </h1>
          <p className="text-gray-600 mt-1">ML-powered alert prioritization and intelligent classification</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <h3 className="text-yellow-800 font-semibold">Data Not Available</h3>
              <p className="text-yellow-600 text-sm">{error || 'No alert data available yet. Alerts will appear here once processed.'}</p>
              <button 
                onClick={loadData}
                className="mt-2 text-sm text-yellow-700 underline hover:text-yellow-800"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Prepare chart data
  const noiseBreakdownData = [
    {
      name: 'False Positives',
      value: data.summary.false_positives_detected,
      fill: '#ef4444'
    },
    {
      name: 'Suppressed',
      value: data.summary.suppressed_count,
      fill: '#10b981'
    },
    {
      name: 'Actionable',
      value: Math.max(0, data.summary.total_processed - data.summary.false_positives_detected - data.summary.suppressed_count),
      fill: '#3b82f6'
    }
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary-600" />
            Alert Intelligence
          </h1>
          <p className="text-gray-600 mt-1">ML-powered alert prioritization and intelligent classification</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Alert Composition Pie Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            Alert Composition
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={noiseBreakdownData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
              >
                {noiseBreakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `${value} alerts`} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Priority Scoring Engine Output */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-600" />
            Priority Scoring Engine Output
          </h3>
        </div>
        
        {/* Priority Distribution */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Priority Level Distribution</h4>
          {(!data.predictions?.priority_distribution || data.predictions.priority_distribution.length === 0) &&
           (!data.classified_alerts?.by_priority || Object.keys(data.classified_alerts.by_priority).length === 0) ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                No priority data available. Priority data will appear here once alerts are processed.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(data.predictions?.priority_distribution && data.predictions.priority_distribution.length > 0
                ? data.predictions.priority_distribution
                : Object.entries(data.classified_alerts?.by_priority || {}).map(([level, count]) => ({
                    level,
                    count: count as number,
                    percentage: data.summary?.total_classified 
                      ? ((count as number) / data.summary.total_classified * 100).toFixed(1)
                      : '0'
                  }))
              ).map((item: any) => {
                const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
                  'P0': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-500' },
                  'P1': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-500' },
                  'P2': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-500' },
                  'P3': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-500' }
                };
                const colors = priorityColors[item.level] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-500' };
                
                return (
                  <div key={item.level} className={`${colors.bg} border-l-4 ${colors.border} rounded-lg p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-semibold ${colors.text}`}>{item.level}</span>
                      <span className={`text-xs font-bold ${colors.text}`}>{item.percentage}%</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                    <p className="text-xs text-gray-600 mt-1">alerts</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Alert Fatigue Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        {/* Alert Fatigue Indicators */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Alert Fatigue Indicators
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 mt-1">
                <Clock className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Total Alerts Processed</p>
                <p className="text-sm text-gray-600 mt-1">{data.summary.total_processed.toLocaleString()} alerts analyzed</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 mt-1">
                <Activity className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">False Positive Density</p>
                <p className="text-sm text-gray-600 mt-1">
                  {data.summary.total_processed > 0 
                    ? (data.summary.false_positives_detected / data.summary.total_processed).toFixed(3)
                    : '0'
                  } FP per alert
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0 mt-1">
                <Shield className="w-4 h-4 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Actionable Alert Rate</p>
                <p className="text-sm text-gray-600 mt-1">
                  {((data.summary.total_processed - data.summary.false_positives_detected - data.summary.suppressed_count) / (data.summary.total_processed || 1) * 100).toFixed(1)}% of alerts are actionable
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AlertIntelligence
