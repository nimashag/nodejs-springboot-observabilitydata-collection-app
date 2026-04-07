import { useState, useEffect, useMemo } from 'react';
import { getTemplates, mineTemplates, deleteTemplate } from '../api/logAggregationApi';
import type { LogTemplate, TemplateMiningParams } from '../types/logAggregation.types';
import { format } from 'date-fns';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClipboardDocumentIcon,
  DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const EVENT_TYPES = [
  'error',
  'warning',
  'http_request',
  'database',
  'authentication',
  'business_logic',
  'server_lifecycle',
  'infrastructure',
  'unknown',
];

export default function TemplatesPage() {
  const [allTemplates, setAllTemplates] = useState<LogTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [mining, setMining] = useState(false);
  const [toast, setToast] = useState<null | {
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message: string;
  }>(null);
  const [templateToDelete, setTemplateToDelete] = useState<LogTemplate | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedFrequencyRange, setSelectedFrequencyRange] = useState<string>('');
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(new Set());

  // Load all templates once on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedFrequencyRange, selectedEventType]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      // Load all templates (no service filter at API level, we'll filter client-side)
      const data = await getTemplates();
      setAllTemplates(data || []);
      
      // Extract unique event types
      const uniqueEventTypes = Array.from(
        new Set(data.map((t) => t.eventType).filter((s): s is string => Boolean(s)))
      ).sort();
      setEventTypes(uniqueEventTypes);
    } catch (error: any) {
      console.error('Error loading templates:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load templates';
      setError(errorMessage);
      setAllTemplates([]);
      setEventTypes([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter templates based on selected filters
  const filteredTemplates = useMemo(() => {
    let filtered = [...allTemplates];

    if (selectedFrequencyRange) {
      switch (selectedFrequencyRange) {
        case 'very-high':
          filtered = filtered.filter((t) => t.frequency >= 1000);
          break;
        case 'high':
          filtered = filtered.filter((t) => t.frequency >= 500 && t.frequency < 1000);
          break;
        case 'medium':
          filtered = filtered.filter((t) => t.frequency >= 100 && t.frequency < 500);
          break;
        case 'low':
          filtered = filtered.filter((t) => t.frequency >= 10 && t.frequency < 100);
          break;
        case 'very-low':
          filtered = filtered.filter((t) => t.frequency < 10);
          break;
      }
    }

    if (selectedEventType) {
      filtered = filtered.filter((t) => t.eventType === selectedEventType);
    }

    return filtered;
  }, [allTemplates, selectedFrequencyRange, selectedEventType]);

  // Paginate filtered templates
  const paginatedTemplates = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTemplates.slice(startIndex, endIndex);
  }, [filteredTemplates, page, pageSize]);

  const totalPages = Math.ceil(filteredTemplates.length / pageSize);
  const startItem = filteredTemplates.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, filteredTemplates.length);

  // Calculate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;
    
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      
      if (page > 3) {
        pages.push('...');
      }
      
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (page < totalPages - 2) {
        pages.push('...');
      }
      
      pages.push(totalPages);
    }
    
    return pages;
  };

  const handleMineTemplates = async () => {
    try {
      setMining(true);
      const params: TemplateMiningParams = {
        source: 'aggregated',
        minClusterSize: 3,
        maxClusters: 50,
      };
      const result = await mineTemplates(params);
      console.log('Template mining result:', result);
      await loadTemplates();
      const msg = `Mined ${result.templates.length} templates.${result.reaggregated ? ' Aggregated logs were rebuilt.' : ''}`;
      setToast({ type: 'success', title: 'Template mining completed', message: msg });
      if (result.reaggregationError) {
        setToast({
          type: 'warning',
          title: 'Log re-aggregation failed',
          message: `${result.reaggregationError}. Template filters may be stale until you restart the log aggregation service.`,
        });
      }
      setTimeout(() => setToast(null), 5000);
    } catch (error: any) {
      console.error('Error mining templates:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      setToast({ type: 'error', title: 'Template mining failed', message: errorMessage });
      setTimeout(() => setToast(null), 7000);
    } finally {
      setMining(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      setDeleting(true);
      await deleteTemplate(id);
      await loadTemplates();
      setToast({ type: 'success', title: 'Template deleted', message: `Template ${id} was deleted successfully.` });
      setTimeout(() => setToast(null), 5000);
    } catch (error) {
      console.error('Error deleting template:', error);
      const errorMessage = (error as any)?.response?.data?.error || (error as any)?.message || 'Failed to delete template';
      setToast({ type: 'error', title: 'Delete failed', message: errorMessage });
      setTimeout(() => setToast(null), 7000);
    } finally {
      setDeleting(false);
      setTemplateToDelete(null);
    }
  };

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div
            className={`rounded-lg border shadow-lg p-4 ${
              toast.type === 'success'
                ? 'bg-green-50 border-green-200 text-green-900'
                : toast.type === 'warning'
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
                  : toast.type === 'info'
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="font-semibold">{toast.title}</div>
            <div className="text-sm mt-1 whitespace-pre-line">{toast.message}</div>
          </div>
        </div>
      )}
      <Transition appear show={templateToDelete != null} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => (deleting ? null : setTemplateToDelete(null))}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-gray-200 dark:border-cyan-800/30 transition-all">
                  <div className="p-5">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-cyan-100">
                      Delete template?
                    </Dialog.Title>
                    <p className="mt-2 text-sm text-gray-600 dark:text-cyan-400/80">
                      This will remove the template from disk and from the templates list. This action cannot be undone.
                    </p>
                    {templateToDelete && (
                      <div className="mt-3 rounded-lg border border-gray-200 dark:border-cyan-800/30 bg-gray-50 dark:bg-slate-800/40 p-3 text-sm">
                        <div className="font-medium text-gray-900 dark:text-cyan-100">
                          {templateToDelete.id}
                        </div>
                        <div className="mt-1 text-gray-700 dark:text-cyan-200/80 line-clamp-2">
                          {templateToDelete.template}
                        </div>
                      </div>
                    )}
                    <div className="mt-5 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setTemplateToDelete(null)}
                        disabled={deleting}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-cyan-800/30 text-gray-700 dark:text-cyan-100 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => templateToDelete && handleDeleteTemplate(templateToDelete.id)}
                        disabled={deleting || !templateToDelete}
                        className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-cyan-100 mb-2">Log Templates</h1>
            <p className="text-sm text-gray-600 dark:text-cyan-400/70 mt-1">
              Discovered log patterns and templates
            </p>
          </div>
          <button
            onClick={handleMineTemplates}
            disabled={mining}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20 dark:shadow-cyan-500/30 font-semibold"
          >
            {mining ? 'Mining...' : 'Mine Templates'}
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-cyan-300 mb-2">
            Filter by Frequency
          </label>
          <select
            value={selectedFrequencyRange}
            onChange={(e) => setSelectedFrequencyRange(e.target.value)}
            className="w-full border border-gray-300 dark:border-cyan-800/30 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-cyan-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:focus:ring-cyan-400 dark:focus:border-cyan-400 transition-all"
          >
            <option value="">All Frequencies</option>
            <option value="very-high">Very High (≥1000)</option>
            <option value="high">High (500-999)</option>
            <option value="medium">Medium (100-499)</option>
            <option value="low">Low (10-99)</option>
            <option value="very-low">Very Low (&lt;10)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-cyan-300 mb-2">
            Filter by Event Type
          </label>
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="w-full border border-gray-300 dark:border-cyan-800/30 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-cyan-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:focus:ring-cyan-400 dark:focus:border-cyan-400 transition-all"
          >
            <option value="">All Event Types</option>
            {eventTypes.map((eventType) => (
              <option key={eventType} value={eventType}>
                {eventType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-cyan-300 mb-2">
              Per Page
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="w-full border border-gray-300 dark:border-cyan-800/30 rounded-lg px-3 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-cyan-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 dark:focus:ring-cyan-400 dark:focus:border-cyan-400 transition-all"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-cyan-400/70">
          {loading ? (
            'Loading...'
          ) : filteredTemplates.length > 0 ? (
            <>
              Showing <span className="font-medium">{startItem.toLocaleString()}</span> to{' '}
              <span className="font-medium">{endItem.toLocaleString()}</span> of{' '}
              <span className="font-medium">{filteredTemplates.length.toLocaleString()}</span> templates
            </>
          ) : (
            'No templates found'
          )}
        </div>
        {(selectedFrequencyRange || selectedEventType) && (
          <button
            onClick={() => {
              setSelectedFrequencyRange('');
              setSelectedEventType('');
            }}
            className="text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-semibold transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-800 dark:text-red-300">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-cyan-400/70">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-cyan-400/70 mb-4">
            {error ? 'Failed to load templates' : allTemplates.length === 0 ? 'No templates found' : 'No templates match your filters'}
          </p>
          {allTemplates.length === 0 && (
            <p className="text-sm text-gray-400 dark:text-cyan-500/60 mb-4">
              Click the button below to mine templates from your aggregated logs.
            </p>
          )}
          {allTemplates.length === 0 && (
            <button
              onClick={handleMineTemplates}
              disabled={mining}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/20 dark:shadow-cyan-500/30 font-semibold"
            >
              {mining ? 'Mining...' : 'Mine Templates from Aggregated Logs'}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {paginatedTemplates.map((template) => {
              const isExpanded = expandedTemplates.has(template.id);
              const toggleExpand = () => {
                setExpandedTemplates((prev) => {
                  const newSet = new Set(prev);
                  if (newSet.has(template.id)) {
                    newSet.delete(template.id);
                  } else {
                    newSet.add(template.id);
                  }
                  return newSet;
                });
              };

              const copyToClipboard = async (text: string) => {
                try {
                  await navigator.clipboard.writeText(text);
                } catch (err) {
                  console.error('Failed to copy:', err);
                }
              };

              return (
                <div
                  key={template.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-cyan-800/30 p-6 hover:shadow-lg hover:shadow-cyan-500/10 dark:hover:shadow-cyan-500/20 transition-all duration-300 hover:border-cyan-300 dark:hover:border-cyan-700"
                >
                  {/* Header Section */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-cyan-100">
                          Template {template.id.split('-')[1]}
                        </h3>
                        {template.service && (
                          <span className="text-sm bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-cyan-300 px-2 py-1 rounded border border-gray-200 dark:border-cyan-800/30">
                            {template.service}
                          </span>
                        )}
                        {template.eventType && (
                          <span className="text-sm bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 px-2 py-1 rounded border border-cyan-200 dark:border-cyan-800">
                            {template.eventType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-xs text-gray-500 dark:text-cyan-400/70 font-mono">ID: {template.id}</p>
                        <button
                          onClick={() => copyToClipboard(template.id)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copy Template ID"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-mono text-gray-700 dark:text-cyan-200 bg-gray-50 dark:bg-slate-900 p-3 rounded mb-2 break-all border border-gray-200 dark:border-cyan-800/30">
                        {template.template}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-cyan-400/70 flex-wrap gap-2">
                        <span className="font-medium">Frequency: <span className="font-normal">{template.frequency.toLocaleString()}</span></span>
                        {template.metadata?.parameterCount !== undefined && (
                          <span className="font-medium">Parameters: <span className="font-normal">{template.metadata.parameterCount}</span></span>
                        )}
                        {template.metadata?.avgLength && (
                          <span className="font-medium">Avg Length: <span className="font-normal">{template.metadata.avgLength}</span></span>
                        )}
                        <span className="font-medium">
                          Last seen: <span className="font-normal">{format(new Date(template.lastSeen), 'PPp')}</span>
                        </span>
                        <span className="font-medium">
                          Created: <span className="font-normal">{format(new Date(template.createdAt), 'PPp')}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={toggleExpand}
                        className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        title={isExpanded ? 'Collapse details' : 'Expand details'}
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="w-5 h-5" />
                        ) : (
                          <ChevronDownIcon className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={() => setTemplateToDelete(template)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details Section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-cyan-800/30 space-y-4">
                      {/* Pattern Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-700 dark:text-cyan-300">Regex Pattern</p>
                          <button
                            onClick={() => copyToClipboard(template.pattern)}
                            className="text-gray-400 hover:text-gray-600 flex items-center space-x-1 text-xs"
                            title="Copy Pattern"
                          >
                            <DocumentDuplicateIcon className="w-4 h-4" />
                            <span>Copy</span>
                          </button>
                        </div>
                        <p className="text-xs font-mono text-gray-600 dark:text-cyan-200 bg-gray-50 dark:bg-slate-900 p-3 rounded break-all border border-gray-200 dark:border-cyan-800/30">
                          {template.pattern}
                        </p>
                      </div>

                      {/* Parameterized Log Section */}
                      {template.parameterizedLog && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-gray-700 dark:text-cyan-300">Parameterized Log</p>
                            <button
                              onClick={() => copyToClipboard(template.parameterizedLog)}
                              className="text-gray-400 hover:text-gray-600 flex items-center space-x-1 text-xs"
                              title="Copy Parameterized Log"
                            >
                              <DocumentDuplicateIcon className="w-4 h-4" />
                              <span>Copy</span>
                            </button>
                          </div>
                          <p className="text-xs font-mono text-gray-600 dark:text-cyan-200 bg-gray-50 dark:bg-slate-900 p-3 rounded break-all border border-gray-200 dark:border-cyan-800/30">
                            {template.parameterizedLog}
                          </p>
                        </div>
                      )}

                      {/* Metadata Section */}
                      {template.metadata && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-cyan-300 mb-2">Metadata</p>
                          <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-cyan-800/30">
                            <div className="space-y-3">
                              {template.metadata.avgLength !== undefined && (
                                <div className="flex items-center">
                                  <span className="text-xs text-gray-600 dark:text-cyan-400/70 font-medium w-32 flex-shrink-0">Average Length:</span>
                                  <span className="text-xs text-gray-900 dark:text-cyan-100 font-semibold">{template.metadata.avgLength}</span>
                                </div>
                              )}
                              {template.metadata.parameterCount !== undefined && (
                                <div className="flex items-center">
                                  <span className="text-xs text-gray-600 dark:text-cyan-400/70 font-medium w-32 flex-shrink-0">Parameter Count:</span>
                                  <span className="text-xs text-gray-900 dark:text-cyan-100 font-semibold">{template.metadata.parameterCount}</span>
                                </div>
                              )}
                              {template.metadata.parameterTypes && Object.keys(template.metadata.parameterTypes).length > 0 && (
                                <div>
                                  <div className="text-xs text-gray-600 dark:text-cyan-400/70 font-medium mb-2">Parameter Types:</div>
                                  <div className="space-y-2 pl-4 border-l-2 border-gray-300 dark:border-cyan-800/30">
                                    {Object.entries(template.metadata.parameterTypes).map(([param, type]) => (
                                      <div key={param} className="flex items-center">
                                        <span className="text-xs text-gray-600 dark:text-cyan-400/70 font-mono font-medium w-24 flex-shrink-0">{param}:</span>
                                        <span className="text-xs text-gray-900 dark:text-cyan-100 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-gray-200 dark:border-cyan-800/30">{type}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Example Logs Section */}
                      {template.exampleLogs.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-cyan-300 mb-2">
                            Example Logs ({template.exampleLogs.length} total)
                          </p>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {template.exampleLogs.map((example, index) => (
                              <div key={index} className="relative group">
                                <p className="text-xs font-mono text-gray-600 dark:text-cyan-200 bg-gray-50 dark:bg-slate-900 p-2 rounded break-all border border-gray-200 dark:border-cyan-800/30">
                                  {example}
                                </p>
                                <button
                                  onClick={() => copyToClipboard(example)}
                                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                                  title="Copy Example Log"
                                >
                                  <ClipboardDocumentIcon className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Collapsed Preview - Show first example log if not expanded */}
                  {!isExpanded && template.exampleLogs.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-cyan-800/30">
                      <p className="text-xs font-medium text-gray-700 dark:text-cyan-300 mb-2">
                        Preview (Click to expand for all {template.exampleLogs.length} examples):
                      </p>
                      <p className="text-xs font-mono text-gray-600 dark:text-cyan-200 bg-gray-50 dark:bg-slate-900 p-2 rounded break-all border border-gray-200 dark:border-cyan-800/30">
                        {template.exampleLogs[0]}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-cyan-800/30 px-4 py-4 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1 || totalPages === 0}
                    className="p-2 text-gray-600 dark:text-cyan-300 border border-gray-300 dark:border-cyan-800/30 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="First page"
                  >
                    <ChevronDoubleLeftIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || totalPages === 0}
                    className="p-2 text-gray-600 dark:text-cyan-300 border border-gray-300 dark:border-cyan-800/30 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Previous page"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex items-center space-x-1 flex-wrap justify-center">
                  {totalPages > 0 && getPageNumbers().map((pageNum, index) => {
                    if (pageNum === '...') {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    const pageNumber = pageNum as number;
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setPage(pageNumber)}
                        className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                          page === pageNumber
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                            : 'text-gray-700 dark:text-cyan-300 border border-gray-300 dark:border-cyan-800/30 hover:bg-cyan-50 dark:hover:bg-cyan-900/20'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || totalPages === 0}
                    className="p-2 text-gray-600 dark:text-cyan-300 border border-gray-300 dark:border-cyan-800/30 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages || totalPages === 0}
                    className="p-2 text-gray-600 dark:text-cyan-300 border border-gray-300 dark:border-cyan-800/30 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Last page"
                  >
                    <ChevronDoubleRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 text-center text-sm text-gray-500 dark:text-cyan-400/70">
                Page {page} of {totalPages || 1} {filteredTemplates.length > 0 && `(${filteredTemplates.length.toLocaleString()} total templates)`}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

