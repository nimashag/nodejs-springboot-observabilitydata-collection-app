import { format } from 'date-fns';
import LogLevelBadge from './LogLevelBadge';
import type { StructuredLog } from '../../types/logAggregation.types';

interface LogCardProps {
  log: StructuredLog;
  onClick?: () => void;
}

export default function LogCard({ log, onClick }: LogCardProps) {
  const formattedTime = format(new Date(log.timestamp), 'MMM dd, yyyy HH:mm:ss');

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer ${
        onClick ? '' : 'cursor-default'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-3">
          <LogLevelBadge level={log.level} />
          <span className="text-sm font-medium text-gray-900">{log.service}</span>
          {log.piiRedacted && (
            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              PII Redacted
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{formattedTime}</span>
      </div>
      <div className="mb-2">
        <span className="text-sm font-semibold text-gray-700">{log.event}</span>
      </div>
      <div className="text-sm text-gray-600 truncate">{log.raw}</div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {log.traceId && (
          <span className="text-blue-600 font-mono">
            Trace: {log.traceId.substring(0, 8)}...
          </span>
        )}
        {log.spanId && (
          <span className="text-purple-600 font-mono">
            Span: {log.spanId.substring(0, 8)}...
          </span>
        )}
        {log.requestId && (
          <span className="text-green-600 font-mono">
            Request: {log.requestId.substring(0, 8)}...
          </span>
        )}
        {log.sessionId && (
          <span className="text-orange-600 font-mono">
            Session: {log.sessionId.substring(0, 8)}...
          </span>
        )}
      </div>
    </div>
  );
}

