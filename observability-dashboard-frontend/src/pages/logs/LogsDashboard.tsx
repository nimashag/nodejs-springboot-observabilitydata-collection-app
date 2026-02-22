import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { queryLogs } from '../../api/logs/logAggregationApi';
import type { StructuredLog } from '../../types/logs/logAggregation.types';
import LogCard from '../../components/logs/LogCard';
import LogDetailModal from '../../components/logs/LogDetailModal';
import { FileText, AlertTriangle, Info, Server, ArrowRight } from 'lucide-react';

export default function LogsDashboard() {
  const [recentLogs, setRecentLogs] = useState<StructuredLog[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    errors: 0,
    warnings: 0,
    services: new Set<string>(),
  });
  const [selectedLog, setSelectedLog] = useState<StructuredLog | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get recent logs for display (first 10)
      const recentResponse = await queryLogs({ limit: 10 });
      setRecentLogs(recentResponse.logs);
      
      // Get total count and all services (query with high limit to get all services)
      const allLogsResponse = await queryLogs({ limit: 50000 });
      const allServices = new Set(
        allLogsResponse.logs.map((log) => log.service).filter((s): s is string => Boolean(s))
      );
      
      // Get error count (only need count, not logs)
      const errorResponse = await queryLogs({ level: 'error', limit: 1, offset: 0 });
      
      // Get warning count (only need count, not logs)
      const warnResponse = await queryLogs({ level: 'warn', limit: 1, offset: 0 });
      
      setStats({
        total: allLogsResponse.count,
        errors: errorResponse.count,
        warnings: warnResponse.count,
        services: allServices,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogClick = (log: StructuredLog) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const statCards = [
    {
      name: 'Total Logs',
      value: stats.total.toLocaleString(),
      icon: FileText,
      color: 'bg-blue-500',
      link: '/logs/subpart1',
    },
    {
      name: 'Errors',
      value: stats.errors.toLocaleString(),
      icon: AlertTriangle,
      color: 'bg-red-500',
      link: '/logs/subpart1?level=error',
    },
    {
      name: 'Warnings',
      value: stats.warnings.toLocaleString(),
      icon: Info,
      color: 'bg-yellow-500',
      link: '/logs/subpart1?level=warn',
    },
    {
      name: 'Services',
      value: stats.services.size.toString(),
      icon: Server,
      color: 'bg-green-500',
      link: '/logs/subpart1',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Logs Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Overview of log aggregation and system health
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link
              key={stat.name}
              to={stat.link}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Logs</h2>
          <Link
            to="/logs/subpart1"
            className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading...</div>
        ) : recentLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">No logs found</div>
        ) : (
          <div className="space-y-3">
            {recentLogs.map((log, index) => (
              <LogCard
                key={`${log.timestamp}-${index}`}
                log={log}
                onClick={() => handleLogClick(log)}
              />
            ))}
          </div>
        )}
      </div>

      <LogDetailModal
        log={selectedLog}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

