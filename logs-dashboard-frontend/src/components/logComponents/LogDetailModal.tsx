import { Fragment, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import LogLevelBadge from "./LogLevelBadge";
import type { StructuredLog } from "../../types/logAggregation.types";

interface LogDetailModalProps {
  log: StructuredLog | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LogDetailModal({
  log,
  isOpen,
  onClose,
}: LogDetailModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!log) return null;

  const formattedTime = format(new Date(log.timestamp), "PPpp");

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const CopyButton = ({
    text,
    field,
    label,
  }: {
    text: string;
    field: string;
    label?: string;
  }) => (
    <button
      onClick={() => copyToClipboard(text, field)}
      className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-cyan-300 hover:text-gray-900 dark:hover:text-cyan-100 hover:bg-gray-100 dark:hover:bg-slate-800 rounded transition-all"
      title={`Copy ${label || field}`}
    >
      {copiedField === field ? (
        <>
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          <span className="text-green-600 dark:text-green-400">Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>Copy</span>
        </>
      )}
    </button>
  );

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-cyan-800/30 transition-all">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-cyan-800/30 bg-gradient-to-r from-gray-50 to-cyan-50/30 dark:from-slate-900 dark:to-slate-950">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg shadow-lg shadow-cyan-500/20">
                      <ExternalLink className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-cyan-100">
                        Log Details
                      </Dialog.Title>
                      <p className="text-xs text-gray-500 dark:text-cyan-400/70 font-mono mt-0.5">
                        {log.service} · {log.event}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-cyan-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 max-h-[70vh] overflow-y-auto bg-white dark:bg-slate-950">
                  <div className="space-y-5">
                    {/* Primary Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-cyan-400 uppercase tracking-wider">
                          Timestamp
                        </label>
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-900 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-cyan-800/30">
                          <p className="text-sm text-gray-900 dark:text-cyan-100 font-mono">
                            {formattedTime}
                          </p>
                          <CopyButton
                            text={log.timestamp}
                            field="timestamp"
                            label="timestamp"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-cyan-400 uppercase tracking-wider">
                          Log Level
                        </label>
                        <div className="flex items-start pt-2">
                          <LogLevelBadge level={log.level} size="lg" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-cyan-400 uppercase tracking-wider">
                          Service
                        </label>
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-900 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-cyan-800/30">
                          <p className="text-sm text-gray-900 dark:text-cyan-100 font-medium">
                            {log.service}
                          </p>
                          <CopyButton text={log.service} field="service" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-600 dark:text-cyan-400 uppercase tracking-wider">
                          Event Type
                        </label>
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-900 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-cyan-800/30">
                          <p className="text-sm text-gray-900 dark:text-cyan-100 font-medium">
                            {log.event}
                          </p>
                          <CopyButton text={log.event} field="event" />
                        </div>
                      </div>
                    </div>

                    {/* Correlation IDs */}
                    {(log.traceId ||
                      log.spanId ||
                      log.requestId ||
                      log.sessionId) && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-700 dark:text-cyan-300 uppercase tracking-wider mb-3">
                          Correlation IDs
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {log.traceId && (
                            <div className="bg-cyan-50 dark:bg-cyan-900/20 px-3 py-2.5 rounded-lg border border-cyan-200 dark:border-cyan-800/50">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-cyan-700 dark:text-cyan-300">
                                  Trace ID
                                </label>
                                <CopyButton
                                  text={log.traceId}
                                  field="traceId"
                                  label="trace ID"
                                />
                              </div>
                              <p className="text-sm text-cyan-900 dark:text-cyan-100 font-mono break-all">
                                {log.traceId}
                              </p>
                            </div>
                          )}
                          {log.spanId && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2.5 rounded-lg border border-blue-200 dark:border-blue-800/50">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                  Span ID
                                </label>
                                <CopyButton
                                  text={log.spanId}
                                  field="spanId"
                                  label="span ID"
                                />
                              </div>
                              <p className="text-sm text-blue-900 dark:text-blue-100 font-mono break-all">
                                {log.spanId}
                              </p>
                            </div>
                          )}
                          {log.requestId && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 px-3 py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800/50">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                  Request ID
                                </label>
                                <CopyButton
                                  text={log.requestId}
                                  field="requestId"
                                  label="request ID"
                                />
                              </div>
                              <p className="text-sm text-emerald-900 dark:text-emerald-100 font-mono break-all">
                                {log.requestId}
                              </p>
                            </div>
                          )}
                          {log.sessionId && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5 rounded-lg border border-amber-200 dark:border-amber-800/50">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-medium text-amber-700 dark:text-amber-300">
                                  Session ID
                                </label>
                                <CopyButton
                                  text={log.sessionId}
                                  field="sessionId"
                                  label="session ID"
                                />
                              </div>
                              <p className="text-sm text-amber-900 dark:text-amber-100 font-mono break-all">
                                {log.sessionId}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Additional Information */}
                    <div className="grid grid-cols-2 gap-4">
                      {log.sourceFile && (
                        <div className="space-y-1 col-span-2">
                          <label className="text-xs font-semibold text-gray-500 dark:text-cyan-400 uppercase tracking-wider">
                            Source File
                          </label>
                          <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-cyan-800/30">
                            <p className="text-sm text-gray-900 dark:text-cyan-100 font-mono break-all">
                              {log.sourceFile}
                            </p>
                            <CopyButton
                              text={log.sourceFile}
                              field="sourceFile"
                              label="source file"
                            />
                          </div>
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-gray-500 dark:text-cyan-400 uppercase tracking-wider">
                          PII Status
                        </label>
                        <div
                          className={`px-3 py-2 rounded-lg border ${
                            log.piiRedacted
                              ? "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
                              : "bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-cyan-800/30"
                          }`}
                        >
                          <p
                            className={`text-sm font-medium ${
                              log.piiRedacted
                                ? "text-purple-900 dark:text-purple-100"
                                : "text-gray-900 dark:text-cyan-100"
                            }`}
                          >
                            {log.piiRedacted
                              ? "PII Redacted"
                              : "No PII Redaction"}
                          </p>
                        </div>
                      </div>
                      {log.piiDetected && log.piiDetected.length > 0 && (
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-500 dark:text-cyan-400 uppercase tracking-wider">
                            PII Detection
                          </label>
                          <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-2 rounded-lg border border-purple-200 dark:border-purple-800">
                            <p className="text-sm text-purple-900 dark:text-purple-100">
                              {log.piiDetected.join(", ")}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-xs font-semibold text-gray-700 dark:text-cyan-300 uppercase tracking-wider">
                            Metadata
                          </label>
                          <CopyButton
                            text={JSON.stringify(log.metadata, null, 2)}
                            field="metadata"
                          />
                        </div>
                        <pre className="bg-slate-900 dark:bg-black text-cyan-100 dark:text-cyan-200 p-4 rounded-lg text-xs overflow-x-auto border border-cyan-800/30 font-mono leading-relaxed">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Raw Log Message */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-700 dark:text-cyan-300 uppercase tracking-wider">
                          Raw Log Message
                        </label>
                        <CopyButton
                          text={log.raw}
                          field="raw"
                          label="raw message"
                        />
                      </div>
                      <pre className="bg-slate-900 dark:bg-black text-cyan-100 dark:text-cyan-200 p-4 rounded-lg text-xs overflow-x-auto border border-cyan-800/30 whitespace-pre-wrap break-words font-mono leading-relaxed">
                        {log.raw}
                      </pre>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-cyan-800/30 bg-gradient-to-r from-gray-50 to-cyan-50/30 dark:from-slate-900 dark:to-slate-950">
                  <button
                    onClick={() =>
                      copyToClipboard(JSON.stringify(log, null, 2), "full")
                    }
                    className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-cyan-300 hover:text-gray-900 dark:hover:text-cyan-100 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    {copiedField === "full" ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-green-500">Full log copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Full Log (JSON)</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-700 dark:to-blue-700 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 dark:hover:from-cyan-800 dark:hover:to-blue-800 transition-colors font-medium shadow-lg shadow-cyan-500/20"
                  >
                    Close
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
