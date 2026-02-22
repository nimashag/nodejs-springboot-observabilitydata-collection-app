import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { NotificationToast } from './components/NotificationToast'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AlertData from './pages/AlertData'
import ThresholdConfig from './pages/ThresholdConfig'
import MLAnalytics from './pages/MLAnalytics'
import AlertIntelligence from './pages/AlertIntelligence'
import AlertPrioritization from './pages/AlertPrioritization'
import ServiceHealthTrends from './pages/ServiceHealthTrends'
import Correlations from './pages/Correlations'
import Settings from './pages/Settings'

function App() {
  return (
    <AppProvider>
      <Router>
        <NotificationToast />
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/alert-data" element={<AlertData />} />
            <Route path="/threshold-config" element={<ThresholdConfig />} />
            <Route path="/alert-intelligence" element={<AlertIntelligence />} />
            <Route path="/alert-prioritization" element={<AlertPrioritization />} />
            <Route path="/ml-analytics" element={<MLAnalytics />} />
            <Route path="/service-health" element={<ServiceHealthTrends />} />
            <Route path="/correlations" element={<Correlations />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Layout>
      </Router>
    </AppProvider>
  )
}

export default App

