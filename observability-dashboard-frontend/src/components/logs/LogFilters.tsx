import { useState, useEffect } from "react";
import {
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  Server,
  AlertTriangle,
  FileText,
  Link2,
  Calendar,
  Eye,
  Trash2,
} from "lucide-react";
import type {
  LogQueryParams,
  LogTemplate,
} from "../../types/logs/logAggregation.types";

interface LogFiltersProps {
  filters: LogQueryParams;
  onFiltersChange: (filters: LogQueryParams) => void;
  services: string[];
  templates?: LogTemplate[];
}

export default function LogFilters({
  filters,
  onFiltersChange,
  services,
  templates = [],
}: LogFiltersProps) {
  const [localFilters, setLocalFilters] = useState<LogQueryParams>(filters);
  const [collapsed, setCollapsed] = useState(false);

  // Sync localFilters when filters prop changes (e.g., when cleared from parent)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleChange = (key: keyof LogQueryParams, value: any) => {
    // Handle boolean values for piiRedacted
    if (key === "piiRedacted") {
      const newFilters = {
        ...localFilters,
        [key]: value === "" ? undefined : value === "true",
      };
      setLocalFilters(newFilters);
      onFiltersChange(newFilters);
    } else {
      const newFilters = { ...localFilters, [key]: value || undefined };
      setLocalFilters(newFilters);
      onFiltersChange(newFilters);
    }
  };

  // Helper function to convert ISO string to datetime-local format
  const toLocalDateTimeString = (isoString?: string): string => {
    if (!isoString) return "";
    try {
      const date = new Date(isoString);
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return "";
    }
  };

  // Helper function to convert datetime-local value to ISO string
  const fromLocalDateTimeString = (
    localDateTime: string,
  ): string | undefined => {
    if (!localDateTime) return undefined;
    try {
      const date = new Date(localDateTime);
      return date.toISOString();
    } catch {
      return undefined;
    }
  };

  const clearFilters = () => {
    const cleared = {};
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const clearFilterGroup = (group: string) => {
    if (group === "service") {
      const newFilters = {
        ...localFilters,
        service: undefined,
        level: undefined,
        templateId: undefined,
        piiRedacted: undefined,
      };
      setLocalFilters(newFilters);
      onFiltersChange(newFilters);
    } else if (group === "correlation") {
      const newFilters = {
        ...localFilters,
        event: undefined,
        traceId: undefined,
        sessionId: undefined,
      };
      setLocalFilters(newFilters);
      onFiltersChange(newFilters);
    } else if (group === "time") {
      const newFilters = {
        ...localFilters,
        startTime: undefined,
        endTime: undefined,
      };
      setLocalFilters(newFilters);
      onFiltersChange(newFilters);
    }
  };

  const levels = ["error", "warn", "info", "debug"];

  // Count active filters
  const activeFilterCount = Object.values(localFilters).filter(
    (value) => value !== undefined && value !== null && value !== "",
  ).length;

  // Count filters per group
  const serviceFiltersCount = [
    localFilters.service,
    localFilters.level,
    localFilters.templateId,
    localFilters.piiRedacted,
  ].filter((v) => v !== undefined && v !== null && v !== "").length;
  const correlationFiltersCount = [
    localFilters.event,
    localFilters.traceId,
    localFilters.sessionId,
  ].filter((v) => v !== undefined && v !== null && v !== "").length;
  const timeFiltersCount = [
    localFilters.startTime,
    localFilters.endTime,
  ].filter((v) => v !== undefined && v !== null && v !== "").length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg shadow-gray-200/50 dark:shadow-gray-900/50 hover:shadow-xl hover:shadow-gray-300/50 dark:hover:shadow-gray-900/70 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 via-gray-50/80 to-gray-50 dark:from-gray-800/80 dark:via-gray-800/50 dark:to-gray-800/80 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 hover:scale-110 hover:shadow-md"
            aria-label={collapsed ? "Expand filters" : "Collapse filters"}
          >
            {collapsed ? (
              <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>
          <div className="flex items-center space-x-2.5">
            <div className="p-1 bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500 rounded-md shadow-sm">
              <Filter className="w-3.5 h-3.5 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Filters
            </h3>
          </div>
          {activeFilterCount > 0 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gradient-to-r from-indigo-100 to-indigo-50 dark:from-indigo-900/40 dark:to-indigo-900/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-sm">
              {activeFilterCount}
            </span>
          )}
        </div>
        {activeFilterCount > 0 && (
          <button
            onClick={clearFilters}
            className="flex items-center space-x-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium transition-all duration-200 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:shadow-md hover:scale-105"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* Filter Content */}
      {!collapsed && (
        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Service & Context Filters */}
            <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50/50 via-white to-blue-50/30 dark:from-gray-800/50 dark:via-gray-800/30 dark:to-gray-800/50 rounded-xl border border-blue-200/50 dark:border-gray-700 shadow-md shadow-blue-100/50 dark:shadow-gray-900/30 hover:shadow-lg hover:shadow-blue-200/50 dark:hover:shadow-gray-900/40 hover:border-blue-300/60 dark:hover:border-gray-600 transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 rounded-lg shadow-sm">
                    <Server className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                    Service & Context
                  </h4>
                  {serviceFiltersCount > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 shadow-sm border border-blue-200 dark:border-blue-800">
                      {serviceFiltersCount}
                    </span>
                  )}
                </div>
                {serviceFiltersCount > 0 && (
                  <button
                    onClick={() => clearFilterGroup("service")}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 hover:scale-110 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Clear service filters"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Service
                  </label>
                  <select
                    value={localFilters.service || ""}
                    onChange={(e) => handleChange("service", e.target.value)}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-sm"
                  >
                    <option value="">All Services</option>
                    {services.map((service) => (
                      <option key={service} value={service}>
                        {service}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Log Level</span>
                  </label>
                  <select
                    value={localFilters.level || ""}
                    onChange={(e) => handleChange("level", e.target.value)}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-sm"
                  >
                    <option value="">All Levels</option>
                    {levels.map((level) => (
                      <option key={level} value={level}>
                        {level.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Template</span>
                  </label>
                  <select
                    value={localFilters.templateId || ""}
                    onChange={(e) => handleChange("templateId", e.target.value)}
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-sm"
                  >
                    <option value="">All Templates</option>
                    {templates.map((template) => {
                      const templateNum =
                        template.id.split("-")[1] || template.id;
                      const serviceLabel = template.service
                        ? ` [${template.service}]`
                        : "";
                      const templatePreview =
                        template.template.length > 35
                          ? template.template.substring(0, 35) + "..."
                          : template.template;
                      return (
                        <option
                          key={template.id}
                          value={template.id}
                          title={template.template}
                        >
                          #{templateNum}
                          {serviceLabel} - {templatePreview}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="flex items-center space-x-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>PII Status</span>
                  </label>
                  <select
                    value={
                      localFilters.piiRedacted === undefined
                        ? ""
                        : localFilters.piiRedacted
                          ? "true"
                          : "false"
                    }
                    onChange={(e) =>
                      handleChange("piiRedacted", e.target.value)
                    }
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md shadow-sm"
                  >
                    <option value="">All Logs</option>
                    <option value="true">PII Redacted</option>
                    <option value="false">Not Redacted</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Correlation IDs */}
            <div className="space-y-4 p-4 bg-gradient-to-br from-purple-50/50 via-white to-purple-50/30 dark:from-gray-800/50 dark:via-gray-800/30 dark:to-gray-800/50 rounded-xl border border-purple-200/50 dark:border-gray-700 shadow-md shadow-purple-100/50 dark:shadow-gray-900/30 hover:shadow-lg hover:shadow-purple-200/50 dark:hover:shadow-gray-900/40 hover:border-purple-300/60 dark:hover:border-gray-600 transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500 rounded-lg shadow-sm">
                    <Link2 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                    Correlation IDs
                  </h4>
                  {correlationFiltersCount > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 shadow-sm border border-purple-200 dark:border-purple-800">
                      {correlationFiltersCount}
                    </span>
                  )}
                </div>
                {correlationFiltersCount > 0 && (
                  <button
                    onClick={() => clearFilterGroup("correlation")}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 hover:scale-110 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Clear correlation filters"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Event Name
                  </label>
                  <input
                    type="text"
                    value={localFilters.event || ""}
                    onChange={(e) => handleChange("event", e.target.value)}
                    placeholder="e.g., order.created"
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Trace ID
                  </label>
                  <input
                    type="text"
                    value={localFilters.traceId || ""}
                    onChange={(e) => handleChange("traceId", e.target.value)}
                    placeholder="Enter trace ID"
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Session ID
                  </label>
                  <input
                    type="text"
                    value={localFilters.sessionId || ""}
                    onChange={(e) => handleChange("sessionId", e.target.value)}
                    placeholder="Enter session ID"
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 font-mono focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-md shadow-sm"
                  />
                </div>
              </div>
            </div>

            {/* Time Range */}
            <div className="space-y-4 p-4 bg-gradient-to-br from-green-50/50 via-white to-green-50/30 dark:from-gray-800/50 dark:via-gray-800/30 dark:to-gray-800/50 rounded-xl border border-green-200/50 dark:border-gray-700 shadow-md shadow-green-100/50 dark:shadow-gray-900/30 hover:shadow-lg hover:shadow-green-200/50 dark:hover:shadow-gray-900/40 hover:border-green-300/60 dark:hover:border-gray-600 transition-all duration-300 hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-gradient-to-br from-green-500 to-green-600 dark:from-green-400 dark:to-green-500 rounded-lg shadow-sm">
                    <Calendar className="w-3.5 h-3.5 text-white" />
                  </div>
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-gray-100 uppercase tracking-wide">
                    Time Range
                  </h4>
                  {timeFiltersCount > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 shadow-sm border border-green-200 dark:border-green-800">
                      {timeFiltersCount}
                    </span>
                  )}
                </div>
                {timeFiltersCount > 0 && (
                  <button
                    onClick={() => clearFilterGroup("time")}
                    className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-all duration-200 hover:scale-110 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Clear time filters"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={toLocalDateTimeString(localFilters.startTime)}
                    onChange={(e) =>
                      handleChange(
                        "startTime",
                        fromLocalDateTimeString(e.target.value),
                      )
                    }
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-green-400 dark:hover:border-green-500 hover:shadow-md shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={toLocalDateTimeString(localFilters.endTime)}
                    onChange={(e) =>
                      handleChange(
                        "endTime",
                        fromLocalDateTimeString(e.target.value),
                      )
                    }
                    className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 hover:border-green-400 dark:hover:border-green-500 hover:shadow-md shadow-sm"
                  />
                </div>

                {(localFilters.startTime || localFilters.endTime) && (
                  <div className="mt-3 p-2.5 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-sm">
                    <p className="text-xs text-green-800 dark:text-green-200 font-medium">
                      {localFilters.startTime && localFilters.endTime ? (
                        <>
                          <span className="block text-gray-600 dark:text-gray-400 mb-1">
                            Active Range:
                          </span>
                          {new Date(localFilters.startTime).toLocaleString()}
                          <br />
                          to {new Date(localFilters.endTime).toLocaleString()}
                        </>
                      ) : localFilters.startTime ? (
                        <>
                          After{" "}
                          {new Date(localFilters.startTime).toLocaleString()}
                        </>
                      ) : (
                        <>
                          Before{" "}
                          {new Date(localFilters.endTime!).toLocaleString()}
                        </>
                      )}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
