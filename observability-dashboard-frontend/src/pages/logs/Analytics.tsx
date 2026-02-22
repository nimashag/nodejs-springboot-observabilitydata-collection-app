import { useState, useEffect, useMemo } from "react";
import { queryLogs } from "../../api/logs/logAggregationApi";
import type { StructuredLog } from "../../types/logs/logAggregation.types";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Server,
  Zap,
  FileText,
  RefreshCw,
  Calendar,
  Hash,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

type TimeRange = "1h" | "6h" | "24h" | "7d" | "30d" | "all";

export default function Analytics() {
  const [logs, setLogs] = useState<StructuredLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("24h");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await queryLogs({ limit: 50000 });
      setLogs(response.logs);
      setTotalCount(response.count);
    } catch (error) {
      console.error("Error loading analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  // Filter logs based on time range
  const filteredLogs = useMemo(() => {
    if (timeRange === "all") {
      return logs;
    }

    const now = new Date();
    const timeRangeMap: Record<Exclude<TimeRange, "all">, number> = {
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
    };

    const cutoffTime = now.getTime() - timeRangeMap[timeRange];
    return logs.filter(
      (log) => new Date(log.timestamp).getTime() >= cutoffTime,
    );
  }, [logs, timeRange]);

  // Advanced Analytics Calculations
  const analytics = useMemo(() => {
    const logsByLevel = filteredLogs.reduce(
      (acc, log) => {
        const level = log.level.toLowerCase();
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const logsByService = filteredLogs.reduce(
      (acc, log) => {
        acc[log.service] = (acc[log.service] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const logsByEventType = filteredLogs.reduce(
      (acc, log) => {
        const eventType = (log as any).eventType;
        if (eventType) {
          acc[eventType] = (acc[eventType] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    // Time series data with better granularity
    const timeSeriesData: Record<
      string,
      { total: number; error: number; warn: number; info: number }
    > = {};

    filteredLogs.forEach((log) => {
      const date = new Date(log.timestamp);
      let key: string;

      if (timeRange === "1h" || timeRange === "6h") {
        key = `${date.getHours()}:${date.getMinutes().toString().padStart(2, "0")}`;
      } else if (timeRange === "24h") {
        key = `${date.getHours()}:00`;
      } else {
        key = `${date.getMonth() + 1}/${date.getDate()}`;
      }

      if (!timeSeriesData[key]) {
        timeSeriesData[key] = { total: 0, error: 0, warn: 0, info: 0 };
      }

      timeSeriesData[key].total += 1;
      const level = log.level.toLowerCase();
      if (level === "error") timeSeriesData[key].error += 1;
      else if (level === "warn") timeSeriesData[key].warn += 1;
      else if (level === "info") timeSeriesData[key].info += 1;
    });

    // Error analysis
    const errorLogs = filteredLogs.filter(
      (log) => log.level.toLowerCase() === "error",
    );
    const topErrors = errorLogs.reduce(
      (acc, log) => {
        const msg = (log as any).message?.substring(0, 100) || "Unknown error";
        acc[msg] = (acc[msg] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const topErrorsList = Object.entries(topErrors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Calculate error rate
    const errorRate =
      filteredLogs.length > 0
        ? (((logsByLevel.error || 0) / filteredLogs.length) * 100).toFixed(2)
        : "0.00";

    // Calculate logs per minute
    let logsPerMinute: string;
    if (timeRange === "all") {
      // Calculate based on actual time span for "all"
      if (filteredLogs.length > 0) {
        const timestamps = filteredLogs.map((log) =>
          new Date(log.timestamp).getTime(),
        );
        const minTime = Math.min(...timestamps);
        const maxTime = Math.max(...timestamps);
        const timeSpanMinutes = (maxTime - minTime) / (60 * 1000);
        logsPerMinute =
          timeSpanMinutes > 0
            ? (filteredLogs.length / timeSpanMinutes).toFixed(2)
            : "0.00";
      } else {
        logsPerMinute = "0.00";
      }
    } else {
      const timeRangeMinutes: Record<Exclude<TimeRange, "all">, number> = {
        "1h": 60,
        "6h": 360,
        "24h": 1440,
        "7d": 10080,
        "30d": 43200,
      };
      logsPerMinute = (
        filteredLogs.length / timeRangeMinutes[timeRange]
      ).toFixed(2);
    }

    // Most active services
    const topServices = Object.entries(logsByService)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Status code analysis (if available)
    const statusCodes = filteredLogs.reduce(
      (acc, log) => {
        const statusCode = (log as any).statusCode;
        if (statusCode) {
          const range = `${Math.floor(statusCode / 100)}xx`;
          acc[range] = (acc[range] || 0) + 1;
        }
        return acc;
      },
      {} as Record<string, number>,
    );

    // Recent critical events (errors and warnings)
    const recentCriticalEvents = filteredLogs
      .filter((log) => {
        const level = log.level.toLowerCase();
        return level === "error" || level === "warn";
      })
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 10);

    return {
      logsByLevel,
      logsByService,
      logsByEventType,
      timeSeriesData,
      errorLogs,
      topErrorsList,
      errorRate,
      logsPerMinute,
      topServices,
      statusCodes,
      recentCriticalEvents,
    };
  }, [filteredLogs, timeRange]);

  // Chart Data Configurations
  const levelChartData = {
    labels: Object.keys(analytics.logsByLevel).map((l) => l.toUpperCase()),
    datasets: [
      {
        label: "Logs by Level",
        data: Object.values(analytics.logsByLevel),
        backgroundColor: [
          "rgba(239, 68, 68, 0.8)", // red for error
          "rgba(245, 158, 11, 0.8)", // amber for warn
          "rgba(59, 130, 246, 0.8)", // blue for info
          "rgba(16, 185, 129, 0.8)", // green for debug
          "rgba(107, 114, 128, 0.8)", // gray for trace
        ],
        borderColor: [
          "rgba(239, 68, 68, 1)",
          "rgba(245, 158, 11, 1)",
          "rgba(59, 130, 246, 1)",
          "rgba(16, 185, 129, 1)",
          "rgba(107, 114, 128, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const serviceChartData = {
    labels: Object.keys(analytics.logsByService).slice(0, 10),
    datasets: [
      {
        label: "Logs by Service",
        data: Object.values(analytics.logsByService).slice(0, 10),
        backgroundColor: "rgba(59, 130, 246, 0.7)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 2,
      },
    ],
  };

  const eventTypeChartData = {
    labels: Object.keys(analytics.logsByEventType),
    datasets: [
      {
        label: "Events by Type",
        data: Object.values(analytics.logsByEventType),
        backgroundColor: [
          "rgba(139, 92, 246, 0.8)",
          "rgba(236, 72, 153, 0.8)",
          "rgba(251, 146, 60, 0.8)",
          "rgba(34, 197, 94, 0.8)",
          "rgba(14, 165, 233, 0.8)",
          "rgba(168, 85, 247, 0.8)",
        ],
        borderWidth: 0,
      },
    ],
  };

  const timeSeriesChartData = {
    labels: Object.keys(analytics.timeSeriesData).sort(),
    datasets: [
      {
        label: "Total Logs",
        data: Object.keys(analytics.timeSeriesData)
          .sort()
          .map((key) => analytics.timeSeriesData[key].total),
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
        borderWidth: 2,
      },
      {
        label: "Errors",
        data: Object.keys(analytics.timeSeriesData)
          .sort()
          .map((key) => analytics.timeSeriesData[key].error),
        borderColor: "rgba(239, 68, 68, 1)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
        fill: true,
        borderWidth: 2,
      },
      {
        label: "Warnings",
        data: Object.keys(analytics.timeSeriesData)
          .sort()
          .map((key) => analytics.timeSeriesData[key].warn),
        borderColor: "rgba(245, 158, 11, 1)",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        tension: 0.4,
        fill: true,
        borderWidth: 2,
      },
    ],
  };

  const statusCodeChartData = {
    labels: Object.keys(analytics.statusCodes),
    datasets: [
      {
        data: Object.values(analytics.statusCodes),
        backgroundColor: [
          "rgba(16, 185, 129, 0.8)", // 2xx green
          "rgba(59, 130, 246, 0.8)", // 3xx blue
          "rgba(245, 158, 11, 0.8)", // 4xx amber
          "rgba(239, 68, 68, 0.8)", // 5xx red
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: "bold" as const,
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(107, 114, 128, 0.1)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right" as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12,
            weight: "bold" as const,
          },
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center space-y-4">
          <RefreshCw className="w-16 h-16 text-blue-500 animate-spin mx-auto" />
          <p className="text-lg text-gray-700 dark:text-gray-300 font-medium">
            Loading analytics data...
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Processing log metrics and generating insights
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-6 border border-blue-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              Log Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time observability insights and pattern analysis
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2">
            Time Range:
          </span>
          {(["1h", "6h", "24h", "7d", "30d", "all"] as TimeRange[]).map(
            (range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all ${
                  timeRange === range
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-600"
                }`}
              >
                {range === "all" ? "All" : range.toUpperCase()}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Total Logs
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {filteredLogs.length.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {analytics.logsPerMinute} logs/min
          </p>
        </div>

        {/* Error Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            {parseFloat(analytics.errorRate) > 5 ? (
              <TrendingUp className="w-5 h-5 text-red-500" />
            ) : (
              <TrendingDown className="w-5 h-5 text-green-500" />
            )}
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Error Rate
          </p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
            {analytics.errorRate}%
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {(analytics.logsByLevel.error || 0).toLocaleString()} errors
          </p>
        </div>

        {/* Active Services */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Server className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <Activity className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Active Services
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {Object.keys(analytics.logsByService).length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Unique services
          </p>
        </div>

        {/* Event Types */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Zap className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <Hash className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Event Types
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {Object.keys(analytics.logsByEventType).length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Distinct types
          </p>
        </div>
      </div>

      {/* Level Distribution Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-red-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                ERRORS
              </p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {(analytics.logsByLevel.error || 0).toLocaleString()}
              </p>
            </div>
            <XCircle className="w-8 h-8 text-red-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-amber-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                WARNINGS
              </p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {(analytics.logsByLevel.warn || 0).toLocaleString()}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-amber-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-blue-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                INFO
              </p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {(analytics.logsByLevel.info || 0).toLocaleString()}
              </p>
            </div>
            <Info className="w-8 h-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border-l-4 border-green-500 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                DEBUG
              </p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {(analytics.logsByLevel.debug || 0).toLocaleString()}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
          </div>
        </div>
      </div>

      {/* Main Time Series Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Logs Over Time
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Time series analysis showing log volume trends
            </p>
          </div>
        </div>
        <div className="h-80">
          <Line data={timeSeriesChartData} options={chartOptions} />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Log Levels Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              Log Level Distribution
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Breakdown of logs by severity level
            </p>
          </div>
          <div className="h-64">
            <Pie data={levelChartData} options={pieChartOptions} />
          </div>
        </div>

        {/* Top Services */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Logs by Service
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Top 10 most active services
            </p>
          </div>
          <div className="h-64">
            <Bar data={serviceChartData} options={chartOptions} />
          </div>
        </div>

        {/* Event Type Distribution */}
        {Object.keys(analytics.logsByEventType).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                Event Type Distribution
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Events categorized by type
              </p>
            </div>
            <div className="h-64">
              <Doughnut data={eventTypeChartData} options={pieChartOptions} />
            </div>
          </div>
        )}

        {/* Status Codes */}
        {Object.keys(analytics.statusCodes).length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Hash className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                HTTP Status Codes
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Distribution by status code range
              </p>
            </div>
            <div className="h-64">
              <Doughnut data={statusCodeChartData} options={pieChartOptions} />
            </div>
          </div>
        )}
      </div>

      {/* Detailed Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Critical Events */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              Recent Critical Events
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Latest errors and warnings timeline
            </p>
          </div>
          {analytics.recentCriticalEvents.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {analytics.recentCriticalEvents.map((log, index) => {
                const isError = log.level.toLowerCase() === "error";
                const timestamp = new Date(log.timestamp);
                const timeStr = timestamp.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });
                const dateStr = timestamp.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });

                return (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      isError
                        ? "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800"
                        : "bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800"
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isError ? (
                        <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                          {dateStr} {timeStr}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded ${
                            isError
                              ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                              : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                          }`}
                        >
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                        {log.service}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                        {(log as any).message ||
                          (log as any).template ||
                          "No message"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>No critical events in this time range</p>
            </div>
          )}
        </div>

        {/* Top Services Detail */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Server className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Service Activity Ranking
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Services ranked by log volume
            </p>
          </div>
          <div className="space-y-3">
            {analytics.topServices.map(([service, count], index) => {
              const percentage = ((count / filteredLogs.length) * 100).toFixed(
                1,
              );
              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {service}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">
                        {count.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {percentage}%
                      </p>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
