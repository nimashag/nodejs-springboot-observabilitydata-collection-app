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
      {log.traceId && (
        <div className="mt-2 text-xs text-blue-600">
          Trace: {log.traceId.substring(0, 8)}...
        </div>
      )}
    </div>
  );
}

