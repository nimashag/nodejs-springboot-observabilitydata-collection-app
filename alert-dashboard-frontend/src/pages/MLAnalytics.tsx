import { useState, useEffect } from 'react'
import { 
  Brain, 
  TrendingUp,
  Target,
  Award,
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { apiService, MLModelReport } from '../services/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
    if (accuracy >= 0.9) return 'text-green-600'
    if (accuracy >= 0.7) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceStatus = (accuracy: number) => {
    if (accuracy >= 0.9) return { text: 'Excellent', color: 'bg-green-100 text-green-800', icon: CheckCircle }
    if (accuracy >= 0.7) return { text: 'Good', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle }
    return { text: 'Needs Improvement', color: 'bg-red-100 text-red-800', icon: AlertCircle }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ML Model Analytics</h1>
          <p className="text-gray-600 mt-1">Machine learning model performance and insights</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-600" />
            <div>
              <h3 className="text-red-800 font-semibold">Error Loading ML Analytics</h3>
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
    importance: (f.importance * 100).toFixed(2)
  }))

  // Prepare model performance comparison
  const modelPerformance = [
    {
      model: 'Alert Classifier',
      'Cross-Val Accuracy': (report.cross_validation.alert_classifier.mean_accuracy * 100).toFixed(2),
      'Test Accuracy': (report.test_performance.alert_classifier.accuracy * 100).toFixed(2)
    },
    {
      model: 'Alert Predictor',
      'Cross-Val Accuracy': (report.cross_validation.alert_predictor.mean_accuracy * 100).toFixed(2),
      'Test Accuracy': (report.test_performance.alert_predictor.accuracy * 100).toFixed(2)
    },
    {
      model: 'FP Detector',
      'Cross-Val Accuracy': (report.cross_validation.false_positive_detector.mean_f1 * 100).toFixed(2),
      'Test Accuracy': (report.test_performance.false_positive_detector.f1_score * 100).toFixed(2)
    }
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ML Model Analytics</h1>
          <p className="text-gray-600 mt-1">Machine learning model performance and insights</p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Refresh
        </button>
      </div>

      {/* Training Info */}
      <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Brain className="w-8 h-8" />
          <div>
            <h2 className="text-2xl font-bold">Model Training Information</h2>
            <p className="text-primary-100">Pipeline Version: {report.pipeline_version}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-primary-100 text-sm">Training Date</p>
            <p className="text-lg font-semibold mt-1">
              {new Date(report.training_date).toLocaleDateString()}
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-primary-100 text-sm">Total Samples</p>
            <p className="text-lg font-semibold mt-1">{report.data_stats.total_samples}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-primary-100 text-sm">Features</p>
            <p className="text-lg font-semibold mt-1">{report.data_stats.features_count}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-primary-100 text-sm">CV Folds</p>
            <p className="text-lg font-semibold mt-1">{report.hyperparameter_tuning.cv_folds}</p>
          </div>
        </div>
      </div>

      {/* Model Performance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Alert Classifier */}
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-green-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Alert Classifier</h3>
            <Target className="w-6 h-6 text-green-600" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Cross-Validation</p>
              <p className={`text-3xl font-bold ${getPerformanceColor(report.cross_validation.alert_classifier.mean_accuracy)}`}>
                {(report.cross_validation.alert_classifier.mean_accuracy * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Test Accuracy</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(report.test_performance.alert_classifier.accuracy)}`}>
                {report.test_performance.alert_classifier.percentage}
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

        {/* Alert Predictor */}
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Alert Predictor</h3>
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Cross-Validation</p>
              <p className={`text-3xl font-bold ${getPerformanceColor(report.cross_validation.alert_predictor.mean_accuracy)}`}>
                {(report.cross_validation.alert_predictor.mean_accuracy * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Test F1-Score</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(report.test_performance.alert_predictor.f1_score)}`}>
                {(report.test_performance.alert_predictor.f1_score * 100).toFixed(2)}%
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

        {/* False Positive Detector */}
        <div className="bg-white rounded-lg shadow-md p-6 border-t-4 border-purple-500">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">FP Detector</h3>
            <Award className="w-6 h-6 text-purple-600" />
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Cross-Validation F1</p>
              <p className={`text-3xl font-bold ${getPerformanceColor(report.cross_validation.false_positive_detector.mean_f1)}`}>
                {(report.cross_validation.false_positive_detector.mean_f1 * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Test F1-Score</p>
              <p className={`text-2xl font-bold ${getPerformanceColor(report.test_performance.false_positive_detector.f1_score)}`}>
                {(report.test_performance.false_positive_detector.f1_score * 100).toFixed(2)}%
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

      {/* Model Performance Comparison Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          Model Performance Comparison
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={modelPerformance}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="model" />
            <YAxis label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Cross-Val Accuracy" fill="#8b5cf6" />
            <Bar dataKey="Test Accuracy" fill="#0ea5e9" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Feature Importance */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary-600" />
          Top 10 Feature Importance
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={featureData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" label={{ value: 'Importance (%)', position: 'bottom' }} />
            <YAxis dataKey="feature" type="category" width={200} />
            <Tooltip />
            <Bar dataKey="importance" fill="#0ea5e9" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Statistics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Total Samples</span>
              <span className="font-semibold text-gray-900">{report.data_stats.total_samples}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Training Samples</span>
              <span className="font-semibold text-gray-900">{report.data_stats.training_samples}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Test Samples</span>
              <span className="font-semibold text-gray-900">{report.data_stats.test_samples}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Features Count</span>
              <span className="font-semibold text-gray-900">{report.data_stats.features_count}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Alert Types</span>
              <span className="font-semibold text-gray-900">{report.data_stats.alert_types}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-700">Severity Levels</span>
              <span className="font-semibold text-gray-900">{report.data_stats.severity_levels}</span>
            </div>
          </div>
        </div>

        {/* Hyperparameters */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Hyperparameter Tuning</h3>
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Alert Classifier</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Estimators:</div>
                <div className="font-medium">{report.hyperparameter_tuning.classifier_best_params.n_estimators}</div>
                <div className="text-gray-600">Max Depth:</div>
                <div className="font-medium">{report.hyperparameter_tuning.classifier_best_params.max_depth}</div>
                <div className="text-gray-600">Min Samples Split:</div>
                <div className="font-medium">{report.hyperparameter_tuning.classifier_best_params.min_samples_split}</div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Alert Predictor</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Estimators:</div>
                <div className="font-medium">{report.hyperparameter_tuning.predictor_best_params.n_estimators}</div>
                <div className="text-gray-600">Max Depth:</div>
                <div className="font-medium">{report.hyperparameter_tuning.predictor_best_params.max_depth}</div>
                <div className="text-gray-600">Min Samples Split:</div>
                <div className="font-medium">{report.hyperparameter_tuning.predictor_best_params.min_samples_split}</div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2">FP Detector</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Estimators:</div>
                <div className="font-medium">{report.hyperparameter_tuning.fp_detector_best_params.n_estimators}</div>
                <div className="text-gray-600">Max Depth:</div>
                <div className="font-medium">{report.hyperparameter_tuning.fp_detector_best_params.max_depth}</div>
                <div className="text-gray-600">Min Samples Split:</div>
                <div className="font-medium">{report.hyperparameter_tuning.fp_detector_best_params.min_samples_split}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Model Files */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Files</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-700">{report.model_files.classifier}</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-700">{report.model_files.predictor}</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-700">{report.model_files.fp_detector}</span>
          </div>
          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-700">{report.model_files.scaler}</span>
          </div>
          {report.model_files.encoders.map((encoder, idx) => (
            <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-700">{encoder}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MLAnalytics

