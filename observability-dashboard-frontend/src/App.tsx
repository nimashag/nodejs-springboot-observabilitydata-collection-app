import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import { NotificationToast } from './components/alerts/NotificationToast'
import Layout from './components/Layout'

// Metrics pages
import MetricOverview from "./pages/metrics/metric-agent/Overview";
import MetricSignals from "./pages/metrics/metric-agent/Signals";
import MetricKpiCoverage from "./pages/metrics/metric-agent/KpiCoverage";
import MetricUpdatePlan from "./pages/metrics/metric-agent/UpdatePlan";
import MetricPromSuggestions from "./pages/metrics/metric-agent/PromSuggestions";
import MetricSettings from "./pages/metrics/metric-agent/Settings";

// Logs pages
import LogsDashboard from './pages/logs/LogsDashboard'
import LogsViewer from './pages/logs/LogsViewer'
import LogMetadataAnalyzer from './pages/logs/LogMetadataAnalyzer'
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

import MetricSettingsWrapper from "./pages/metrics/metric-agent/MetricSettingsWrapper";

function App() { 
  
  const metricAgentSettings = {
  pollingEnabled: true,
  intervals: {
    healthMs: 3000,
    signalsMs: 2500,
    kpiMs: 5000,
    planMs: 9000,
    promMs: 12000,
  },
  ui: { defaultPromView: "raw" as const },
};
  return (
    <AppProvider>
      <Router>
        <NotificationToast />
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<MainDashboard />} />
            
            {/* Metrics routes */}
            <Route path="/metrics" element={<Navigate to="/metrics/overview" replace />} />
            <Route path="/metrics/overview" element={<MetricOverview settings={metricAgentSettings} />} />
            <Route path="/metrics/signals" element={<MetricSignals settings={metricAgentSettings} />} />
            <Route path="/metrics/kpi-coverage" element={<MetricKpiCoverage settings={metricAgentSettings} />} />
            <Route path="/metrics/update-plan" element={<MetricUpdatePlan settings={metricAgentSettings} />} />
            <Route path="/metrics/prom-suggestions" element={<MetricPromSuggestions settings={metricAgentSettings} />} />
            <Route path="/metrics/settings" element={<MetricSettingsWrapper />} />
            
            {/* Logs routes */}
            <Route path="/logs/dashboard" element={<LogsDashboard />} />
            <Route path="/logs/subpart1" element={<LogsViewer />} />
            <Route path="/logs/metadata-analyzer" element={<LogMetadataAnalyzer />} />
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
