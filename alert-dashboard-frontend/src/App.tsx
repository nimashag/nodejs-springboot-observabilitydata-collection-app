import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import AlertData from './pages/AlertData'
import ThresholdConfig from './pages/ThresholdConfig'
import MLAnalytics from './pages/MLAnalytics'
import HistoricalAnalysis from './pages/HistoricalAnalysis'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/alert-data" element={<AlertData />} />
          <Route path="/threshold-config" element={<ThresholdConfig />} />
          <Route path="/ml-analytics" element={<MLAnalytics />} />
          <Route path="/historical-analysis" element={<HistoricalAnalysis />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

