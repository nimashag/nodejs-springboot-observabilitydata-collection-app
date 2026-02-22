import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'

// Metrics pages
import MetricsSubpart1 from './pages/metrics/Subpart1'
import MetricsSubpart2 from './pages/metrics/Subpart2'
import MetricsSubpart3 from './pages/metrics/Subpart3'

// Logs pages
import LogsViewer from './pages/logs/LogsViewer'
import TraceView from './pages/logs/TraceView'
import TemplatesPage from './pages/logs/TemplatesPage'
import Analytics from './pages/logs/Analytics'

// Alerts pages
import AlertsSubpart1 from './pages/alerts/Subpart1'
import AlertsSubpart2 from './pages/alerts/Subpart2'
import AlertsSubpart3 from './pages/alerts/Subpart3'

// Anomalies pages
import AnomaliesSubpart1 from './pages/anomalies/Subpart1'
import AnomaliesSubpart2 from './pages/anomalies/Subpart2'
import AnomaliesSubpart3 from './pages/anomalies/Subpart3'

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            
            {/* Metrics routes */}
            <Route path="/metrics/subpart1" element={<MetricsSubpart1 />} />
            <Route path="/metrics/subpart2" element={<MetricsSubpart2 />} />
            <Route path="/metrics/subpart3" element={<MetricsSubpart3 />} />
            
            {/* Logs routes */}
            <Route path="/logs/subpart1" element={<LogsViewer />} />
            <Route path="/logs/subpart2" element={<TemplatesPage />} />
            <Route path="/logs/subpart3" element={<Analytics />} />
            <Route path="/logs/traces/:traceId" element={<TraceView />} />
            
            {/* Alerts routes */}
            <Route path="/alerts/subpart1" element={<AlertsSubpart1 />} />
            <Route path="/alerts/subpart2" element={<AlertsSubpart2 />} />
            <Route path="/alerts/subpart3" element={<AlertsSubpart3 />} />
            
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
