import { Fragment, useState, useEffect, useMemo } from "react";
import { Dialog, Transition } from "@headlessui/react";
import {
  getTemplates,
  mineTemplates,
  deleteTemplate,
} from "../../api/logs/logAggregationApi";
import { useApp } from "../../context/AppContext";
import type {
  LogTemplate,
  TemplateMiningParams,
} from "../../types/logs/logAggregation.types";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  ChevronUp,
  Clipboard,
  Copy,
  Search,
  Filter,
  FileText,
  Activity,
  TrendingUp,
  Hash,
  RefreshCw,
  XCircle,
} from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const EVENT_TYPES = [
  "error",
  "warning",
  "http_request",
  "database",
  "authentication",
  "business_logic",
  "server_lifecycle",
  "infrastructure",
  "unknown",
];

export default function TemplatesPage() {
  const { addNotification } = useApp();
  const [allTemplates, setAllTemplates] = useState<LogTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [mining, setMining] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<LogTemplate | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [selectedFrequencyRange, setSelectedFrequencyRange] =
    useState<string>("");
  const [selectedEventType, setSelectedEventType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [expandedTemplates, setExpandedTemplates] = useState<Set<string>>(
    new Set(),
  );
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [selectedFrequencyRange, selectedEventType, searchQuery]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getTemplates();
      setAllTemplates(data || []);

      const uniqueEventTypes = Array.from(
        new Set(
          data.map((t) => t.eventType).filter((s): s is string => Boolean(s)),
        ),
      ).sort();
      setEventTypes(uniqueEventTypes);
    } catch (error: any) {
      console.error("Error loading templates:", error);
      const errorMessage =
        error.response?.data?.error ||
        error.message ||
        "Failed to load templates";
      setError(errorMessage);
      setAllTemplates([]);
      setEventTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = useMemo(() => {
    let filtered = [...allTemplates];

    // Apply frequency filter
    if (selectedFrequencyRange) {
      switch (selectedFrequencyRange) {
        case "very-high":
          filtered = filtered.filter((t) => t.frequency >= 1000);
          break;
        case "high":
          filtered = filtered.filter(
            (t) => t.frequency >= 500 && t.frequency < 1000,
          );
          break;
        case "medium":
          filtered = filtered.filter(
            (t) => t.frequency >= 100 && t.frequency < 500,
          );
          break;
        case "low":
          filtered = filtered.filter(
            (t) => t.frequency >= 10 && t.frequency < 100,
          );
          break;
        case "very-low":
          filtered = filtered.filter((t) => t.frequency < 10);
          break;
      }
    }

    // Apply event type filter
    if (selectedEventType) {
      filtered = filtered.filter((t) => t.eventType === selectedEventType);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.template.toLowerCase().includes(query) ||
          t.pattern.toLowerCase().includes(query) ||
          t.id.toLowerCase().includes(query) ||
          t.service?.toLowerCase().includes(query) ||
          t.eventType?.toLowerCase().includes(query) ||
          t.exampleLogs.some((log) => log.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }, [allTemplates, selectedFrequencyRange, selectedEventType, searchQuery]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalFrequency = allTemplates.reduce(
      (sum, t) => sum + t.frequency,
      0,
    );
    const avgFrequency =
      allTemplates.length > 0 ? totalFrequency / allTemplates.length : 0;

    // Count high frequency templates (frequency >= 1000)
    const highFrequencyCount = allTemplates.filter(
      (t) => t.frequency >= 1000,
    ).length;

    return {
      total: allTemplates.length,
      totalFrequency,
      avgFrequency: Math.round(avgFrequency),
      highFrequencyCount,
    };
  }, [allTemplates]);

  const getFrequencyColor = (frequency: number) => {
    if (frequency >= 1000)
      return "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
    if (frequency >= 500)
      return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300";
    if (frequency >= 100)
      return "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
    if (frequency >= 10)
      return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300";
    return "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300";
  };

  const getFrequencyLabel = (frequency: number) => {
    if (frequency >= 1000) return "Very High";
    if (frequency >= 500) return "High";
    if (frequency >= 100) return "Medium";
    if (frequency >= 10) return "Low";
    return "Very Low";
  };

  const paginatedTemplates = useMemo(() => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTemplates.slice(startIndex, endIndex);
  }, [filteredTemplates, page, pageSize]);

  const totalPages = Math.ceil(filteredTemplates.length / pageSize);
  const startItem =
    filteredTemplates.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, filteredTemplates.length);

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

  const handleMineTemplates = async () => {
    try {
      setMining(true);
      const params: TemplateMiningParams = {
        source: "aggregated",
        minClusterSize: 3,
        maxClusters: 50,
      };
      const result = await mineTemplates(params);
      console.log("Template mining result:", result);
      await loadTemplates();
      addNotification({
        type: "success",
        title: "Template mining completed",
        message: `Mined ${result.templates.length} templates.${result.reaggregated ? " Aggregated logs were rebuilt." : ""}`,
        autoClose: true,
      });
      if (result.reaggregationError) {
        addNotification({
          type: "warning",
          title: "Log re-aggregation failed",
          message: `${result.reaggregationError}. Template filters may be stale until you restart the log aggregation service.`,
          autoClose: false,
        });
      }
    } catch (error: any) {
      console.error("Error mining templates:", error);
      const errorMessage =
        error.response?.data?.error || error.message || "Unknown error";
      addNotification({
        type: "error",
        title: "Template mining failed",
        message: errorMessage,
        autoClose: false,
      });
    } finally {
      setMining(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      setDeleting(true);
      await deleteTemplate(id);
      await loadTemplates();
      addNotification({
        type: "success",
        title: "Template deleted",
        message: `Template ${id} was deleted successfully.`,
        autoClose: true,
      });
    } catch (error) {
      console.error("Error deleting template:", error);
      const errorMessage =
        (error as any)?.response?.data?.error ||
        (error as any)?.message ||
        "Failed to delete template";
      addNotification({
        type: "error",
        title: "Delete failed",
        message: errorMessage,
        autoClose: false,
      });
    } finally {
      setDeleting(false);
      setTemplateToDelete(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-6">
      <Transition appear show={templateToDelete != null} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => (deleting ? null : setTemplateToDelete(null))}
        >
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 transition-all">
                  <div className="p-5">
                    <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                      Delete template?
                    </Dialog.Title>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                      This will remove the template from disk and from the
                      templates list. This action cannot be undone.
                    </p>
                    {templateToDelete && (
                      <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3 text-sm">
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {templateToDelete.id}
                        </div>
                        <div className="mt-1 text-gray-600 dark:text-gray-300 line-clamp-2">
                          {templateToDelete.template}
                        </div>
                      </div>
                    )}
                    <div className="mt-5 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setTemplateToDelete(null)}
                        disabled={deleting}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() =>
                          templateToDelete &&
                          handleDeleteTemplate(templateToDelete.id)
                        }
                        disabled={deleting || !templateToDelete}
                        className="px-4 py-2 text-sm font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                      >
                        {deleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-blue-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Log Templates
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Discover patterns and analyze log structures across your services
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadTemplates}
              disabled={loading}
              className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
              title="Refresh templates"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <button
              onClick={handleMineTemplates}
              disabled={mining}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <TrendingUp
                className={`w-4 h-4 ${mining ? "animate-pulse" : ""}`}
              />
              {mining ? "Mining Templates..." : "Mine New Templates"}
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {!loading && allTemplates.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Templates
                </p>
                <Hash className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.total.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {filteredTemplates.length !== statistics.total &&
                  `${filteredTemplates.length.toLocaleString()} filtered`}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Events
                </p>
                <Activity className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.totalFrequency.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Logged instances
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Avg Frequency
                </p>
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.avgFrequency.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Per template
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  High Frequency
                </p>
                <Activity className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {statistics.highFrequencyCount.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                Templates ≥ 1000 events
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium transition-colors"
          >
            <Filter className="w-5 h-5" />
            <span>Filters & Search</span>
            {showFilters ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            {(selectedFrequencyRange || selectedEventType || searchQuery) && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                Active
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="p-4 space-y-4">
            {/* Search Bar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Templates
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by template, pattern, ID, service, or event type..."
                  className="w-full pl-10 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Frequency
                </label>
                <select
                  value={selectedFrequencyRange}
                  onChange={(e) => setSelectedFrequencyRange(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">All Frequencies</option>
                  <option value="very-high">🔴 Very High (≥1000)</option>
                  <option value="high">🟠 High (500-999)</option>
                  <option value="medium">🟡 Medium (100-499)</option>
                  <option value="low">🔵 Low (10-99)</option>
                  <option value="very-low">⚪ Very Low (&lt;10)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Filter by Event Type
                </label>
                <select
                  value={selectedEventType}
                  onChange={(e) => setSelectedEventType(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  <option value="">All Event Types</option>
                  {eventTypes.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {eventType
                        .replace("_", " ")
                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Templates Per Page
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} templates
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters Summary and Clear Button */}
            {(selectedFrequencyRange || selectedEventType || searchQuery) && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Active filters:
                  </span>
                  {searchQuery && (
                    <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md flex items-center gap-1">
                      Search: "{searchQuery.substring(0, 20)}
                      {searchQuery.length > 20 ? "..." : ""}"
                    </span>
                  )}
                  {selectedFrequencyRange && (
                    <span className="px-2 py-1 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-md">
                      Frequency:{" "}
                      {getFrequencyLabel(
                        selectedFrequencyRange === "very-high"
                          ? 1000
                          : selectedFrequencyRange === "high"
                            ? 500
                            : selectedFrequencyRange === "medium"
                              ? 100
                              : selectedFrequencyRange === "low"
                                ? 10
                                : 1,
                      )}
                    </span>
                  )}
                  {selectedEventType && (
                    <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-md">
                      Type: {selectedEventType}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedFrequencyRange("");
                    setSelectedEventType("");
                    setSearchQuery("");
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {loading ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Loading templates...</span>
            </div>
          ) : filteredTemplates.length > 0 ? (
            <div className="flex items-center gap-1 flex-wrap">
              <span>Showing</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {startItem.toLocaleString()}
              </span>
              <span>to</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {endItem.toLocaleString()}
              </span>
              <span>of</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {filteredTemplates.length.toLocaleString()}
              </span>
              <span>templates</span>
              {filteredTemplates.length !== allTemplates.length && (
                <span className="text-blue-600 dark:text-blue-400">
                  (filtered from {allTemplates.length.toLocaleString()} total)
                </span>
              )}
            </div>
          ) : (
            <span className="flex items-center gap-2">
              <XCircle className="w-4 h-4" />
              No templates found
            </span>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
                Error Loading Templates
              </p>
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
              Loading templates...
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Please wait while we fetch your log templates
            </p>
          </div>
        </div>
      ) : filteredTemplates.length === 0 ? (
        /* Empty State */
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <FileText className="w-10 h-10 text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
              {error
                ? "Failed to load templates"
                : allTemplates.length === 0
                  ? "No templates available"
                  : "No templates match your filters"}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md">
              {allTemplates.length === 0
                ? "Start by mining templates from your aggregated logs to discover patterns"
                : "Try adjusting your filters or search query to find templates"}
            </p>
            {allTemplates.length === 0 && !error && (
              <button
                onClick={handleMineTemplates}
                disabled={mining}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <TrendingUp
                  className={`w-5 h-5 ${mining ? "animate-pulse" : ""}`}
                />
                {mining
                  ? "Mining Templates..."
                  : "Mine Templates from Aggregated Logs"}
              </button>
            )}
            {allTemplates.length > 0 && (
              <button
                onClick={() => {
                  setSelectedFrequencyRange("");
                  setSelectedEventType("");
                  setSearchQuery("");
                }}
                className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Template Cards */
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

              const frequencyColor = getFrequencyColor(template.frequency);
              const frequencyLabel = getFrequencyLabel(template.frequency);

              return (
                <div
                  key={template.id}
                  className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200"
                >
                  {/* Template Header */}
                  <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            Template #
                            {template.id.split("-")[1] ||
                              template.id.substring(0, 8)}
                          </h3>
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${frequencyColor}`}
                          >
                            {frequencyLabel}
                          </span>
                          {template.frequency && (
                            <span className="px-3 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full flex items-center gap-1">
                              <Activity className="w-3 h-3" />
                              {template.frequency.toLocaleString()} events
                            </span>
                          )}
                          {template.service && (
                            <span className="px-3 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full">
                              📦 {template.service}
                            </span>
                          )}
                          {template.eventType && (
                            <span className="px-3 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                              {template.eventType}
                            </span>
                          )}
                        </div>

                        {/* Template ID with copy */}
                        <div className="flex items-center gap-2 mb-3">
                          <code className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded">
                            {template.id}
                          </code>
                          <button
                            onClick={() => copyToClipboard(template.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                            title="Copy Template ID"
                          >
                            <Clipboard className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Template Pattern */}
                        <div className="relative group">
                          <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <p className="text-sm font-mono text-gray-800 dark:text-gray-200 break-all leading-relaxed">
                              {template.template}
                            </p>
                          </div>
                          <button
                            onClick={() => copyToClipboard(template.template)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 bg-white dark:bg-gray-800 p-1.5 rounded shadow-md transition-all"
                            title="Copy Template"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-4 mt-4 text-xs text-gray-600 dark:text-gray-400 flex-wrap">
                          {template.metadata?.parameterCount !== undefined && (
                            <div className="flex items-center gap-1">
                              <Hash className="w-3.5 h-3.5" />
                              <span className="font-medium">
                                {template.metadata.parameterCount}
                              </span>
                              <span>parameters</span>
                            </div>
                          )}
                          {template.metadata?.avgLength && (
                            <div className="flex items-center gap-1">
                              <span>Avg length:</span>
                              <span className="font-medium">
                                {template.metadata.avgLength}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span>Last seen:</span>
                            <span className="font-medium">
                              {format(new Date(template.lastSeen), "PPp")}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span>Created:</span>
                            <span className="font-medium">
                              {format(new Date(template.createdAt), "PP")}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-start gap-2 ml-4">
                        <button
                          onClick={toggleExpand}
                          className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                          title={
                            isExpanded ? "Collapse details" : "Expand details"
                          }
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                        <button
                          onClick={() => setTemplateToDelete(template)}
                          className="text-red-600 dark:text-red-400 hover:text-white hover:bg-red-600 dark:hover:bg-red-500 text-sm font-medium px-3 py-2 rounded-lg transition-all"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="p-6 space-y-5 bg-gray-50 dark:bg-gray-900/50">
                      {/* Regex Pattern */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <span className="w-1 h-4 bg-blue-500 rounded"></span>
                            Regex Pattern
                          </p>
                          <button
                            onClick={() => copyToClipboard(template.pattern)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 text-xs transition-colors"
                            title="Copy Pattern"
                          >
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                          <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all block">
                            {template.pattern}
                          </code>
                        </div>
                      </div>

                      {/* Parameterized Log */}
                      {template.parameterizedLog && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <span className="w-1 h-4 bg-green-500 rounded"></span>
                              Parameterized Log
                            </p>
                            <button
                              onClick={() =>
                                copyToClipboard(template.parameterizedLog)
                              }
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 text-xs transition-colors"
                              title="Copy Parameterized Log"
                            >
                              <Copy className="w-4 h-4" />
                              <span>Copy</span>
                            </button>
                          </div>
                          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                            <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all block">
                              {template.parameterizedLog}
                            </code>
                          </div>
                        </div>
                      )}

                      {/* Metadata Section */}
                      {template.metadata && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-purple-500 rounded"></span>
                            Metadata
                          </p>
                          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {template.metadata.avgLength !== undefined && (
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                    <span className="text-lg">📏</span>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      Average Length
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                      {template.metadata.avgLength} chars
                                    </p>
                                  </div>
                                </div>
                              )}
                              {template.metadata.parameterCount !==
                                undefined && (
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                                    <Hash className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      Parameter Count
                                    </p>
                                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                      {template.metadata.parameterCount} params
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Parameter Types */}
                            {template.metadata.parameterTypes &&
                              Object.keys(template.metadata.parameterTypes)
                                .length > 0 && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                    Parameter Types:
                                  </p>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {Object.entries(
                                      template.metadata.parameterTypes,
                                    ).map(([param, type]) => (
                                      <div
                                        key={param}
                                        className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded"
                                      >
                                        <code className="text-xs font-mono text-gray-600 dark:text-gray-400 font-semibold">
                                          {param}
                                        </code>
                                        <span className="text-xs text-gray-400">
                                          →
                                        </span>
                                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                          {type}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        </div>
                      )}

                      {/* Example Logs */}
                      {template.exampleLogs.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-orange-500 rounded"></span>
                            Example Logs
                            <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                              ({template.exampleLogs.length} total)
                            </span>
                          </p>
                          <div className="space-y-2 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                            {template.exampleLogs.map((example, index) => (
                              <div key={index} className="relative group">
                                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-gray-400 dark:text-gray-500 mt-1 flex-shrink-0">
                                      {index + 1}.
                                    </span>
                                    <code className="text-xs font-mono text-gray-700 dark:text-gray-300 break-all flex-1">
                                      {example}
                                    </code>
                                    <button
                                      onClick={() => copyToClipboard(example)}
                                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all flex-shrink-0"
                                      title="Copy Example Log"
                                    >
                                      <Clipboard className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Preview when collapsed */}
                  {!isExpanded && template.exampleLogs.length > 0 && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2 flex items-center gap-2">
                        📋 Example Preview
                        <span className="text-gray-400 dark:text-gray-500">
                          (click expand for all {template.exampleLogs.length}{" "}
                          examples)
                        </span>
                      </p>
                      <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                        <code className="text-xs font-mono text-gray-600 dark:text-gray-400 break-all block">
                          {template.exampleLogs[0]}
                        </code>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="px-6 py-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  {/* Previous buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(1)}
                      disabled={page === 1 || totalPages === 0}
                      className="p-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:border-blue-400 dark:hover:border-blue-600"
                      title="First page"
                    >
                      <ChevronsLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1 || totalPages === 0}
                      className="p-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:border-blue-400 dark:hover:border-blue-600"
                      title="Previous page"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Page numbers */}
                  <div className="flex items-center gap-1 flex-wrap justify-center">
                    {totalPages > 0 &&
                      getPageNumbers().map((pageNum, index) => {
                        if (pageNum === "...") {
                          return (
                            <span
                              key={`ellipsis-${index}`}
                              className="px-2 text-gray-400 dark:text-gray-500"
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
                            className={`min-w-[2.5rem] px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                              page === pageNumber
                                ? "bg-blue-600 text-white shadow-md hover:bg-blue-700"
                                : "text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-400 dark:hover:border-blue-600"
                            }`}
                          >
                            {pageNumber}
                          </button>
                        );
                      })}
                  </div>

                  {/* Next buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages || totalPages === 0}
                      className="p-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:border-blue-400 dark:hover:border-blue-600"
                      title="Next page"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPage(totalPages)}
                      disabled={page === totalPages || totalPages === 0}
                      className="p-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:border-blue-400 dark:hover:border-blue-600"
                      title="Last page"
                    >
                      <ChevronsRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Pagination info */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Page{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {page}
                    </span>{" "}
                    of{" "}
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {totalPages || 1}
                    </span>
                    {filteredTemplates.length > 0 && (
                      <>
                        {" "}
                        • Showing{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {(page - 1) * pageSize + 1}
                        </span>{" "}
                        -{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {Math.min(page * pageSize, filteredTemplates.length)}
                        </span>{" "}
                        of{" "}
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {filteredTemplates.length.toLocaleString()}
                        </span>{" "}
                        templates
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        
        .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  );
}
