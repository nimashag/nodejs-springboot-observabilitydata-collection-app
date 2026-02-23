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
      className={`group relative bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-850 rounded-xl border border-gray-200/80 dark:border-gray-700/80 hover:border-indigo-300 dark:hover:border-indigo-600/50 hover:shadow-xl hover:shadow-indigo-100/50 dark:hover:shadow-indigo-900/20 transition-all duration-300 overflow-hidden ${
        onClick ? "cursor-pointer" : "cursor-default"
      }`}
      onClick={onClick}
    >
      {/* Accent bar based on log level */}
      <div
        className={`absolute top-0 left-0 w-1 h-full ${
          log.level.toLowerCase() === "error"
            ? "bg-gradient-to-b from-red-500 to-red-600"
            : log.level.toLowerCase() === "warn"
              ? "bg-gradient-to-b from-amber-500 to-amber-600"
              : log.level.toLowerCase() === "info"
                ? "bg-gradient-to-b from-blue-500 to-cyan-600"
                : "bg-gradient-to-b from-slate-400 to-slate-500"
        }`}
      />

      {/* Header Section */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-gray-200/60 dark:border-gray-700/60">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <LogLevelBadge level={log.level} size="md" />

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center space-x-2.5">
              <span className="text-sm font-bold text-gray-900 dark:text-white truncate bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text">
                {log.service}
              </span>
              {log.piiRedacted && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-gradient-to-r from-purple-100 to-fuchsia-100 dark:from-purple-900/40 dark:to-fuchsia-900/40 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/50 shadow-sm">
                  PII
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
              {formattedDate} · {formattedTimeOnly}
            </span>
          </div>
        </div>

        <button
          onClick={(e) => copyToClipboard(log.raw, e)}
          className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
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
      <div className="px-5 py-2.5 bg-gradient-to-r from-slate-50/50 to-gray-50/30 dark:from-slate-900/30 dark:to-gray-900/20">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 shadow-sm shadow-blue-300 dark:shadow-blue-900/50"></span>
            <span className="bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text">
              {log.event}
            </span>
          </span>
          {onClick && (
            <ExternalLink className="w-4 h-4 text-indigo-400 dark:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>

      {/* Message Section */}
      <div className="px-5 py-3.5">
        <pre className="text-sm text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap break-words line-clamp-2 leading-relaxed">
          {log.raw}
        </pre>
      </div>

      {/* Footer with IDs */}
      {(log.traceId || log.spanId || log.requestId || log.sessionId) && (
        <div className="px-5 pb-4 pt-2 flex flex-wrap gap-2">
          {log.traceId && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50 rounded-lg border border-blue-200/70 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-xs font-bold text-blue-700 dark:text-blue-300">
                Trace
              </span>
              <code className="text-xs text-blue-600 dark:text-blue-400 font-mono font-semibold">
                {log.traceId.substring(0, 12)}...
              </code>
            </div>
          )}
          {log.spanId && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gradient-to-r from-purple-50 to-fuchsia-50 dark:from-purple-950/50 dark:to-fuchsia-950/50 rounded-lg border border-purple-200/70 dark:border-purple-800/50 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
                Span
              </span>
              <code className="text-xs text-purple-600 dark:text-purple-400 font-mono font-semibold">
                {log.spanId.substring(0, 12)}...
              </code>
            </div>
          )}
          {log.requestId && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 rounded-lg border border-emerald-200/70 dark:border-emerald-800/50 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                Request
              </span>
              <code className="text-xs text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                {log.requestId.substring(0, 12)}...
              </code>
            </div>
          )}
          {log.sessionId && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/50 dark:to-amber-950/50 rounded-lg border border-orange-200/70 dark:border-orange-800/50 shadow-sm hover:shadow-md transition-shadow">
              <span className="text-xs font-bold text-orange-700 dark:text-orange-300">
                Session
              </span>
              <code className="text-xs text-orange-600 dark:text-orange-400 font-mono font-semibold">
                {log.sessionId.substring(0, 12)}...
              </code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
