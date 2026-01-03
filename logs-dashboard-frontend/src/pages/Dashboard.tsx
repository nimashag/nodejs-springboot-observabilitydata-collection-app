import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { queryLogs } from '../api/logAggregationApi';
import type { StructuredLog } from '../types/logAggregation.types';
import LogCard from '../components/logComponents/LogCard';
import LogDetailModal from '../components/logComponents/LogDetailModal';
import {
  DocumentTextIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ServerIcon,
} from '@heroicons/react/24/outline';

export default function Dashboard() {
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
      icon: DocumentTextIcon,
      color: 'bg-blue-500',
      link: '/logs',
    },
    {
      name: 'Errors',
      value: stats.errors.toLocaleString(),
      icon: ExclamationTriangleIcon,
      color: 'bg-red-500',
      link: '/logs?level=error',
    },
    {
      name: 'Warnings',
      value: stats.warnings.toLocaleString(),
      icon: InformationCircleIcon,
      color: 'bg-yellow-500',
      link: '/logs?level=warn',
    },
    {
      name: 'Services',
      value: stats.services.size.toString(),
      icon: ServerIcon,
      color: 'bg-green-500',
      link: '/logs',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Overview of log aggregation and system health</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <Link
            key={stat.name}
            to={stat.link}
            className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Logs</h2>
          <Link
            to="/logs"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All →
          </Link>
        </div>
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : recentLogs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No logs found</div>
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

