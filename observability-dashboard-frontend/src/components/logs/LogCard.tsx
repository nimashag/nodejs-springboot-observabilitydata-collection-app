import { format } from "date-fns";
import { ExternalLink, Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import LogLevelBadge from "./LogLevelBadge";
import type { StructuredLog } from "../../types/logs/logAggregation.types";

interface LogCardProps {
  log: StructuredLog;
  onClick?: () => void;
}

export default function LogCard({ log, onClick }: LogCardProps) {
  const [copied, setCopied] = useState(false);
  const formattedTime = format(
    new Date(log.timestamp),
    "MMM dd, yyyy HH:mm:ss.SSS",
  );
  const formattedDate = format(new Date(log.timestamp), "MMM dd, yyyy");
  const formattedTimeOnly = format(new Date(log.timestamp), "HH:mm:ss.SSS");

  const copyToClipboard = async (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div
      className={`group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg transition-all duration-200 ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
      onClick={onClick}
    >
      {/* Header Section */}
      <div className="flex items-start justify-between px-4 pt-3 pb-2 border-b border-gray-100 dark:border-gray-700/50">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <LogLevelBadge level={log.level} />

          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {log.service}
              </span>
              {log.piiRedacted && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  🔒 PII Redacted
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {formattedDate} · {formattedTimeOnly}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => copyToClipboard(log.raw, e)}
          className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all"
          title="Copy log message"
        >
          {copied ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Event Section */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
            <span>{log.event}</span>
          </span>
          {onClick && (
            <ExternalLink className="w-3.5 h-3.5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {/* Message Section */}
      <div className="px-4 py-3">
        <pre className="text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap break-words line-clamp-2 leading-relaxed">
          {log.raw}
        </pre>
      </div>

      {/* Footer with IDs */}
      {(log.traceId || log.spanId || log.requestId || log.sessionId) && (
        <div className="px-4 pb-3 pt-2 flex flex-wrap gap-2">
          {log.traceId && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                Trace:
              </span>
              <code className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                {log.traceId.substring(0, 12)}...
              </code>
            </div>
          )}
          {log.spanId && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-purple-50 dark:bg-purple-900/20 rounded border border-purple-200 dark:border-purple-800">
              <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                Span:
              </span>
              <code className="text-xs text-purple-600 dark:text-purple-400 font-mono">
                {log.spanId.substring(0, 12)}...
              </code>
            </div>
          )}
          {log.requestId && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
              <span className="text-xs font-medium text-green-700 dark:text-green-300">
                Request:
              </span>
              <code className="text-xs text-green-600 dark:text-green-400 font-mono">
                {log.requestId.substring(0, 12)}...
              </code>
            </div>
          )}
          {log.sessionId && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-orange-50 dark:bg-orange-900/20 rounded border border-orange-200 dark:border-orange-800">
              <span className="text-xs font-medium text-orange-700 dark:text-orange-300">
                Session:
              </span>
              <code className="text-xs text-orange-600 dark:text-orange-400 font-mono">
                {log.sessionId.substring(0, 12)}...
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
