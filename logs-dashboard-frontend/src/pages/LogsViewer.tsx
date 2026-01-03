import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { queryLogs, getTemplates } from '../api/logAggregationApi';
import type { StructuredLog, LogQueryParams, LogTemplate } from '../types/logAggregation.types';
import LogFilters from '../components/logs/LogFilters';
import LogCard from '../components/logs/LogCard';
import LogDetailModal from '../components/logs/LogDetailModal';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/24/outline';

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500];

export default function LogsViewer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<StructuredLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<StructuredLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const initialPageSize = parseInt(searchParams.get('limit') || '50', 10);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<LogQueryParams>({
    service: searchParams.get('service') || undefined,
    level: searchParams.get('level') || undefined,
    event: searchParams.get('event') || undefined,
    traceId: searchParams.get('traceId') || undefined,
    templateId: searchParams.get('templateId') || undefined,
    limit: initialPageSize,
  });
  const [services, setServices] = useState<string[]>([]);
  const [templates, setTemplates] = useState<LogTemplate[]>([]);
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [totalCount, setTotalCount] = useState(0);

  // Load services and templates only once on mount
  useEffect(() => {
    loadServices();
    loadTemplates();
  }, []);

  // Load logs when filters, page, or pageSize change
  useEffect(() => {
    loadLogs();
  }, [filters, page, pageSize]);

  const loadServices = async () => {
    try {
      // Query with a very high limit to get services from all logs
      // This is just for extracting unique services, not for display
      // We query without any filters to get all services
      // Make sure we don't apply any filters when loading services
      const response = await queryLogs({ 
        limit: 50000,
        // Explicitly set no filters
        service: undefined,
        level: undefined,
        event: undefined,
        traceId: undefined,
        templateId: undefined,
      });
      const uniqueServices = Array.from(
        new Set(response.logs.map((log) => log.service).filter(Boolean))
      ).sort() as string[];
      setServices(uniqueServices);
    } catch (error) {
      console.error('Error loading services:', error);
      // Fallback: try with smaller limit if the above fails
      try {
        const fallbackResponse = await queryLogs({ 
          limit: 10000,
          service: undefined,
          level: undefined,
          event: undefined,
          traceId: undefined,
          templateId: undefined,
        });
        const uniqueServices = Array.from(
          new Set(fallbackResponse.logs.map((log) => log.service).filter(Boolean))
        ).sort() as string[];
        setServices(uniqueServices);
      } catch (fallbackError) {
        console.error('Error loading services with fallback:', fallbackError);
      }
    }
  };

  const loadTemplates = async () => {
    try {
      const templatesData = await getTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const loadLogs = async () => {
    try {
      setLoading(true);
      const queryParams: LogQueryParams = {
        ...filters,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      };
      const response = await queryLogs(queryParams);
      setLogs(response.logs);
      setTotalCount(response.count);
      
      // Update URL params
      const newParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && key !== 'limit' && key !== 'offset') {
          newParams.set(key, value.toString());
        }
      });
      newParams.set('page', page.toString());
      newParams.set('limit', pageSize.toString());
      setSearchParams(newParams);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters: LogQueryParams) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    setFilters({ ...filters, limit: newSize });
  };

  const handleLogClick = (log: StructuredLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  // Calculate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;
    
    if (totalPages <= maxPagesToShow) {
      // Show all pages if total pages is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);
      
      if (page > 3) {
        pages.push('...');
      }
      
      // Show pages around current page
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (page < totalPages - 2) {
        pages.push('...');
      }
      
      // Show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Logs Viewer</h1>
        <p className="text-sm text-gray-600 mt-1">
          View and filter aggregated logs from all services
        </p>
      </div>

      <LogFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        services={services}
        templates={templates}
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {loading ? (
            'Loading...'
          ) : totalCount > 0 ? (
            <>
              Showing <span className="font-medium">{startItem.toLocaleString()}</span> to{' '}
              <span className="font-medium">{endItem.toLocaleString()}</span> of{' '}
              <span className="font-medium">{totalCount.toLocaleString()}</span> logs
            </>
          ) : (
            'No logs found'
          )}
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Per page:</label>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading logs...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No logs found matching your filters</p>
        </div>
      ) : (
        <>
          <div className="space-y-3 mb-6">
            {logs.map((log, index) => (
              <LogCard
                key={`${log.timestamp}-${log.service}-${index}`}
                log={log}
                onClick={() => handleLogClick(log)}
              />
            ))}
          </div>

          {totalCount > 0 && (
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
                Page {page} of {totalPages || 1} {totalCount > 0 && `(${totalCount.toLocaleString()} total logs)`}
              </div>
            </div>
          )}
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

