import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/layout/Layout';
import LogsViewer from './pages/LogsViewer';
import LogsDashboard from './pages/LogsDashboard';
import LogMetadataAnalyzer from './pages/LogMetadataAnalyzer';
import TraceView from './pages/TraceView';
import TemplatesPage from './pages/TemplatesPage';
import Analytics from './pages/Analytics';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/logs/dashboard" replace />} />
            <Route path="/logs" element={<LogsViewer />} />
            <Route path="/logs/dashboard" element={<LogsDashboard />} />
            <Route path="/logs/metadata" element={<LogMetadataAnalyzer />} />
            <Route path="/traces/:traceId" element={<TraceView />} />
            <Route path="/templates" element={<TemplatesPage />} />
            <Route path="/analytics" element={<Analytics />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;

