import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTrace, getRootCause } from '../api/logAggregationApi';
import type { StructuredLog, RootCauseAnalysis } from '../types/logAggregation.types';
import LogCard from '../components/logComponents/LogCard';
import LogDetailModal from '../components/logComponents/LogDetailModal';
import { format } from 'date-fns';

export default function TraceView() {
  const { traceId } = useParams<{ traceId: string }>();
  const [logs, setLogs] = useState<StructuredLog[]>([]);
  const [rootCause, setRootCause] = useState<RootCauseAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<StructuredLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (traceId) {
      loadTraceData();
    }
  }, [traceId]);

  const loadTraceData = async () => {
    if (!traceId) return;
    
    try {
      setLoading(true);
      const [traceLogs, rootCauseData] = await Promise.all([
        getTrace(traceId),
        getRootCause(traceId).catch(() => null),
      ]);
      setLogs(traceLogs);
      setRootCause(rootCauseData);
    } catch (error) {
      console.error('Error loading trace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogClick = (log: StructuredLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  // Group logs by service
  const logsByService = logs.reduce((acc, log) => {
    if (!acc[log.service]) {
      acc[log.service] = [];
    }
    acc[log.service].push(log);
    return acc;
  }, {} as Record<string, StructuredLog[]>);

  // Sort logs by timestamp
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Trace View</h1>
            <p className="text-sm text-gray-600 mt-1">
              Trace ID: <span className="font-mono text-blue-600">{traceId}</span>
            </p>
          </div>
          <Link
            to="/logs"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Logs
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading trace data...</div>
      ) : (
        <>
          {rootCause && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-semibold text-yellow-900 mb-2">
                Root Cause Analysis
              </h3>
              <p className="text-sm text-yellow-800">{rootCause.rootCause}</p>
              {rootCause.errorLogs.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-medium text-yellow-900 mb-2">
                    Error Logs ({rootCause.errorLogs.length}):
                  </p>
                  <div className="space-y-2">
                    {rootCause.errorLogs.map((log, index) => (
                      <div
                        key={index}
                        className="bg-white rounded p-2 text-xs"
                        onClick={() => handleLogClick(log)}
                      >
                        <span className="font-medium">{log.service}</span> - {log.event}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Timeline ({sortedLogs.length} logs)
            </h2>
            <div className="space-y-4">
              {sortedLogs.map((log, index) => (
                <div key={`${log.timestamp}-${index}`} className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-12 text-center">
                    <div className="text-xs text-gray-500">
                      {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                    </div>
                    {index < sortedLogs.length - 1 && (
                      <div className="w-0.5 h-8 bg-gray-300 mx-auto mt-1" />
                    )}
                  </div>
                  <div className="flex-1">
                    <LogCard log={log} onClick={() => handleLogClick(log)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Logs by Service
            </h2>
            <div className="space-y-6">
              {Object.entries(logsByService).map(([service, serviceLogs]) => (
                <div key={service}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">
                    {service} ({serviceLogs.length} logs)
                  </h3>
                  <div className="space-y-2">
                    {serviceLogs.map((log, index) => (
                      <LogCard
                        key={`${log.timestamp}-${index}`}
                        log={log}
                        onClick={() => handleLogClick(log)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <LogDetailModal
        log={selectedLog}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

