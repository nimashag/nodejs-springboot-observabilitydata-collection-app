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
  Zap,
  X,
  Brain,
  Target,
  BarChart3,
  LineChart,
  Shield,
  AlertTriangle,
  TrendingDown,
  Info,
  Check,
  XCircle,
  Play,
  Pause,
  Eye,
  Database,
  Cpu,
  Server,
  FileText,
  ChevronDown
} from 'lucide-react'
import { alertApiService, ThresholdRecommendation, AdaptiveConfig } from '../../api/alerts/alertApi'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Area,
  AreaChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
  PieChart,
  Pie
} from 'recharts'

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
  const [selectedThreshold, setSelectedThreshold] = useState<ThresholdRecommendation | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'recommendations' | 'performance' | 'configuration'>('overview')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [applying, setApplying] = useState<string | null>(null) // Track which recommendation is being applied
  const [appliedThresholds, setAppliedThresholds] = useState<Set<string>>(new Set()) // Track applied recommendations
  const [appliedDetails, setAppliedDetails] = useState<Map<string, { old: number; new: number; at: string }>>(new Map()) // Store applied details
  const [applySuccess, setApplySuccess] = useState<string | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadData()
      }, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadData = async () => {
    try {
      setLoading(true)
      const [recsData, configData, appliedData] = await Promise.all([
        alertApiService.getThresholdRecommendations(),
        alertApiService.getAdaptiveConfig(),
        alertApiService.getAppliedThresholds()
      ])
      setRecommendations(recsData)
      setConfig(configData)
      
      // Load already applied thresholds into state
      const appliedKeys = new Set<string>()
      const appliedDetailsMap = new Map<string, { old: number; new: number; at: string }>()
      
      appliedData.forEach((a: { service_name: string; alert_type: string; old_threshold?: number; new_threshold: number; applied_at: string }) => {
        const key = `${a.service_name}-${a.alert_type}`
        appliedKeys.add(key)
        appliedDetailsMap.set(key, {
          old: a.old_threshold ?? 0,
          new: a.new_threshold,
          at: a.applied_at
        })
      })
      
      setAppliedThresholds(appliedKeys)
      setAppliedDetails(appliedDetailsMap)
      
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError('Failed to load threshold data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Apply a threshold recommendation
  const applyRecommendation = async (rec: ThresholdRecommendation) => {
    const recKey = `${rec.service_name}-${rec.alert_type}`
    
    try {
      setApplying(recKey)
      setApplyError(null)
      setApplySuccess(null)
      
      const result = await alertApiService.applyThreshold({
        service_name: rec.service_name,
        alert_type: rec.alert_type,
        new_threshold: rec.recommended_threshold,
        recommendation: rec
      })
      
      if (result.success) {
        // Mark as applied
        setAppliedThresholds(prev => new Set([...prev, recKey]))
        setApplySuccess(`Threshold for ${rec.service_name} - ${rec.threshold_label} updated: ${result.old_threshold} → ${result.new_threshold}`)
        
        // Close the detail modal if open
        setSelectedThreshold(null)
        
        // Refresh data after 2 seconds
        setTimeout(() => {
          loadData()
          setApplySuccess(null)
        }, 2000)
      }
    } catch (err) {
      console.error('Failed to apply threshold:', err)
      setApplyError(`Failed to apply threshold: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setApplying(null)
    }
  }

  // Check if a recommendation has been applied
  const isApplied = (rec: ThresholdRecommendation): boolean => {
    return appliedThresholds.has(`${rec.service_name}-${rec.alert_type}`)
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

  const exportMonthlySummaryPDF = () => {
    const doc = new jsPDF()
    const now = new Date()
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                        'July', 'August', 'September', 'October', 'November', 'December']
    const monthYear = `${monthNames[now.getMonth()]} ${now.getFullYear()}`
    
    // Header with gradient effect simulation
    doc.setFillColor(59, 130, 246) // Primary blue
    doc.rect(0, 0, 210, 45, 'F')
    
    // Title
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.text('Threshold Configuration', 105, 20, { align: 'center' })
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text(`Monthly Summary Report - ${monthYear}`, 105, 32, { align: 'center' })
    
    // Reset text color
    doc.setTextColor(0, 0, 0)
    
    // Report metadata
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Generated: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`, 14, 55)
    doc.text(`Report Period: ${monthYear}`, 14, 62)
    
    let yPos = 75
    
    // Executive Summary Section
    doc.setFontSize(16)
    doc.setTextColor(59, 130, 246)
    doc.setFont('helvetica', 'bold')
    doc.text('Executive Summary', 14, yPos)
    yPos += 10
    
    doc.setFontSize(11)
    doc.setTextColor(0, 0, 0)
    doc.setFont('helvetica', 'normal')
    
    const totalRecs = recommendations.length
    const appliedCount = appliedThresholds.size
    const pendingCount = totalRecs - appliedCount
    const highConfidence = recommendations.filter(r => r.confidence.toLowerCase() === 'high').length
    const avgAdjustment = recommendations.length > 0 
      ? recommendations.reduce((sum, r) => sum + Math.abs(r.adjustment_percentage), 0) / recommendations.length 
      : 0
    
    doc.text(`Total Recommendations: ${totalRecs}`, 20, yPos)
    yPos += 7
    doc.text(`Applied Changes: ${appliedCount}`, 20, yPos)
    yPos += 7
    doc.text(`Pending Recommendations: ${pendingCount}`, 20, yPos)
    yPos += 7
    doc.text(`High Confidence Recommendations: ${highConfidence}`, 20, yPos)
    yPos += 7
    doc.text(`Average Adjustment: ${avgAdjustment.toFixed(1)}%`, 20, yPos)
    yPos += 15
    
    // Recommendations by Category
    doc.setFontSize(16)
    doc.setTextColor(59, 130, 246)
    doc.setFont('helvetica', 'bold')
    doc.text('Recommendations by Category', 14, yPos)
    yPos += 8
    
    // Create table data for recommendations
    const tableData = recommendations.map(rec => {
      const isRecApplied = isApplied(rec)
      return [
        rec.service_name,
        rec.threshold_label || rec.alert_type,
        rec.category || 'N/A',
        formatValue(rec.current_threshold, rec.unit || ''),
        formatValue(rec.recommended_threshold, rec.unit || ''),
        `${rec.adjustment_percentage > 0 ? '+' : ''}${rec.adjustment_percentage.toFixed(1)}%`,
        rec.confidence,
        isRecApplied ? 'Applied' : 'Pending'
      ]
    })
    
    autoTable(doc, {
      startY: yPos,
      head: [['Service', 'Threshold', 'Category', 'Current', 'Recommended', 'Change', 'Confidence', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: { 
        fillColor: [59, 130, 246],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 30 },
        2: { cellWidth: 22 },
        3: { cellWidth: 20 },
        4: { cellWidth: 22 },
        5: { cellWidth: 18 },
        6: { cellWidth: 18 },
        7: { cellWidth: 18 }
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        // Color the status column
        if (data.column.index === 7 && data.section === 'body') {
          if (data.cell.raw === 'Applied') {
            data.cell.styles.textColor = [22, 163, 74] // green
            data.cell.styles.fontStyle = 'bold'
          } else {
            data.cell.styles.textColor = [234, 179, 8] // yellow
          }
        }
        // Color the confidence column
        if (data.column.index === 6 && data.section === 'body') {
          const conf = String(data.cell.raw).toLowerCase()
          if (conf === 'high') {
            data.cell.styles.textColor = [22, 163, 74]
          } else if (conf === 'medium') {
            data.cell.styles.textColor = [234, 179, 8]
          } else {
            data.cell.styles.textColor = [239, 68, 68]
          }
        }
      }
    })
    
    // Get final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50
    
    // Applied Changes History (if any)
    if (appliedThresholds.size > 0) {
      let historyY = finalY + 15
      
      // Check if we need a new page
      if (historyY > 250) {
        doc.addPage()
        historyY = 20
      }
      
      doc.setFontSize(16)
      doc.setTextColor(59, 130, 246)
      doc.setFont('helvetica', 'bold')
      doc.text('Applied Changes History', 14, historyY)
      historyY += 8
      
      const appliedData: string[][] = []
      appliedDetails.forEach((detail, key) => {
        const [service, alertType] = key.split('-')
        const rec = recommendations.find(r => r.service_name === service && r.alert_type === alertType)
        appliedData.push([
          service,
          rec?.threshold_label || alertType,
          String(detail.old),
          String(detail.new),
          new Date(detail.at).toLocaleDateString()
        ])
      })
      
      autoTable(doc, {
        startY: historyY,
        head: [['Service', 'Threshold', 'Previous Value', 'New Value', 'Applied Date']],
        body: appliedData,
        theme: 'striped',
        headStyles: { 
          fillColor: [22, 163, 74],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: { fontSize: 9 },
        margin: { left: 14, right: 14 }
      })
    }
    
    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(128, 128, 128)
      doc.text(
        `Page ${i} of ${pageCount} | Alert Agent System | Confidential`,
        105,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      )
    }
    
    // Save the PDF
    const filename = `threshold-monthly-summary-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}.pdf`
    doc.save(filename)
  }

  const [showExportMenu, setShowExportMenu] = useState(false)

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

  // Calculate statistics for overview
  const totalRecommendations = recommendations.length
  const highConfidenceCount = recommendations.filter(r => r.confidence.toLowerCase() === 'high').length
  const avgAdjustment = recommendations.length > 0 
    ? recommendations.reduce((sum, r) => sum + Math.abs(r.adjustment_percentage), 0) / recommendations.length 
    : 0
  const totalSamples = recommendations.reduce((sum, r) => sum + r.based_on_samples, 0)

  // Group recommendations by service
  const serviceGroups = recommendations.reduce((acc, rec) => {
    if (!acc[rec.service_name]) {
      acc[rec.service_name] = []
    }
    acc[rec.service_name].push(rec)
    return acc
  }, {} as Record<string, ThresholdRecommendation[]>)

  // Prepare radar chart data for confidence distribution
  const confidenceData = [
    { 
      category: 'High Confidence', 
      value: recommendations.filter(r => r.confidence.toLowerCase() === 'high').length,
      fullMark: recommendations.length 
    },
    { 
      category: 'Medium Confidence', 
      value: recommendations.filter(r => r.confidence.toLowerCase() === 'medium').length,
      fullMark: recommendations.length 
    },
    { 
      category: 'Low Confidence', 
      value: recommendations.filter(r => r.confidence.toLowerCase() === 'low').length,
      fullMark: recommendations.length 
    }
  ]

  // Prepare pie chart data for category distribution
  const categoryData = [
    { name: 'Error', value: recommendations.filter(r => r.category === 'error').length, color: '#ef4444' },
    { name: 'Performance', value: recommendations.filter(r => r.category === 'performance').length, color: '#f59e0b' },
    { name: 'Availability', value: recommendations.filter(r => r.category === 'availability').length, color: '#10b981' }
  ].filter(d => d.value > 0)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600"></div>
        <p className="text-gray-600 font-medium">Loading adaptive threshold intelligence...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Professional Header with Status Bar */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Brain className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Adaptive Threshold</h1>
            </div>
            <p className="text-primary-100 text-lg">
              Enterprise-grade threshold management powered by machine learning
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-medium">
                Last Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex gap-2">
              {/* <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                  autoRefresh 
                    ? 'bg-green-500 hover:bg-green-600' 
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span className="text-sm font-medium">
                  {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
                </span>
              </button> */}
              {/* <button
                onClick={loadData}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-sm font-medium">Refresh</span>
              </button> */}
              <div className="relative">
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={!config && recommendations.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-primary-600 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-sm font-medium">Export</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showExportMenu && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          exportMonthlySummaryPDF()
                          setShowExportMenu(false)
                        }}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors"
                      >
                        <FileText className="w-5 h-5 text-red-500" />
                        <div className="text-left">
                          <div className="font-medium">Monthly Summary (PDF)</div>
                          <div className="text-xs text-gray-500">Comprehensive PDF report</div>
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          exportConfig()
                          setShowExportMenu(false)
                        }}
                        disabled={!config}
                        className="flex items-center gap-3 w-full px-4 py-3 text-sm text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors disabled:opacity-50"
                      >
                        <Database className="w-5 h-5 text-blue-500" />
                        <div className="text-left">
                          <div className="font-medium">Config Data (JSON)</div>
                          <div className="text-xs text-gray-500">Raw configuration data</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Close export menu when clicking outside */}
      {showExportMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowExportMenu(false)}
        />
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Error Loading Data</h3>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Apply Success Notification */}
      {applySuccess && (
        <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-green-800">Threshold Applied Successfully</h3>
            <p className="text-green-700 text-sm mt-1">{applySuccess}</p>
          </div>
        </div>
      )}

      {/* Apply Error Notification */}
      {applyError && (
        <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Failed to Apply Threshold</h3>
            <p className="text-red-700 text-sm mt-1">{applyError}</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Overview Dashboard
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'recommendations'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Target className="w-5 h-5" />
              Recommendations
              {totalRecommendations > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">
                  {totalRecommendations}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('performance')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'performance'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <LineChart className="w-5 h-5" />
              Performance Metrics
            </button>
            <button
              onClick={() => setActiveTab('configuration')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'configuration'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-5 h-5" />
              Configuration
            </button>
          </nav>
        </div>
      </div>

      {/* Overview Dashboard Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Total Recommendations</h3>
                <Target className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalRecommendations}</p>
              <p className="text-xs text-gray-500 mt-2">Across {Object.keys(serviceGroups).length} services</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">High Confidence</h3>
                <Shield className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{highConfidenceCount}</p>
              <p className="text-xs text-gray-500 mt-2">
                {totalRecommendations > 0 ? ((highConfidenceCount / totalRecommendations) * 100).toFixed(1) : 0}% of total
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Avg Adjustment</h3>
                <TrendingUp className="w-5 h-5 text-yellow-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{avgAdjustment.toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-2">Mean threshold change</p>
            </div>

            <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600">Data Samples</h3>
                <Database className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{totalSamples.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-2">Historical data points analyzed</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            {categoryData.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-600" />
                  Threshold Category Distribution
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Confidence Distribution */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-600" />
                Confidence Level Analysis
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={confidenceData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis />
                  <Radar name="Recommendations" dataKey="value" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Service-wise Breakdown */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-primary-600" />
              Service-wise Threshold Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(serviceGroups).map(([serviceName, serviceRecs]) => {
                const highConf = serviceRecs.filter(r => r.confidence.toLowerCase() === 'high').length
                const avgAdj = serviceRecs.reduce((sum, r) => sum + Math.abs(r.adjustment_percentage), 0) / serviceRecs.length
                
                return (
                  <div key={serviceName} className="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-primary-600" />
                        {serviceName}
                      </h4>
                      <span className="px-2 py-1 text-xs font-bold bg-primary-100 text-primary-700 rounded-full">
                        {serviceRecs.length}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">High Confidence:</span>
                        <span className="font-semibold text-green-600">{highConf}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Avg Adjustment:</span>
                        <span className="font-semibold text-gray-900">{avgAdj.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Samples:</span>
                        <span className="font-semibold text-gray-900">
                          {serviceRecs.reduce((sum, r) => sum + r.based_on_samples, 0).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex flex-wrap gap-1">
                        {serviceRecs.map((rec, idx) => (
                          <span
                            key={idx}
                            className={`px-2 py-0.5 text-xs rounded-full ${
                              rec.category === 'error' ? 'bg-red-100 text-red-700' :
                              rec.category === 'performance' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}
                          >
                            {rec.alert_type}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Configuration Tab */}
      {activeTab === 'configuration' && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary-600" />
              Threshold Types & Configuration
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
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && recommendations.length > 0 && (() => {
        // Group recommendations by category
        const groupedByCategory = recommendations.reduce((acc, rec) => {
          const category = rec.category || (rec.alert_type === 'error' ? 'error' : rec.alert_type === 'latency' ? 'performance' : 'availability');
          if (!acc[category]) {
            acc[category] = [];
          }
          acc[category].push(rec);
          return acc;
        }, {} as Record<string, ThresholdRecommendation[]>);

        const categoryConfig = {
          error: { name: 'Error Thresholds', icon: AlertCircle, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
          performance: { name: 'Performance Thresholds', icon: Zap, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
          availability: { name: 'Availability Thresholds', icon: Activity, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
        };

        return (
          <div className="space-y-6">
            {Object.entries(groupedByCategory).map(([category, categoryRecs]) => {
              const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.error;
              const CategoryIcon = config.icon;

              return (
                <div key={category} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className={`px-6 py-4 border-b ${config.borderColor} ${config.bgColor}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CategoryIcon className={`w-5 h-5 ${config.color}`} />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {config.name}
                        </h3>
                        <span className="ml-2 px-3 py-1 text-xs font-bold rounded-full bg-white text-gray-700 shadow-sm">
                          {categoryRecs.length} recommendation{categoryRecs.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600">
                          Avg Confidence: 
                          <span className="ml-1 font-semibold">
                            {(categoryRecs.filter(r => r.confidence.toLowerCase() === 'high').length / categoryRecs.length * 100).toFixed(0)}% High
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Service
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Threshold Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current Value
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Recommended Value
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Impact
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Confidence
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categoryRecs.map((rec, index) => {
                          const formatValue = (value: number, unit: string) => {
                            if (unit === 'rate') {
                              return `${(value * 100).toFixed(1)}%`;
                            }
                            return `${value} ${unit}`;
                          };

                          const changeIcon = rec.adjustment_percentage > 0 ? TrendingUp : rec.adjustment_percentage < 0 ? TrendingDown : Activity;
                          const changeColor = rec.adjustment_percentage > 0 ? 'text-green-600 bg-green-50' : rec.adjustment_percentage < 0 ? 'text-red-600 bg-red-50' : 'text-gray-600 bg-gray-50';
                          const ChangeIcon = changeIcon;

                          return (
                            <tr
                              key={index}
                              className="hover:bg-blue-50 transition-colors"
                            >
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <Server className="w-4 h-4 text-gray-400" />
                                  <span className="text-sm font-semibold text-gray-900">{rec.service_name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-semibold text-gray-900">
                                  {rec.threshold_label || rec.alert_type}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {rec.based_on_samples.toLocaleString()} samples
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {isApplied(rec) ? (
                                    <div className="flex flex-col">
                                      <span className="text-sm text-green-600 font-mono font-bold">
                                        {formatValue(appliedDetails.get(`${rec.service_name}-${rec.alert_type}`)?.new ?? rec.recommended_threshold, rec.unit || '')}
                                      </span>
                                      <span className="text-xs text-gray-400 line-through">
                                        {formatValue(rec.current_threshold, rec.unit || '')}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-900 font-mono">
                                      {formatValue(rec.current_threshold, rec.unit || '')}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  {isApplied(rec) ? (
                                    <span className="text-sm text-gray-400 font-mono">
                                      {formatValue(rec.recommended_threshold, rec.unit || '')}
                                    </span>
                                  ) : (
                                    <span className="text-sm font-bold text-primary-600 font-mono">
                                      {formatValue(rec.recommended_threshold, rec.unit || '')}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${changeColor}`}>
                                  <ChangeIcon className="w-3 h-3" />
                                  <span className="text-xs font-bold">
                                    {rec.adjustment_percentage > 0 ? '+' : ''}{rec.adjustment_percentage.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs leading-5 font-semibold rounded-full ${getConfidenceColor(rec.confidence)}`}>
                                  {getConfidenceIcon(rec.confidence)}
                                  {rec.confidence}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setSelectedThreshold(rec)}
                                    className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                    title="View Details"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => applyRecommendation(rec)}
                                    disabled={applying === `${rec.service_name}-${rec.alert_type}` || isApplied(rec)}
                                    className={`p-1.5 rounded-lg transition-colors ${
                                      isApplied(rec)
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : applying === `${rec.service_name}-${rec.alert_type}`
                                          ? 'text-green-400 cursor-wait'
                                          : 'text-green-600 hover:bg-green-50'
                                    }`}
                                    title={isApplied(rec) ? "Already Applied" : "Apply Recommendation"}
                                  >
                                    {applying === `${rec.service_name}-${rec.alert_type}` ? (
                                      <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : isApplied(rec) ? (
                                      <CheckCircle className="w-4 h-4" />
                                    ) : (
                                      <Check className="w-4 h-4" />
                                    )}
                                  </button>
                                  {/* <button
                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Reject Recommendation"
                                  >
                                    <XCircle className="w-4 h-4" />
                                  </button> */}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {categoryRecs.some(rec => rec.rationale) && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <details className="text-sm">
                        <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                          View Detailed Rationale
                        </summary>
                        <div className="mt-3 space-y-2">
                          {categoryRecs.map((rec, idx) => (
                            rec.rationale && (
                              <div key={idx} className="pl-4 border-l-2 border-gray-300">
                                <div className="font-medium text-gray-900">{rec.service_name} - {rec.threshold_label || rec.alert_type}:</div>
                                <div className="text-gray-600 mt-1">{rec.rationale}</div>
                                <div className="text-xs text-gray-500 mt-1">Based on {rec.based_on_samples} samples</div>
                              </div>
                            )
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Performance Metrics Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Threshold Comparison Chart */}
          {chartData.length > 0 && (
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary-600" />
                  Error Threshold Comparison Analysis
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Info className="w-4 h-4" />
                  <span>Current vs ML-Recommended Values</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="service" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    label={{ value: 'Threshold Value', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="current" fill="#ef4444" name="Current Threshold" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recommended" fill="#0ea5e9" name="Recommended" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Adjustment Distribution */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary-600" />
              Threshold Adjustment Distribution
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart
                data={recommendations.map((rec, idx) => ({
                  index: idx + 1,
                  adjustment: rec.adjustment_percentage,
                  service: rec.service_name.substring(0, 15)
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="index" 
                  label={{ value: 'Recommendation Index', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  label={{ value: 'Adjustment %', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                          <p className="font-semibold text-gray-900">{payload[0].payload.service}</p>
                          <p className="text-sm text-gray-600">
                            Adjustment: <span className="font-bold">{payload[0].value}%</span>
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="adjustment" 
                  stroke="#0ea5e9" 
                  fill="#0ea5e9" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Sample Size Analysis */}
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-primary-600" />
              Data Quality & Sample Size Analysis
            </h3>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={recommendations.slice(0, 10).map(rec => ({
                  service: rec.service_name.replace('-service', ''),
                  samples: rec.based_on_samples,
                  confidence: rec.confidence.toLowerCase() === 'high' ? 3 : rec.confidence.toLowerCase() === 'medium' ? 2 : 1
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="service" 
                  angle={-45} 
                  textAnchor="end" 
                  height={100}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  yAxisId="left"
                  label={{ value: 'Sample Count', angle: -90, position: 'insideLeft' }}
                />
                <YAxis 
                  yAxisId="right" 
                  orientation="right"
                  label={{ value: 'Confidence Level', angle: 90, position: 'insideRight' }}
                  domain={[0, 3]}
                  ticks={[1, 2, 3]}
                  tickFormatter={(value) => value === 3 ? 'High' : value === 2 ? 'Med' : 'Low'}
                />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="samples" fill="#8b5cf6" name="Samples" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="confidence" fill="#10b981" name="Confidence" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Current Configuration by Service */}
      {/* {config && (
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
      )} */}

      {/* Enhanced Threshold Detail Modal */}
      {selectedThreshold && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden animate-fade-in">
            {/* Modal Header with Gradient */}
            <div className="px-6 py-5 bg-gradient-to-r from-primary-600 to-primary-800 text-white">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      selectedThreshold.category === 'error' ? 'bg-red-500' :
                      selectedThreshold.category === 'performance' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}>
                      {selectedThreshold.category.toUpperCase()}
                    </span>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                      selectedThreshold.confidence.toLowerCase() === 'high' ? 'bg-green-500' :
                      selectedThreshold.confidence.toLowerCase() === 'medium' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}>
                      {selectedThreshold.confidence.toUpperCase()} CONFIDENCE
                    </span>
                  </div>
                  <h2 className="text-2xl font-bold">
                    {selectedThreshold.threshold_label || selectedThreshold.alert_type}
                  </h2>
                  <div className="flex items-center gap-2 mt-2 text-primary-100">
                    <Server className="w-4 h-4" />
                    <span className="font-mono text-sm">
                      {selectedThreshold.service_name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedThreshold(null)}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors"
                  aria-label="Close threshold details"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 space-y-6 max-h-[calc(90vh-200px)] overflow-y-auto">
              {/* Description Card */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">Description</h3>
                    <p className="text-sm text-blue-800">
                      {selectedThreshold.description || 'No description available for this threshold.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Current vs Recommended - Enhanced */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`rounded-xl border-2 p-4 shadow-sm ${
                  isApplied(selectedThreshold) 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4 text-gray-600" />
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                      {isApplied(selectedThreshold) ? 'Active (Applied)' : 'Current'}
                    </div>
                  </div>
                  <div className={`text-2xl font-bold font-mono ${isApplied(selectedThreshold) ? 'text-green-700' : 'text-gray-900'}`}>
                    {isApplied(selectedThreshold) ? (
                      selectedThreshold.unit === 'rate'
                        ? `${((appliedDetails.get(`${selectedThreshold.service_name}-${selectedThreshold.alert_type}`)?.new ?? selectedThreshold.recommended_threshold) * 100).toFixed(1)}%`
                        : `${appliedDetails.get(`${selectedThreshold.service_name}-${selectedThreshold.alert_type}`)?.new ?? selectedThreshold.recommended_threshold} ${selectedThreshold.unit}`
                    ) : (
                      selectedThreshold.unit === 'rate'
                        ? `${(selectedThreshold.current_threshold * 100).toFixed(1)}%`
                        : `${selectedThreshold.current_threshold} ${selectedThreshold.unit}`
                    )}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isApplied(selectedThreshold) ? (
                      <span className="text-green-600">
                        Was: {selectedThreshold.unit === 'rate' 
                          ? `${(selectedThreshold.current_threshold * 100).toFixed(1)}%`
                          : `${selectedThreshold.current_threshold} ${selectedThreshold.unit}`}
                      </span>
                    ) : 'Active threshold'}
                  </div>
                </div>
                <div className={`rounded-xl border-2 p-4 shadow-md ${
                  isApplied(selectedThreshold)
                    ? 'border-gray-300 bg-gray-100'
                    : 'border-primary-500 bg-gradient-to-br from-primary-50 to-primary-100'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className={`w-4 h-4 ${isApplied(selectedThreshold) ? 'text-gray-500' : 'text-primary-700'}`} />
                    <div className={`text-xs font-bold uppercase tracking-wide ${isApplied(selectedThreshold) ? 'text-gray-500' : 'text-primary-700'}`}>
                      Recommended
                    </div>
                  </div>
                  <div className={`text-2xl font-bold font-mono ${isApplied(selectedThreshold) ? 'text-gray-500' : 'text-primary-900'}`}>
                    {selectedThreshold.unit === 'rate'
                      ? `${(selectedThreshold.recommended_threshold * 100).toFixed(1)}%`
                      : `${selectedThreshold.recommended_threshold} ${selectedThreshold.unit}`}
                  </div>
                  <div className={`text-xs mt-1 ${isApplied(selectedThreshold) ? 'text-gray-400' : 'text-primary-700'}`}>
                    {isApplied(selectedThreshold) ? 'Already applied' : 'AI-optimized value'}</div>
                </div>
                <div className={`rounded-xl border-2 p-4 shadow-sm ${
                  selectedThreshold.adjustment_percentage > 0 
                    ? 'border-green-300 bg-green-50' 
                    : selectedThreshold.adjustment_percentage < 0 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-300 bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {selectedThreshold.adjustment_percentage > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : selectedThreshold.adjustment_percentage < 0 ? (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    ) : (
                      <Activity className="w-4 h-4 text-gray-600" />
                    )}
                    <div className={`text-xs font-bold uppercase tracking-wide ${
                      selectedThreshold.adjustment_percentage > 0 ? 'text-green-700' :
                      selectedThreshold.adjustment_percentage < 0 ? 'text-red-700' : 'text-gray-600'
                    }`}>
                      Impact
                    </div>
                  </div>
                  <div className={`text-2xl font-bold font-mono ${
                    selectedThreshold.adjustment_percentage > 0 ? 'text-green-900' :
                    selectedThreshold.adjustment_percentage < 0 ? 'text-red-900' : 'text-gray-900'
                  }`}>
                    {selectedThreshold.adjustment_percentage > 0 ? '+' : ''}
                    {selectedThreshold.adjustment_percentage.toFixed(1)}%
                  </div>
                  <div className={`text-xs mt-1 ${
                    selectedThreshold.adjustment_percentage > 0 ? 'text-green-700' :
                    selectedThreshold.adjustment_percentage < 0 ? 'text-red-700' : 'text-gray-500'
                  }`}>
                    {Math.abs(selectedThreshold.adjustment_percentage) < 5 ? 'Minor adjustment' :
                     Math.abs(selectedThreshold.adjustment_percentage) < 20 ? 'Moderate change' :
                     'Significant change'}
                  </div>
                </div>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-purple-600" />
                    <div className="text-xs font-medium text-gray-600">Samples</div>
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {selectedThreshold.based_on_samples.toLocaleString()}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-green-600" />
                    <div className="text-xs font-medium text-gray-600">Confidence</div>
                  </div>
                  <div className={`text-lg font-bold ${
                    selectedThreshold.confidence.toLowerCase() === 'high' ? 'text-green-600' :
                    selectedThreshold.confidence.toLowerCase() === 'medium' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {selectedThreshold.confidence}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-blue-600" />
                    <div className="text-xs font-medium text-gray-600">Type</div>
                  </div>
                  <div className="text-sm font-bold text-gray-900 capitalize">
                    {selectedThreshold.alert_type}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="w-4 h-4 text-orange-600" />
                    <div className="text-xs font-medium text-gray-600">Unit</div>
                  </div>
                  <div className="text-sm font-bold text-gray-900">
                    {selectedThreshold.unit || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Calculation Methodology */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-sm font-bold text-purple-900 mb-3 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  Calculation Methodology
                </h3>
                {selectedThreshold.alert_type === 'error' && (
                  <div className="text-sm text-purple-900 space-y-3">
                    <div className="bg-white/50 rounded p-3">
                      <p className="font-semibold mb-2">Statistical Formula:</p>
                      <code className="block bg-purple-900 text-purple-100 px-3 py-2 rounded font-mono text-xs">
                        recommended = max(mean + k × σ, P₇₅)
                      </code>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/50 rounded p-2">
                        <div className="font-semibold text-xs text-purple-700">Mean (μ)</div>
                        <div className="text-xs">Average error count per alert</div>
                      </div>
                      <div className="bg-white/50 rounded p-2">
                        <div className="font-semibold text-xs text-purple-700">Std Dev (σ)</div>
                        <div className="text-xs">Error count variance</div>
                      </div>
                      <div className="bg-white/50 rounded p-2">
                        <div className="font-semibold text-xs text-purple-700">Sensitivity (k)</div>
                        <div className="text-xs">Factor: 1.5, 2.0, or 2.5</div>
                      </div>
                      <div className="bg-white/50 rounded p-2">
                        <div className="font-semibold text-xs text-purple-700">Percentile (P₇₅)</div>
                        <div className="text-xs">75th percentile baseline</div>
                      </div>
                    </div>
                  </div>
                )}
                {selectedThreshold.alert_type === 'availability' && (
                  <div className="text-sm text-purple-900 space-y-3">
                    <div className="bg-white/50 rounded p-3">
                      <p className="font-semibold mb-2">Percentile-Based Analysis:</p>
                      <code className="block bg-purple-900 text-purple-100 px-3 py-2 rounded font-mono text-xs">
                        recommended = clamp(P₉₀, 0.30, 0.80)
                      </code>
                    </div>
                    <ul className="space-y-2 text-xs">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Calculates 90th percentile of error rates</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Bounded between 30% and 80% for stability</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        <span>Precision: 2 decimal places</span>
                      </li>
                    </ul>
                  </div>
                )}
                {selectedThreshold.alert_type !== 'error' &&
                  selectedThreshold.alert_type !== 'availability' && (
                    <p className="text-sm text-purple-900">
                      This threshold uses advanced service-specific statistical analysis combining historical patterns,
                      false positive rates, and adaptive learning to optimize alert sensitivity.
                    </p>
                  )}
              </div>

              {/* Detailed Rationale */}
              {selectedThreshold.rationale && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-gray-600" />
                    Detailed Analysis & Rationale
                  </h3>
                  <div className="bg-white rounded border border-gray-300 p-3">
                    <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">
                      {selectedThreshold.rationale}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Based on {selectedThreshold.based_on_samples.toLocaleString()} historical data points
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedThreshold(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => applyRecommendation(selectedThreshold)}
                  disabled={applying === `${selectedThreshold.service_name}-${selectedThreshold.alert_type}` || isApplied(selectedThreshold)}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 ${
                    isApplied(selectedThreshold)
                      ? 'bg-gray-400 cursor-not-allowed'
                      : applying === `${selectedThreshold.service_name}-${selectedThreshold.alert_type}`
                        ? 'bg-green-400 cursor-wait'
                        : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {applying === `${selectedThreshold.service_name}-${selectedThreshold.alert_type}` ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Applying...
                    </>
                  ) : isApplied(selectedThreshold) ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Applied
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Apply Recommendation
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ThresholdConfig

