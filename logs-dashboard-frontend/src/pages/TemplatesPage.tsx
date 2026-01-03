import { useState, useEffect, useMemo } from 'react';
import { getTemplates, mineTemplates, deleteTemplate } from '../api/logAggregationApi';
import type { LogTemplate, TemplateMiningParams } from '../types/logAggregation.types';
import { format } from 'date-fns';
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
      // Show success message
      alert(`Successfully mined ${result.templates.length} templates!`);
    } catch (error: any) {
      console.error('Error mining templates:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
      alert(`Error mining templates: ${errorMessage}. Please check the console for details.`);
    } finally {
      setMining(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await deleteTemplate(id);
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template. Please check the console.');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Log Templates</h1>
            <p className="text-sm text-gray-600 mt-1">
              Discovered log patterns and templates
            </p>
          </div>
          <button
            onClick={handleMineTemplates}
            disabled={mining}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mining ? 'Mining...' : 'Mine Templates'}
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Frequency
          </label>
          <select
            value={selectedFrequencyRange}
            onChange={(e) => setSelectedFrequencyRange(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Filter by Event Type
          </label>
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Per Page
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
        <div className="text-sm text-gray-600">
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
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear Filters
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">
            {error ? 'Failed to load templates' : allTemplates.length === 0 ? 'No templates found' : 'No templates match your filters'}
          </p>
          {allTemplates.length === 0 && (
            <p className="text-sm text-gray-400 mb-4">
              Click the button below to mine templates from your aggregated logs.
            </p>
          )}
          {allTemplates.length === 0 && (
            <button
              onClick={handleMineTemplates}
              disabled={mining}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  {/* Header Section */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Template {template.id.split('-')[1]}
                        </h3>
                        {template.service && (
                          <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                            {template.service}
                          </span>
                        )}
                        {template.eventType && (
                          <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {template.eventType}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mb-2">
                        <p className="text-xs text-gray-500 font-mono">ID: {template.id}</p>
                        <button
                          onClick={() => copyToClipboard(template.id)}
                          className="text-gray-400 hover:text-gray-600"
                          title="Copy Template ID"
                        >
                          <ClipboardDocumentIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-mono text-gray-700 bg-gray-50 p-3 rounded mb-2 break-all">
                        {template.template}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 flex-wrap gap-2">
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
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details Section */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                      {/* Pattern Section */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-700">Regex Pattern</p>
                          <button
                            onClick={() => copyToClipboard(template.pattern)}
                            className="text-gray-400 hover:text-gray-600 flex items-center space-x-1 text-xs"
                            title="Copy Pattern"
                          >
                            <DocumentDuplicateIcon className="w-4 h-4" />
                            <span>Copy</span>
                          </button>
                        </div>
                        <p className="text-xs font-mono text-gray-600 bg-gray-50 p-3 rounded break-all">
                          {template.pattern}
                        </p>
                      </div>

                      {/* Parameterized Log Section */}
                      {template.parameterizedLog && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-gray-700">Parameterized Log</p>
                            <button
                              onClick={() => copyToClipboard(template.parameterizedLog)}
                              className="text-gray-400 hover:text-gray-600 flex items-center space-x-1 text-xs"
                              title="Copy Parameterized Log"
                            >
                              <DocumentDuplicateIcon className="w-4 h-4" />
                              <span>Copy</span>
                            </button>
                          </div>
                          <p className="text-xs font-mono text-gray-600 bg-gray-50 p-3 rounded break-all">
                            {template.parameterizedLog}
                          </p>
                        </div>
                      )}

                      {/* Metadata Section */}
                      {template.metadata && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Metadata</p>
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <div className="space-y-3">
                              {template.metadata.avgLength !== undefined && (
                                <div className="flex items-center">
                                  <span className="text-xs text-gray-600 font-medium w-32 flex-shrink-0">Average Length:</span>
                                  <span className="text-xs text-gray-900 font-semibold">{template.metadata.avgLength}</span>
                                </div>
                              )}
                              {template.metadata.parameterCount !== undefined && (
                                <div className="flex items-center">
                                  <span className="text-xs text-gray-600 font-medium w-32 flex-shrink-0">Parameter Count:</span>
                                  <span className="text-xs text-gray-900 font-semibold">{template.metadata.parameterCount}</span>
                                </div>
                              )}
                              {template.metadata.parameterTypes && Object.keys(template.metadata.parameterTypes).length > 0 && (
                                <div>
                                  <div className="text-xs text-gray-600 font-medium mb-2">Parameter Types:</div>
                                  <div className="space-y-2 pl-4 border-l-2 border-gray-300">
                                    {Object.entries(template.metadata.parameterTypes).map(([param, type]) => (
                                      <div key={param} className="flex items-center">
                                        <span className="text-xs text-gray-600 font-mono font-medium w-24 flex-shrink-0">{param}:</span>
                                        <span className="text-xs text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">{type}</span>
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
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            Example Logs ({template.exampleLogs.length} total)
                          </p>
                          <div className="space-y-2 max-h-96 overflow-y-auto">
                            {template.exampleLogs.map((example, index) => (
                              <div key={index} className="relative group">
                                <p className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded break-all">
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
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        Preview (Click to expand for all {template.exampleLogs.length} examples):
                      </p>
                      <p className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded break-all">
                        {template.exampleLogs[0]}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1 || totalPages === 0}
                    className="p-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="First page"
                  >
                    <ChevronDoubleLeftIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || totalPages === 0}
                    className="p-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-700 border border-gray-300 hover:bg-gray-50'
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
                    className="p-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Next page"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages || totalPages === 0}
                    className="p-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="Last page"
                  >
                    <ChevronDoubleRightIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="mt-3 text-center text-sm text-gray-500">
                Page {page} of {totalPages || 1} {filteredTemplates.length > 0 && `(${filteredTemplates.length.toLocaleString()} total templates)`}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

