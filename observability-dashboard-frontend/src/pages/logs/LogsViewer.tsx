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
  const [isExporting, setIsExporting] = useState(false);
  const refreshTimerRef = useRef<number | null>(null);

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

  const handleExport = async (format: "json" | "csv") => {
    try {
      setIsExporting(true);

      // Check if any filters are active (excluding limit, offset, and search query)
      const hasActiveFilters = !!(
        filters.service ||
        filters.level ||
        filters.event ||
        filters.traceId ||
        filters.sessionId ||
        filters.templateId ||
        filters.startTime ||
        filters.endTime ||
        filters.piiRedacted !== undefined
      );

      let dataToExport: StructuredLog[];

      if (!hasActiveFilters && !searchQuery.trim()) {
        // No filters active - fetch ALL logs from the system
        console.log("Exporting all logs from the system...");
        const response = await queryLogs({
          limit: 1000000, // Large limit to get all logs
        });
        dataToExport = response.logs;
        console.log(`Fetched ${dataToExport.length} logs for export`);
      } else {
        // Filters are active - use current filtered/displayed results
        dataToExport = searchQuery.trim() ? filteredLogs : logs;
        console.log(`Exporting ${dataToExport.length} filtered logs`);
      }

      if (dataToExport.length === 0) {
        alert("No logs to export");
        return;
      }

      if (format === "json") {
        const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        const fileName =
          hasActiveFilters || searchQuery.trim()
            ? `logs-filtered-${new Date().toISOString()}.json`
            : `logs-complete-${new Date().toISOString()}.json`;
        a.download = fileName;
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
        const fileName =
          hasActiveFilters || searchQuery.trim()
            ? `logs-filtered-${new Date().toISOString()}.csv`
            : `logs-complete-${new Date().toISOString()}.csv`;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error("Error exporting logs:", error);
      alert("Failed to export logs. Please try again.");
    } finally {
      setIsExporting(false);
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

  // Count active filters
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) =>
      key !== "limit" &&
      key !== "offset" &&
      value !== undefined &&
      value !== null &&
      value !== "",
  ).length;

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
    <div className="h-full flex flex-col space-y-5 p-1">
      {/* Header Section */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Logs Viewer
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 font-medium">
            Real-time log aggregation and analysis from all services
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Auto-refresh toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-2.5 px-4 py-2.5 rounded-xl border-2 font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${
              autoRefresh
                ? "bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/50 dark:to-green-950/50 border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-300 shadow-emerald-200/50 dark:shadow-emerald-900/20"
                : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-600"
            }`}
            title={
              autoRefresh ? "Auto-refresh enabled" : "Auto-refresh disabled"
            }
          >
            <RefreshCw
              className={`w-4 h-4 ${autoRefresh ? "animate-spin" : ""}`}
            />
            <span className="text-sm">
              {autoRefresh ? `Auto (${refreshInterval / 1000}s)` : "Manual"}
            </span>
          </button>

          {/* Export button */}
          <div className="relative group">
            <button
              className={`flex items-center space-x-2.5 px-4 py-2.5 bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 border-2 border-gray-300 dark:border-gray-600 rounded-xl hover:border-indigo-400 dark:hover:border-indigo-600 text-gray-700 dark:text-gray-300 transition-all duration-300 shadow-sm hover:shadow-md font-semibold ${isExporting ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Exporting...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span className="text-sm">Export</span>
                </>
              )}
            </button>
            {!isExporting && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                    {activeFilterCount > 0 || searchQuery.trim()
                      ? `Export ${displayCount} filtered logs`
                      : `Export all logs (${totalCount} total)`}
                  </p>
                </div>
                <button
                  onClick={() => handleExport("json")}
                  className="w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-950/50 dark:hover:to-purple-950/50 font-medium transition-all"
                >
                  JSON Format
                </button>
                <button
                  onClick={() => handleExport("csv")}
                  className="w-full px-4 py-2.5 text-sm text-left text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-950/50 dark:hover:to-purple-950/50 font-medium transition-all"
                >
                  CSV Format
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Bar */}
      <div className="flex items-center justify-between gap-4 bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-850 rounded-xl border-2 border-gray-200/80 dark:border-gray-700/80 p-4 shadow-sm">
        {/* Search Bar */}
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs... (message, trace ID, event, etc.)"
              className="w-full pl-11 pr-4 py-2.5 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 dark:focus:border-indigo-500 transition-all font-medium"
            />
          </div>
        </div>

        {/* Quick Time Ranges */}
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
          {TIME_RANGES.map((range) => (
            <button
              key={range.label}
              onClick={() => handleQuickTimeRange(range.value)}
              className="px-3 py-2 text-xs font-bold bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-750 text-gray-700 dark:text-gray-300 rounded-lg hover:from-indigo-100 hover:to-purple-100 dark:hover:from-indigo-900/50 dark:hover:to-purple-900/50 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all duration-300 shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-600"
            >
              {range.label}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-1 bg-gray-200 dark:bg-gray-700 rounded-xl p-1.5 shadow-inner">
          <button
            onClick={() => setViewMode("card")}
            className={`p-2.5 rounded-lg transition-all duration-300 ${
              viewMode === "card"
                ? "bg-gradient-to-br from-white to-gray-50 dark:from-gray-600 dark:to-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md scale-105"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
            }`}
            title="Card view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-2.5 rounded-lg transition-all duration-300 ${
              viewMode === "table"
                ? "bg-gradient-to-br from-white to-gray-50 dark:from-gray-600 dark:to-gray-700 text-indigo-600 dark:text-indigo-400 shadow-md scale-105"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
            }`}
            title="Table view"
          >
            <LayoutList className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl border-2 transition-all duration-300 font-semibold shadow-sm hover:shadow-md ${
            showFilters
              ? "bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/50 dark:to-purple-950/50 border-indigo-400 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300"
              : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-600"
          }`}
        >
          <Filter className="w-4 h-4" />
          <span className="text-sm">Filters</span>
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
      <div className="flex items-center justify-between px-5 py-3 bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 rounded-xl border-2 border-gray-200/80 dark:border-gray-700/80 shadow-sm">
        <div className="flex items-center space-x-5">
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            {loading ? (
              <span className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent font-bold">
                  Loading...
                </span>
              </span>
            ) : displayCount > 0 ? (
              <span>
                {searchQuery ? (
                  <>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-base">
                      {displayCount}
                    </span>{" "}
                    <span className="text-gray-700 dark:text-gray-300">
                      result{displayCount !== 1 ? "s" : ""} found
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-gray-700 dark:text-gray-300">
                      Showing
                    </span>{" "}
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {startItem.toLocaleString()}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {" "}
                      to{" "}
                    </span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {endItem.toLocaleString()}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {" "}
                      of{" "}
                    </span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {totalCount.toLocaleString()}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {" "}
                      logs
                    </span>
                  </>
                )}
              </span>
            ) : (
              <span className="flex items-center space-x-2 text-gray-500">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                <span className="font-semibold">No logs found</span>
              </span>
            )}
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold px-3 py-1 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all"
            >
              Clear search
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2.5">
          <label className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
            Per page:
          </label>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
            className="text-sm border-2 border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold transition-all"
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
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="relative bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-850 rounded-xl border-2 border-gray-200/80 dark:border-gray-700/80 p-5 animate-pulse overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-300 to-purple-300 dark:from-indigo-600 dark:to-purple-600"></div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="h-6 w-20 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg"></div>
                  <div className="h-6 w-36 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg"></div>
                  <div className="h-6 w-28 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg"></div>
                </div>
                <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg w-3/4 mb-3"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg w-full mb-2"></div>
                <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg w-5/6"></div>
              </div>
            ))}
          </div>
        ) : displayLogs.length === 0 ? (
          // Empty state
          <div className="text-center py-20 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-850 rounded-xl border-2 border-gray-200/80 dark:border-gray-700/80 shadow-inner">
            <div className="w-20 h-20 mx-auto mb-5 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-3xl flex items-center justify-center shadow-lg">
              <AlertCircle className="w-10 h-10 text-amber-500 dark:text-amber-400" />
            </div>
            <p className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-2">
              No logs found
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 font-medium">
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
                className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl font-bold"
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
          <div className="bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-800 dark:to-gray-850 rounded-xl border-2 border-gray-200/80 dark:border-gray-700/80 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-900/90 dark:to-gray-900 border-b-2 border-indigo-200 dark:border-gray-700">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      Service
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-pink-700 dark:text-pink-300 uppercase tracking-wider">
                      Message
                    </th>
                    <th className="px-5 py-4 text-left text-xs font-bold text-pink-700 dark:text-pink-300 uppercase tracking-wider">
                      Trace
                    </th>
                    <th className="px-5 py-4 text-right text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
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
                        className="hover:bg-gradient-to-r hover:from-indigo-50/50 hover:to-purple-50/50 dark:hover:from-indigo-900/20 dark:hover:to-purple-900/20 transition-all duration-200 cursor-pointer border-l-4 border-transparent hover:border-indigo-400 dark:hover:border-indigo-500"
                        onClick={() => handleLogClick(log)}
                      >
                        <td className="px-5 py-4 text-xs text-gray-700 dark:text-gray-300 whitespace-nowrap font-mono font-semibold">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm ${
                              log.level === "error"
                                ? "bg-gradient-to-r from-red-100 to-red-200 text-red-800 dark:from-red-900/40 dark:to-red-800/40 dark:text-red-300"
                                : log.level === "warn"
                                  ? "bg-gradient-to-r from-yellow-100 to-amber-200 text-yellow-800 dark:from-yellow-900/40 dark:to-amber-800/40 dark:text-yellow-300"
                                  : log.level === "info"
                                    ? "bg-gradient-to-r from-blue-100 to-cyan-200 text-blue-800 dark:from-blue-900/40 dark:to-cyan-800/40 dark:text-blue-300"
                                    : "bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 dark:from-gray-700 dark:to-gray-600 dark:text-gray-300"
                            }`}
                          >
                            {log.level.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-900 dark:text-gray-100 font-bold whitespace-nowrap">
                          {log.service}
                        </td>
                        <td className="px-5 py-4 text-gray-700 dark:text-gray-300 font-semibold">
                          {log.event}
                        </td>
                        <td className="px-5 py-4 text-gray-600 dark:text-gray-400 max-w-md truncate font-mono text-xs">
                          {log.raw}
                        </td>
                        <td className="px-5 py-4">
                          {log.traceId && (
                            <code className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded font-semibold">
                              {log.traceId.substring(0, 8)}...
                            </code>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(log.traceId || log.raw, logId);
                            }}
                            className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all duration-200 hover:scale-110"
                            title="Copy trace ID or message"
                          >
                            {copiedId === logId ? (
                              <CheckCircle2 className="w-5 h-5 text-green-500" />
                            ) : (
                              <Copy className="w-5 h-5" />
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
        <div className="bg-gradient-to-r from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 rounded-xl border-2 border-gray-200/80 dark:border-gray-700/80 px-6 py-5 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1 || totalPages === 0}
                className="p-2.5 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-300 dark:border-indigo-600 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-md"
                title="First page"
              >
                <ChevronsLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || totalPages === 0}
                className="p-2.5 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-300 dark:border-indigo-600 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-md"
                title="Previous page"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center space-x-2 flex-wrap justify-center">
              {totalPages > 0 &&
                getPageNumbers().map((pageNum, index) => {
                  if (pageNum === "...") {
                    return (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-3 text-gray-500 dark:text-gray-400 font-bold text-lg"
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
                      className={`px-4 py-2.5 text-sm font-bold rounded-xl transition-all duration-200 ${
                        page === pageNumber
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-110"
                          : "text-gray-700 dark:text-gray-300 border-2 border-gray-300 dark:border-gray-600 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 hover:border-indigo-300 dark:hover:border-indigo-600 hover:scale-105 hover:shadow-md"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
                className="p-2.5 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-300 dark:border-indigo-600 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-md"
                title="Next page"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages || totalPages === 0}
                className="p-2.5 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-300 dark:border-indigo-600 rounded-xl hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 dark:hover:from-indigo-900/30 dark:hover:to-purple-900/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 hover:scale-105 hover:shadow-md"
                title="Last page"
              >
                <ChevronsRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="mt-4 text-center text-sm font-semibold">
            <span className="text-gray-700 dark:text-gray-300">Page </span>
            <span className="text-indigo-600 dark:text-indigo-400 text-base">
              {page}
            </span>
            <span className="text-gray-700 dark:text-gray-300"> of </span>
            <span className="text-purple-600 dark:text-purple-400 text-base">
              {totalPages || 1}
            </span>
            {totalCount > 0 && (
              <>
                <span className="text-gray-500 dark:text-gray-400 mx-2">•</span>
                <span className="text-gray-600 dark:text-gray-400">
                  {totalCount.toLocaleString()} total logs
                </span>
              </>
            )}
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
