import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { NotificationToast } from './components/alerts/NotificationToast'
import Layout from './components/Layout'

// Metrics pages
import MetricsSubpart1 from './pages/metrics/Subpart1'
import MetricsSubpart2 from './pages/metrics/Subpart2'
import MetricsSubpart3 from './pages/metrics/Subpart3'

// Logs pages
import LogsDashboard from './pages/logs/LogsDashboard'
import LogsViewer from './pages/logs/LogsViewer'
import TraceView from './pages/logs/TraceView'
import TemplatesPage from './pages/logs/TemplatesPage'
import Analytics from './pages/logs/Analytics'

// Main Dashboard
import MainDashboard from './pages/Dashboard'

// Alerts pages
import AlertData from './pages/alerts/AlertData'
import AlertsDashboard from './pages/alerts/Dashboard'
import AlertIntelligence from './pages/alerts/AlertIntelligence'
import AlertPrioritization from './pages/alerts/AlertPrioritization'
import ServiceHealthTrends from './pages/alerts/ServiceHealthTrends'
import Settings from './pages/alerts/Settings'
import ThresholdConfig from './pages/alerts/ThresholdConfig'
import Correlations from './pages/alerts/Correlations'

// Anomalies pages
import AnomaliesSubpart1 from './pages/anomalies/Subpart1'
import AnomaliesSubpart2 from './pages/anomalies/Subpart2'
import AnomaliesSubpart3 from './pages/anomalies/Subpart3'

function App() {
  return (
    <AppProvider>
      <Router>
        <NotificationToast />
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<MainDashboard />} />
            
            {/* Metrics routes */}
            <Route path="/metrics/subpart1" element={<MetricsSubpart1 />} />
            <Route path="/metrics/subpart2" element={<MetricsSubpart2 />} />
            <Route path="/metrics/subpart3" element={<MetricsSubpart3 />} />
            
            {/* Logs routes */}
            <Route path="/logs/dashboard" element={<LogsDashboard />} />
            <Route path="/logs/subpart1" element={<LogsViewer />} />
            <Route path="/logs/subpart2" element={<TemplatesPage />} />
            <Route path="/logs/subpart3" element={<Analytics />} />
            <Route path="/logs/traces/:traceId" element={<TraceView />} />
            
            {/* Alerts routes */}
            <Route path="/alerts/dashboard" element={<AlertsDashboard />} />
            <Route path="/alerts/data" element={<AlertData />} />
            <Route path="/alerts/intelligence" element={<AlertIntelligence />} />
            <Route path="/alerts/prioritization" element={<AlertPrioritization />} />
            <Route path="/alerts/health-trends" element={<ServiceHealthTrends />} />
            <Route path="/alerts/threshold-config" element={<ThresholdConfig />} />
            <Route path="/alerts/correlations" element={<Correlations />} />
            <Route path="/alerts/settings" element={<Settings />} />
            
            {/* Anomalies routes */}
            <Route path="/anomalies/subpart1" element={<AnomaliesSubpart1 />} />
            <Route path="/anomalies/subpart2" element={<AnomaliesSubpart2 />} />
            <Route path="/anomalies/subpart3" element={<AnomaliesSubpart3 />} />
            
            {/* Redirect unknown routes to dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  )
}

export default App
