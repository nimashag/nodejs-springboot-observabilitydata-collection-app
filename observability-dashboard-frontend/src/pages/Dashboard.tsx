import { useState, useEffect } from "react";
import {
  Activity,
  BarChart3,
  FileText,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import {
  queryLogs,
  checkHealth as checkLogHealth,
} from "../api/logs/logAggregationApi";
import { alertApiService } from "../api/alerts/alertApi";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [logCount, setLogCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [logServiceStatus, setLogServiceStatus] = useState<
    "online" | "offline" | "checking"
  >("checking");
  const [alertServiceStatus, setAlertServiceStatus] = useState<
    "online" | "offline" | "checking"
  >("checking");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch logs data
      const logsPromise = queryLogs({ limit: 10000 })
        .then((response) => {
          setLogCount(response.count);
          // Count errors from logs
          const errors = response.logs.filter(
            (log) => log.level.toLowerCase() === "error",
          ).length;
          setErrorCount(errors);
        })
        .catch((error) => {
          console.error("Error fetching logs:", error);
          setLogServiceStatus("offline");
        });

      // Fetch alerts data
      const alertsPromise = alertApiService
        .getAlerts(1, 1000)
        .then((response) => {
          setAlertCount(response.total || response.alerts?.length || 0);
        })
        .catch((error) => {
          console.error("Error fetching alerts:", error);
          setAlertServiceStatus("offline");
        });

      // Check service health
      const logHealthPromise = checkLogHealth()
        .then(() => {
          setLogServiceStatus("online");
        })
        .catch(() => {
          setLogServiceStatus("offline");
        });

      const alertHealthPromise = alertApiService
        .healthCheck()
        .then(() => {
          setAlertServiceStatus("online");
        })
        .catch(() => {
          setAlertServiceStatus("offline");
        });

      await Promise.all([
        logsPromise,
        alertsPromise,
        logHealthPromise,
        alertHealthPromise,
      ]);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    {
      name: "Metrics",
      value: loading ? "..." : "1,234",
      change: "+12.5%",
      icon: BarChart3,
      color: "bg-blue-500",
    },
    {
      name: "Logs",
      value: loading ? "..." : logCount.toLocaleString(),
      change: logCount > 0 ? "+8.2%" : "0%",
      icon: FileText,
      color: "bg-green-500",
    },
    {
      name: "Alerts",
      value: loading ? "..." : alertCount.toLocaleString(),
      change: alertCount > 0 ? "-5.1%" : "0%",
      icon: AlertTriangle,
      color: "bg-red-500",
    },
    {
      name: "Errors",
      value: loading ? "..." : errorCount.toLocaleString(),
      change: errorCount > 0 ? "+2.3%" : "0%",
      icon: TrendingUp,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Observability Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Unified view of metrics, logs, alerts, and anomalies
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.name}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {stat.value}
                  </p>
                  <p
                    className={`text-sm mt-2 ${
                      stat.change.startsWith("+")
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stat.change} from last period
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              View All Metrics
            </button>
            <button className="w-full text-left px-4 py-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
              Explore Logs
            </button>
            <button className="w-full text-left px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
              Check Alerts
            </button>
            <button className="w-full text-left px-4 py-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              Analyze Anomalies
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Status
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Log Aggregation Service
              </span>
              {logServiceStatus === "checking" ? (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-sm font-medium">
                  Checking...
                </span>
              ) : logServiceStatus === "online" ? (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm font-medium">
                  Online
                </span>
              ) : (
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm font-medium">
                  Offline
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Alert Agent Service
              </span>
              {alertServiceStatus === "checking" ? (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-sm font-medium">
                  Checking...
                </span>
              ) : alertServiceStatus === "online" ? (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm font-medium">
                  Online
                </span>
              ) : (
                <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm font-medium">
                  Offline
                </span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Data Collection
              </span>
              <span
                className={`px-2 py-1 rounded text-sm font-medium ${
                  logServiceStatus === "online" &&
                  alertServiceStatus === "online"
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                    : logServiceStatus === "checking" ||
                        alertServiceStatus === "checking"
                      ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                      : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                }`}
              >
                {logServiceStatus === "online" &&
                alertServiceStatus === "online"
                  ? "Active"
                  : logServiceStatus === "checking" ||
                      alertServiceStatus === "checking"
                    ? "Checking..."
                    : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
