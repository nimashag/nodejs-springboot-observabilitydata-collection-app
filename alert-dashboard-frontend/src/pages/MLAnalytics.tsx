import { useState, useEffect } from 'react'
import { 
  Brain, 
  TrendingUp,
  Target,
  Award,
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Activity,
  Zap,
  BarChart3,
  PieChart,
  LineChart
} from 'lucide-react'
import { apiService, MLModelReport } from '../services/api'
import { 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'

const MLAnalytics = () => {
  const [report, setReport] = useState<MLModelReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await apiService.getMLModelReport()
      setReport(data)
      setError(null)
    } catch (err) {
      setError('Failed to load ML analytics data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getPerformanceColor = (accuracy: number) => {
    if (accuracy >= 0.9) return { text: 'text-green-600', bg: 'bg-green-500', light: 'bg-green-100' }
    if (accuracy >= 0.7) return { text: 'text-yellow-600', bg: 'bg-yellow-500', light: 'bg-yellow-100' }
    return { text: 'text-red-600', bg: 'bg-red-500', light: 'bg-red-100' }
  }

  const getPerformanceStatus = (accuracy: number) => {
    if (accuracy >= 0.9) return { text: 'Excellent', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    if (accuracy >= 0.7) return { text: 'Good', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle }
    return { text: 'Needs Improvement', color: 'bg-red-100 text-red-800', icon: AlertCircle }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading performance data...</p>
        </div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Model Performance</h1>
          <p className="text-gray-600 mt-1">System accuracy and performance metrics</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="text-red-800 font-semibold">Error Loading Performance Data</h3>
              <p className="text-red-600 text-sm">{error || 'Unknown error occurred'}</p>
              <button 
                onClick={loadData}
                className="mt-2 text-sm text-red-700 underline hover:text-red-800"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Prepare feature importance data
  const featureData = report.feature_importance.slice(0, 10).map(f => ({
    feature: f.feature.replace(/_/g, ' '),
    importance: parseFloat((f.importance * 100).toFixed(2))
  }))


  // Prepare confidence intervals data
  const confidenceIntervals = [
    {
      model: 'Alert Classifier',
      mean: report.cross_validation.alert_classifier.mean_accuracy * 100,
      lower: report.cross_validation.alert_classifier.confidence_interval_95[0] * 100,
      upper: report.cross_validation.alert_classifier.confidence_interval_95[1] * 100,
      std: report.cross_validation.alert_classifier.std_accuracy * 100
    },
    {
      model: 'Alert Predictor',
      mean: report.cross_validation.alert_predictor.mean_accuracy * 100,
      lower: report.cross_validation.alert_predictor.confidence_interval_95[0] * 100,
      upper: report.cross_validation.alert_predictor.confidence_interval_95[1] * 100,
      std: report.cross_validation.alert_predictor.std_accuracy * 100
    },
    {
      model: 'FP Detector',
      mean: report.cross_validation.false_positive_detector.mean_f1 * 100,
      lower: report.cross_validation.false_positive_detector.confidence_interval_95[0] * 100,
      upper: report.cross_validation.false_positive_detector.confidence_interval_95[1] * 100,
      std: report.cross_validation.false_positive_detector.std_f1 * 100
    }
  ]

  // Prepare data split visualization
  const dataSplit = [
    { name: 'Training', value: report.data_stats.training_samples, color: '#8b5cf6' },
    { name: 'Test', value: report.data_stats.test_samples, color: '#0ea5e9' }
  ]

  // Prepare line chart data for model performance comparison
  const modelPerformanceLine = [
    { metric: 'Cross-Val', 'Alert Classifier': parseFloat((report.cross_validation.alert_classifier.mean_accuracy * 100).toFixed(2)), 'Alert Predictor': parseFloat((report.cross_validation.alert_predictor.mean_accuracy * 100).toFixed(2)), 'FP Detector': parseFloat((report.cross_validation.false_positive_detector.mean_f1 * 100).toFixed(2)) },
    { metric: 'Test', 'Alert Classifier': parseFloat((report.test_performance.alert_classifier.accuracy * 100).toFixed(2)), 'Alert Predictor': parseFloat((report.test_performance.alert_predictor.accuracy * 100).toFixed(2)), 'FP Detector': parseFloat((report.test_performance.false_positive_detector.f1_score * 100).toFixed(2)) }
  ]

  // Prepare line chart data for feature importance (top 10)
  const featureImportanceLine = featureData.map((f, idx) => ({
    rank: idx + 1,
    feature: f.feature,
    importance: f.importance
  }))

  // Prepare line chart data for precision/recall/f1 comparison
  const metricsComparisonLine = [
    { metric: 'Precision', 'Alert Predictor': parseFloat((report.test_performance.alert_predictor.precision * 100).toFixed(2)), 'FP Detector': parseFloat((report.test_performance.false_positive_detector.precision * 100).toFixed(2)) },
    { metric: 'Recall', 'Alert Predictor': parseFloat((report.test_performance.alert_predictor.recall * 100).toFixed(2)), 'FP Detector': parseFloat((report.test_performance.false_positive_detector.recall * 100).toFixed(2)) },
    { metric: 'F1-Score', 'Alert Predictor': parseFloat((report.test_performance.alert_predictor.f1_score * 100).toFixed(2)), 'FP Detector': parseFloat((report.test_performance.false_positive_detector.f1_score * 100).toFixed(2)) }
  ]

  // Prepare confidence intervals line chart data
  const confidenceIntervalsLine = confidenceIntervals.map(ci => ({
    model: ci.model,
    mean: ci.mean,
    lower: ci.lower,
    upper: ci.upper
  }))

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Brain className="w-8 h-8 text-primary-600" />
            Model Performance
          </h1>
          <p className="text-gray-600 mt-1">System accuracy, reliability metrics, and performance insights</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all shadow-md hover:shadow-lg"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Training Info Banner */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary-100 rounded-lg p-3">
              <Brain className="w-8 h-8 text-primary-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">System Training Status</h2>
              <p className="text-gray-600">Version: {report.pipeline_version}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-lg font-semibold text-gray-900">
              {new Date(report.training_date).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-4 h-4 text-primary-600" />
              <p className="text-gray-600 text-sm font-medium">Total Samples</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{report.data_stats.total_samples.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-primary-600" />
              <p className="text-gray-600 text-sm font-medium">Features</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{report.data_stats.features_count}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-primary-600" />
              <p className="text-gray-600 text-sm font-medium">CV Folds</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{report.hyperparameter_tuning.cv_folds}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-primary-600" />
              <p className="text-gray-600 text-sm font-medium">Alert Types</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{report.data_stats.alert_types}</p>
          </div>
        </div>
      </div>

      {/* Model Performance Cards with Progress Bars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Priority Classification */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Priority Classification</h3>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-600">Test Accuracy</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(report.test_performance.alert_classifier.accuracy).text}`}>
                  {(report.test_performance.alert_classifier.accuracy * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${getPerformanceColor(report.test_performance.alert_classifier.accuracy).bg}`}
                  style={{ width: `${report.test_performance.alert_classifier.accuracy * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500 mb-1">Cross-Validation</p>
              <p className={`text-lg font-semibold ${getPerformanceColor(report.cross_validation.alert_classifier.mean_accuracy).text}`}>
                {(report.cross_validation.alert_classifier.mean_accuracy * 100).toFixed(1)}%
              </p>
            </div>
            <div className="pt-2">
              {(() => {
                const status = getPerformanceStatus(report.test_performance.alert_classifier.accuracy)
                const Icon = status.icon
                return (
                  <span className={`px-3 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${status.color}`}>
                    <Icon className="w-4 h-4" />
                    {status.text}
                  </span>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Resolution Prediction */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Resolution Prediction</h3>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-600">F1-Score</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(report.test_performance.alert_predictor.f1_score).text}`}>
                  {(report.test_performance.alert_predictor.f1_score * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${getPerformanceColor(report.test_performance.alert_predictor.f1_score).bg}`}
                  style={{ width: `${report.test_performance.alert_predictor.f1_score * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500 mb-1">Cross-Validation</p>
              <p className={`text-lg font-semibold ${getPerformanceColor(report.cross_validation.alert_predictor.mean_accuracy).text}`}>
                {(report.cross_validation.alert_predictor.mean_accuracy * 100).toFixed(1)}%
              </p>
            </div>
            <div className="pt-2">
              {(() => {
                const status = getPerformanceStatus(report.test_performance.alert_predictor.f1_score)
                const Icon = status.icon
                return (
                  <span className={`px-3 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${status.color}`}>
                    <Icon className="w-4 h-4" />
                    {status.text}
                  </span>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Noise Detection */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500 hover:shadow-xl transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Noise Detection</h3>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-600">F1-Score</p>
                <p className={`text-2xl font-bold ${getPerformanceColor(report.test_performance.false_positive_detector.f1_score).text}`}>
                  {(report.test_performance.false_positive_detector.f1_score * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-500 ${getPerformanceColor(report.test_performance.false_positive_detector.f1_score).bg}`}
                  style={{ width: `${report.test_performance.false_positive_detector.f1_score * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="pt-2 border-t">
              <p className="text-xs text-gray-500 mb-1">Cross-Validation F1</p>
              <p className={`text-lg font-semibold ${getPerformanceColor(report.cross_validation.false_positive_detector.mean_f1).text}`}>
                {(report.cross_validation.false_positive_detector.mean_f1 * 100).toFixed(1)}%
              </p>
            </div>
            <div className="pt-2">
              {(() => {
                const status = getPerformanceStatus(report.test_performance.false_positive_detector.f1_score)
                const Icon = status.icon
                return (
                  <span className={`px-3 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${status.color}`}>
                    <Icon className="w-4 h-4" />
                    {status.text}
                  </span>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Performance Comparison Line Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LineChart className="w-5 h-5 text-primary-600" />
            Model Performance Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={modelPerformanceLine}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="metric" tick={{ fill: '#6b7280' }} />
              <YAxis label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }} tick={{ fill: '#6b7280' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value: any) => `${value.toFixed(2)}%`}
              />
              <Legend />
              <Line type="monotone" dataKey="Alert Classifier" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="Alert Predictor" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="FP Detector" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>

        {/* Data Split Pie Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary-600" />
            Data Split Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={dataSplit}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {dataSplit.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex justify-center gap-6">
            {dataSplit.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600">{item.name}: {item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Confidence Intervals Line Chart */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <LineChart className="w-5 h-5 text-primary-600" />
          Cross-Validation Confidence Intervals (95%)
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart data={confidenceIntervalsLine}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="model" tick={{ fill: '#6b7280' }} />
            <YAxis label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }} tick={{ fill: '#6b7280' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              formatter={(value: any) => `${value.toFixed(2)}%`}
            />
            <Legend />
            <Line type="monotone" dataKey="mean" stroke="#8b5cf6" strokeWidth={3} name="Mean" dot={{ r: 6 }} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="lower" stroke="#0ea5e9" strokeWidth={2} strokeDasharray="5 5" name="Lower Bound" dot={{ r: 4 }} />
            <Line type="monotone" dataKey="upper" stroke="#10b981" strokeWidth={2} strokeDasharray="5 5" name="Upper Bound" dot={{ r: 4 }} />
          </RechartsLineChart>
        </ResponsiveContainer>
        <div className="mt-4 text-sm text-gray-600">
          <p>Standard Deviation: Alert Classifier (±{(confidenceIntervals[0].std).toFixed(2)}%), 
             Alert Predictor (±{(confidenceIntervals[1].std).toFixed(2)}%), 
             FP Detector (±{(confidenceIntervals[2].std).toFixed(2)}%)</p>
        </div>
      </div>

      {/* Cross-Validation vs Test Performance Line Chart */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <LineChart className="w-5 h-5 text-primary-600" />
          Cross-Validation vs Test Performance Comparison
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <RechartsLineChart data={modelPerformanceLine}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="metric" tick={{ fill: '#6b7280' }} />
            <YAxis label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }} tick={{ fill: '#6b7280' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              formatter={(value: any) => `${value.toFixed(2)}%`}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="Alert Classifier" 
              stroke="#10b981" 
              strokeWidth={3} 
              dot={{ r: 6 }} 
              activeDot={{ r: 8 }} 
            />
            <Line 
              type="monotone" 
              dataKey="Alert Predictor" 
              stroke="#0ea5e9" 
              strokeWidth={3} 
              dot={{ r: 6 }} 
              activeDot={{ r: 8 }} 
            />
            <Line 
              type="monotone" 
              dataKey="FP Detector" 
              stroke="#8b5cf6" 
              strokeWidth={3} 
              dot={{ r: 6 }} 
              activeDot={{ r: 8 }} 
            />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>

      {/* Charts Row 2 - Metrics Comparison Line Chart */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary-600" />
          Precision/Recall/F1 Score Comparison
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <RechartsLineChart data={metricsComparisonLine}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="metric" tick={{ fill: '#6b7280' }} />
            <YAxis label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} tick={{ fill: '#6b7280' }} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px'
              }}
              formatter={(value: any) => `${value.toFixed(2)}%`}
            />
            <Legend />
            <Line type="monotone" dataKey="Alert Predictor" stroke="#0ea5e9" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="FP Detector" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
          </RechartsLineChart>
        </ResponsiveContainer>
      </div>

      {/* Feature Importance - Line and Area Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Importance Line Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LineChart className="w-5 h-5 text-primary-600" />
            Top 10 Feature Importance (Line)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <RechartsLineChart data={featureImportanceLine}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="rank" label={{ value: 'Rank', position: 'insideBottom', offset: -5 }} tick={{ fill: '#6b7280' }} />
              <YAxis label={{ value: 'Importance (%)', angle: -90, position: 'insideLeft' }} tick={{ fill: '#6b7280' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value: any, _name: string, props: any) => [
                  `${value}%`,
                  `${props.payload.feature}`
                ]}
                labelFormatter={(label) => `Rank ${label}`}
              />
              <Line 
                type="monotone" 
                dataKey="importance" 
                stroke="#0ea5e9" 
                strokeWidth={3} 
                dot={{ r: 5, fill: '#0ea5e9' }} 
                activeDot={{ r: 7 }}
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        </div>

        {/* Feature Importance Area Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <LineChart className="w-5 h-5 text-primary-600" />
            Top 10 Feature Importance (Area)
          </h3>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={featureImportanceLine}>
              <defs>
                <linearGradient id="colorImportance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="rank" label={{ value: 'Rank', position: 'insideBottom', offset: -5 }} tick={{ fill: '#6b7280' }} />
              <YAxis label={{ value: 'Importance (%)', angle: -90, position: 'insideLeft' }} tick={{ fill: '#6b7280' }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px'
                }}
                formatter={(value: any, _name: string, props: any) => [
                  `${value}%`,
                  `${props.payload.feature}`
                ]}
                labelFormatter={(label) => `Rank ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="importance" 
                stroke="#0ea5e9" 
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorImportance)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Statistics */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary-600" />
            Data Statistics
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                <span className="text-gray-700 font-medium">Total Samples</span>
              </div>
              <span className="font-bold text-gray-900 text-lg">{report.data_stats.total_samples.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span className="text-gray-700 font-medium">Training Samples</span>
              </div>
              <span className="font-bold text-gray-900 text-lg">{report.data_stats.training_samples.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span className="text-gray-700 font-medium">Test Samples</span>
              </div>
              <span className="font-bold text-gray-900 text-lg">{report.data_stats.test_samples.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                <span className="text-gray-700 font-medium">Features Count</span>
              </div>
              <span className="font-bold text-gray-900 text-lg">{report.data_stats.features_count}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-600 rounded-full"></div>
                <span className="text-gray-700 font-medium">Alert Types</span>
              </div>
              <span className="font-bold text-gray-900 text-lg">{report.data_stats.alert_types}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                <span className="text-gray-700 font-medium">Severity Levels</span>
              </div>
              <span className="font-bold text-gray-900 text-lg">{report.data_stats.severity_levels}</span>
            </div>
          </div>
        </div>

        {/* System Configuration */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary-600" />
            System Configuration
            <span className="text-xs font-normal text-gray-500 ml-2">(Auto-optimized)</span>
          </h3>
          <div className="space-y-4">
            <div className="border-2 border-green-200 bg-green-50/50 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-green-600" />
                <h4 className="font-semibold text-gray-900">Priority Classification</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-600">Estimators:</div>
                <div className="font-semibold text-gray-900">{report.hyperparameter_tuning.classifier_best_params.n_estimators}</div>
                <div className="text-gray-600">Max Depth:</div>
                <div className="font-semibold text-gray-900">{report.hyperparameter_tuning.classifier_best_params.max_depth || 'N/A'}</div>
                <div className="text-gray-600">Min Samples Split:</div>
                <div className="font-semibold text-gray-900">{report.hyperparameter_tuning.classifier_best_params.min_samples_split || 'N/A'}</div>
              </div>
            </div>
            <div className="border-2 border-blue-200 bg-blue-50/50 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <h4 className="font-semibold text-gray-900">Resolution Prediction</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-600">Estimators:</div>
                <div className="font-semibold text-gray-900">{report.hyperparameter_tuning.predictor_best_params.n_estimators}</div>
                <div className="text-gray-600">Max Depth:</div>
                <div className="font-semibold text-gray-900">{report.hyperparameter_tuning.predictor_best_params.max_depth || 'N/A'}</div>
                <div className="text-gray-600">Min Samples Split:</div>
                <div className="font-semibold text-gray-900">{report.hyperparameter_tuning.predictor_best_params.min_samples_split || 'N/A'}</div>
              </div>
            </div>
            <div className="border-2 border-purple-200 bg-purple-50/50 rounded-xl p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <Award className="w-4 h-4 text-purple-600" />
                <h4 className="font-semibold text-gray-900">Noise Detection</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="text-gray-600">Estimators:</div>
                <div className="font-semibold text-gray-900">{report.hyperparameter_tuning.fp_detector_best_params.n_estimators}</div>
                <div className="text-gray-600">Max Depth:</div>
                <div className="font-semibold text-gray-900">{report.hyperparameter_tuning.fp_detector_best_params.max_depth || 'N/A'}</div>
                <div className="text-gray-600">Min Samples Split:</div>
                <div className="font-semibold text-gray-900">{report.hyperparameter_tuning.fp_detector_best_params.min_samples_split || 'N/A'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MLAnalytics



