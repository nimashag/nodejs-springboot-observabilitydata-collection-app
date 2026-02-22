import { Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { X } from 'lucide-react';
import { format } from 'date-fns';
import LogLevelBadge from './LogLevelBadge';
import type { StructuredLog } from '../../types/logs/logAggregation.types';

interface LogDetailModalProps {
  log: StructuredLog | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function LogDetailModal({ log, isOpen, onClose }: LogDetailModalProps) {
  if (!log) return null;

  const formattedTime = format(new Date(log.timestamp), 'PPpp');

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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    Log Details
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Timestamp</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{formattedTime}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Level</label>
                      <div className="mt-1">
                        <LogLevelBadge level={log.level} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Service</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{log.service}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Event</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">{log.event}</p>
                    </div>
                    {log.traceId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Trace ID</label>
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">{log.traceId}</p>
                      </div>
                    )}
                    {log.spanId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Span ID</label>
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">{log.spanId}</p>
                      </div>
                    )}
                    {log.requestId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Request ID</label>
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">{log.requestId}</p>
                      </div>
                    )}
                    {log.sessionId && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Session ID</label>
                        <p className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">{log.sessionId}</p>
                      </div>
                    )}
                    {log.sourceFile && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Source File</label>
                        <p className="text-sm text-gray-900 dark:text-gray-100 break-all">{log.sourceFile}</p>
                      </div>
                    )}
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">PII Redacted</label>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {log.piiRedacted ? 'Yes' : 'No'}
                      </p>
                    </div>
                    {log.piiDetected && log.piiDetected.length > 0 && (
                      <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">PII Detected Types</label>
                        <p className="text-sm text-gray-900 dark:text-gray-100">
                          {log.piiDetected.join(', ')}
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Metadata</label>
                    <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 block">Raw Log</label>
                    <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">
                      {log.raw}
                    </pre>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
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

