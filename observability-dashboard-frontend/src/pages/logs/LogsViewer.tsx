import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { queryLogs, getTemplates } from "../../api/logs/logAggregationApi";
import type {
  StructuredLog,
  LogQueryParams,
  LogTemplate,
} from "../../types/logs/logAggregation.types";
import LogFilters from "../../components/logs/LogFilters";
import LogCard from "../../components/logs/LogCard";
import LogDetailModal from "../../components/logs/LogDetailModal";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  LayoutGrid,
  LayoutList,
  Download,
  RefreshCw,
  Filter,
  Clock,
  Copy,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200, 500];
const TIME_RANGES = [
  { label: "Last 15 minutes", value: 15 * 60 * 1000 },
  { label: "Last 1 hour", value: 60 * 60 * 1000 },
  { label: "Last 6 hours", value: 6 * 60 * 60 * 1000 },
  { label: "Last 24 hours", value: 24 * 60 * 60 * 1000 },
  { label: "Last 7 days", value: 7 * 24 * 60 * 60 * 1000 },
];

export default function LogsViewer() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<StructuredLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<StructuredLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<StructuredLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const initialPageSize = parseInt(searchParams.get("limit") || "50", 10);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [filters, setFilters] = useState<LogQueryParams>({
    service: searchParams.get("service") || undefined,
    level: searchParams.get("level") || undefined,
    event: searchParams.get("event") || undefined,
    traceId: searchParams.get("traceId") || undefined,
    sessionId: searchParams.get("sessionId") || undefined,
    templateId: searchParams.get("templateId") || undefined,
    startTime: searchParams.get("startTime") || undefined,
    endTime: searchParams.get("endTime") || undefined,
    piiRedacted:
      searchParams.get("piiRedacted") === "true"
        ? true
        : searchParams.get("piiRedacted") === "false"
          ? false
          : undefined,
    limit: initialPageSize,
  });
  const [services, setServices] = useState<string[]>([]);
  const [templates, setTemplates] = useState<LogTemplate[]>([]);
  const [page, setPage] = useState(
    parseInt(searchParams.get("page") || "1", 10),
  );
  const [totalCount, setTotalCount] = useState(0);

  // New UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [showFilters, setShowFilters] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load services and templates only once on mount
  useEffect(() => {
    loadServices();
    loadTemplates();
  }, []);

  // Load logs when filters, page, or pageSize change
  useEffect(() => {
    loadLogs();
  }, [filters, page, pageSize]);

  // Auto-refresh logic
  useEffect(() => {
    if (autoRefresh) {
      refreshTimerRef.current = setInterval(() => {
        loadLogs();
      }, refreshInterval);
    } else {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    }
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, filters, page, pageSize]);

  // Filter logs based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLogs(logs);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = logs.filter(
      (log) =>
        log.raw.toLowerCase().includes(query) ||
        log.event.toLowerCase().includes(query) ||
        log.service.toLowerCase().includes(query) ||
        (log.traceId && log.traceId.toLowerCase().includes(query)) ||
        (log.sessionId && log.sessionId.toLowerCase().includes(query)) ||
        JSON.stringify(log.metadata).toLowerCase().includes(query),
    );
    setFilteredLogs(filtered);
  }, [searchQuery, logs]);

  const loadServices = async () => {
    try {
      const response = await queryLogs({
        limit: 50000,
        service: undefined,
        level: undefined,
        event: undefined,
        traceId: undefined,
        templateId: undefined,
        piiRedacted: undefined,
      });
      const uniqueServices = Array.from(
        new Set(response.logs.map((log) => log.service).filter(Boolean)),
      ).sort() as string[];
      setServices(uniqueServices);
    } catch (error) {
      console.error("Error loading services:", error);
      try {
        const fallbackResponse = await queryLogs({
          limit: 10000,
          service: undefined,
          level: undefined,
          event: undefined,
          traceId: undefined,
          templateId: undefined,
          piiRedacted: undefined,
        });
        const uniqueServices = Array.from(
          new Set(
            fallbackResponse.logs.map((log) => log.service).filter(Boolean),
          ),
        ).sort() as string[];
        setServices(uniqueServices);
      } catch (fallbackError) {
        console.error("Error loading services with fallback:", fallbackError);
      }
    }
  };

  const loadTemplates = async () => {
    try {
      const templatesData = await getTemplates();
      setTemplates(templatesData);
    } catch (error) {
      console.error("Error loading templates:", error);
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
        if (
          value !== undefined &&
          value !== null &&
          key !== "limit" &&
          key !== "offset"
        ) {
          if (typeof value === "boolean") {
            newParams.set(key, value.toString());
          } else {
            newParams.set(key, value.toString());
          }
        }
      });
      newParams.set("page", page.toString());
      newParams.set("limit", pageSize.toString());
      setSearchParams(newParams);
    } catch (error) {
      console.error("Error loading logs:", error);
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

  const handleQuickTimeRange = (milliseconds: number) => {
    const now = new Date();
    const start = new Date(now.getTime() - milliseconds);
    setFilters({
      ...filters,
      startTime: start.toISOString(),
      endTime: now.toISOString(),
    });
    setPage(1);
  };

  const handleExport = (format: "json" | "csv") => {
    const dataToExport = filteredLogs.length > 0 ? filteredLogs : logs;

    if (format === "json") {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs-${new Date().toISOString()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV export
      const headers = [
        "Timestamp",
        "Service",
        "Level",
        "Event",
        "Trace ID",
        "Session ID",
        "Message",
      ];
      const rows = dataToExport.map((log) => [
        log.timestamp,
        log.service,
        log.level,
        log.event,
        log.traceId || "",
        log.sessionId || "",
        log.raw.replace(/"/g, '""'), // Escape quotes
      ]);
      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs-${new Date().toISOString()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const startItem = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  // Use filtered logs for display
  const displayLogs = searchQuery.trim() ? filteredLogs : logs;
  const displayCount = searchQuery.trim() ? filteredLogs.length : totalCount;

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
        pages.push("...");
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push("...");
      }

      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Logs Viewer
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Real-time log aggregation and analysis from all services
          </p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
              autoRefresh
                ? "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
            }`}
            title={
              autoRefresh ? "Auto-refresh enabled" : "Auto-refresh disabled"
            }
          >
            <RefreshCw
              className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`}
            />
            <span className="text-sm font-medium">
              {autoRefresh ? `Auto (${refreshInterval / 1000}s)` : "Manual"}
            </span>
          </button>

          {/* Export button */}
          <div className="relative group">
            <button className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export</span>
            </button>
            <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport("json")}
                className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
              >
                JSON
              </button>
              <button
                onClick={() => handleExport("csv")}
                className="w-full px-4 py-2 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-b-lg"
              >
                CSV
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs... (message, trace ID, event, etc.)"
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Quick Time Ranges */}
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-gray-400" />
          {TIME_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => handleQuickTimeRange(range.value)}
              className="px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
          <button
            onClick={() => setViewMode("card")}
            className={`p-2 rounded ${
              viewMode === "card"
                ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
            title="Card view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-2 rounded ${
              viewMode === "table"
                ? "bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
            title="Table view"
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-colors ${
            showFilters
              ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400"
              : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filters</span>
        </button>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <LogFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          services={services}
          templates={templates}
        />
      )}

      {/* Results Info Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {loading ? (
              <span className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Loading...</span>
              </span>
            ) : displayCount > 0 ? (
              <span>
                {searchQuery ? (
                  <>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {displayCount}
                    </span>{" "}
                    result{displayCount !== 1 ? "s" : ""} found
                  </>
                ) : (
                  <>
                    Showing{" "}
                    <span className="font-medium">
                      {startItem.toLocaleString()}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium">
                      {endItem.toLocaleString()}
                    </span>{" "}
                    of{" "}
                    <span className="font-medium">
                      {totalCount.toLocaleString()}
                    </span>{" "}
                    logs
                  </>
                )}
              </span>
            ) : (
              <span className="flex items-center space-x-2 text-gray-500">
                <AlertCircle className="w-4 h-4" />
                <span>No logs found</span>
              </span>
            )}
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              Clear search
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">
            Per page:
          </label>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs Display Area */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          // Loading skeleton
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 animate-pulse"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-5 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : displayLogs.length === 0 ? (
          // Empty state
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No logs found
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {searchQuery
                ? "Try adjusting your search query or filters"
                : "No logs match your current filters"}
            </p>
            {(searchQuery ||
              Object.keys(filters).some(
                (key) => filters[key as keyof LogQueryParams],
              )) && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  handleFiltersChange({});
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : viewMode === "card" ? (
          // Card View
          <div className="space-y-3">
            {displayLogs.map((log, index) => (
              <LogCard
                key={`${log.timestamp}-${log.service}-${index}`}
                log={log}
                onClick={() => handleLogClick(log)}
              />
            ))}
          </div>
        ) : (
          // Table View
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Trace
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {displayLogs.map((log, index) => {
                    const logId = `${log.timestamp}-${index}`;
                    return (
                      <tr
                        key={logId}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                        onClick={() => handleLogClick(log)}
                      >
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap font-mono">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              log.level === "error"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                                : log.level === "warn"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                                  : log.level === "info"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                    : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {log.level.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">
                          {log.service}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">
                          {log.event}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-md truncate font-mono text-xs">
                          {log.raw}
                        </td>
                        <td className="px-4 py-3">
                          {log.traceId && (
                            <code className="text-xs text-blue-600 dark:text-blue-400 font-mono">
                              {log.traceId.substring(0, 8)}...
                            </code>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(log.traceId || log.raw, logId);
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Copy trace ID or message"
                          >
                            {copiedId === logId ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!searchQuery && totalCount > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1 || totalPages === 0}
                className="p-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <ChevronsLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || totalPages === 0}
                className="p-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-1 flex-wrap justify-center">
              {totalPages > 0 &&
                getPageNumbers().map((pageNum, index) => {
                  if (pageNum === "...") {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-gray-500 dark:text-gray-400"
                      >
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
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
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
                className="p-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages || totalPages === 0}
                className="p-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <ChevronsRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="mt-3 text-center text-sm text-gray-500 dark:text-gray-400">
            Page {page} of {totalPages || 1}{" "}
            {totalCount > 0 && `(${totalCount.toLocaleString()} total logs)`}
          </div>
        </div>
      )}

      <LogDetailModal
        log={selectedLog}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
