import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import LogsViewer from './pages/LogsViewer';
import TraceView from './pages/TraceView';
import TemplatesPage from './pages/TemplatesPage';
import Analytics from './pages/Analytics';

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/logs" element={<LogsViewer />} />
          <Route path="/traces/:traceId" element={<TraceView />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/analytics" element={<Analytics />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;

