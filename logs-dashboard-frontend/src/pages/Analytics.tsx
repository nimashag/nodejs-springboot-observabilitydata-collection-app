import { useState, useEffect } from 'react';
import { queryLogs } from '../api/logAggregationApi';
import type { StructuredLog } from '../types/logAggregation.types';
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
} from 'chart.js';
import { Line, Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Analytics() {
  const [logs, setLogs] = useState<StructuredLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      const response = await queryLogs({ limit: 1000 });
      setLogs(response.logs);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Process data for charts
  const logsByLevel = logs.reduce((acc, log) => {
    const level = log.level.toLowerCase();
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const logsByService = logs.reduce((acc, log) => {
    acc[log.service] = (acc[log.service] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Time series data (logs over time)
  const timeSeriesData = logs.reduce((acc, log) => {
    const date = new Date(log.timestamp);
    const hour = `${date.getHours()}:00`;
    acc[hour] = (acc[hour] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const levelChartData = {
    labels: Object.keys(logsByLevel),
    datasets: [
      {
        label: 'Logs by Level',
        data: Object.values(logsByLevel),
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)', // red for error
          'rgba(245, 158, 11, 0.8)', // yellow for warn
          'rgba(59, 130, 246, 0.8)', // blue for info
          'rgba(107, 114, 128, 0.8)', // gray for debug
        ],
      },
    ],
  };

  const serviceChartData = {
    labels: Object.keys(logsByService),
    datasets: [
      {
        label: 'Logs by Service',
        data: Object.values(logsByService),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
    ],
  };

  const timeSeriesChartData = {
    labels: Object.keys(timeSeriesData).sort(),
    datasets: [
      {
        label: 'Logs Over Time',
        data: Object.keys(timeSeriesData)
          .sort()
          .map((hour) => timeSeriesData[hour]),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500">Loading analytics data...</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-600 mt-1">
          Visual insights into log patterns and distributions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Logs by Level
          </h3>
          <div className="h-64">
            <Pie data={levelChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Logs by Service
          </h3>
          <div className="h-64">
            <Bar data={serviceChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Logs Over Time
        </h3>
        <div className="h-64">
          <Line data={timeSeriesChartData} options={chartOptions} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Total Logs</p>
          <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Unique Services</p>
          <p className="text-2xl font-bold text-gray-900">
            {Object.keys(logsByService).length}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-sm text-gray-600">Error Rate</p>
          <p className="text-2xl font-bold text-red-600">
            {logsByLevel.error || 0}
          </p>
        </div>
      </div>
    </div>
  );
}

