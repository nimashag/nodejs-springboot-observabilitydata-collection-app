import { useState, useEffect } from 'react';
import { queryLogs } from '../api/logAggregationApi';
import type { StructuredLog } from '../types/logAggregation.types';
import { useApp } from '../context/AppContext';
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
  const { darkMode } = useApp();
  const [logs, setLogs] = useState<StructuredLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      // Load all logs for analytics (use high limit to get all logs)
      const response = await queryLogs({ limit: 50000 });
      setLogs(response.logs);
      setTotalCount(response.count);
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

  // Generate colors based on log level
  const getLevelColors = (levels: string[]) => {
    const colorMap: Record<string, string> = {
      error: 'rgba(239, 68, 68, 0.8)',      // red for error
      warn: 'rgba(245, 158, 11, 0.8)',       // amber for warn
      warning: 'rgba(245, 158, 11, 0.8)',    // amber for warning
      info: 'rgba(6, 182, 212, 0.8)',        // cyan-500 for info
      debug: 'rgba(107, 114, 128, 0.8)',     // gray for debug
    };
    
    // Default cyan gradient colors for unknown levels
    const defaultColors = [
      'rgba(6, 182, 212, 0.8)',   // cyan-500
      'rgba(14, 165, 233, 0.8)',  // sky-500
      'rgba(59, 130, 246, 0.8)',  // blue-500
      'rgba(34, 211, 238, 0.8)',  // cyan-400
    ];
    
    return levels.map((level, index) => colorMap[level.toLowerCase()] || defaultColors[index % defaultColors.length]);
  };

  const levelChartData = {
    labels: Object.keys(logsByLevel),
    datasets: [
      {
        label: 'Logs by Level',
        data: Object.values(logsByLevel),
        backgroundColor: getLevelColors(Object.keys(logsByLevel)),
        borderColor: getLevelColors(Object.keys(logsByLevel)).map(c => c.replace('0.8', '1')),
        borderWidth: 2,
      },
    ],
  };

  // Generate cyan/blue gradient colors for services
  const generateServiceColors = (count: number) => {
    const colors = [
      'rgba(6, 182, 212, 0.8)',   // cyan-500
      'rgba(14, 165, 233, 0.8)',  // sky-500
      'rgba(59, 130, 246, 0.8)',  // blue-500
      'rgba(8, 145, 178, 0.8)',   // cyan-600
      'rgba(2, 132, 199, 0.8)',   // sky-600
      'rgba(37, 99, 235, 0.8)',  // blue-600
      'rgba(34, 211, 238, 0.8)',  // cyan-400
      'rgba(56, 189, 248, 0.8)',  // sky-400
      'rgba(96, 165, 250, 0.8)',  // blue-400
    ];
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  };

  const serviceChartData = {
    labels: Object.keys(logsByService),
    datasets: [
      {
        label: 'Logs by Service',
        data: Object.values(logsByService),
        backgroundColor: generateServiceColors(Object.keys(logsByService).length),
        borderColor: generateServiceColors(Object.keys(logsByService).length).map(c => c.replace('0.8', '1')),
        borderWidth: 2,
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
        borderColor: darkMode ? 'rgba(34, 211, 238, 1)' : 'rgba(6, 182, 212, 1)', // cyan-400 for dark, cyan-500 for light
        backgroundColor: darkMode ? 'rgba(34, 211, 238, 0.2)' : 'rgba(6, 182, 212, 0.2)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: darkMode ? 'rgba(34, 211, 238, 1)' : 'rgba(6, 182, 212, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: darkMode ? 'rgba(34, 211, 238, 0.9)' : 'rgba(55, 65, 81, 0.9)', // cyan-400 for dark, gray-700 for light
          font: {
            size: 12,
            weight: 500,
          },
          padding: 15,
        },
      },
      tooltip: {
        backgroundColor: darkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: darkMode ? 'rgba(34, 211, 238, 1)' : 'rgba(55, 65, 81, 1)',
        bodyColor: darkMode ? 'rgba(196, 181, 253, 1)' : 'rgba(75, 85, 99, 1)',
        borderColor: darkMode ? 'rgba(34, 211, 238, 0.3)' : 'rgba(6, 182, 212, 0.3)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
      },
    },
    scales: darkMode ? {
      x: {
        ticks: {
          color: 'rgba(34, 211, 238, 0.7)',
        },
        grid: {
          color: 'rgba(34, 211, 238, 0.1)',
        },
      },
      y: {
        ticks: {
          color: 'rgba(34, 211, 238, 0.7)',
        },
        grid: {
          color: 'rgba(34, 211, 238, 0.1)',
        },
      },
    } : {
      x: {
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.8)',
        },
      },
      y: {
        ticks: {
          color: 'rgba(107, 114, 128, 0.8)',
        },
        grid: {
          color: 'rgba(229, 231, 235, 0.8)',
        },
      },
    },
  };

  if (loading) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-cyan-400/70">Loading analytics data...</div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-cyan-100 mb-2">Analytics</h1>
        <p className="text-sm text-gray-600 dark:text-cyan-400/70 mt-1">
          Visual insights into log patterns and distributions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-cyan-800/30 p-6 shadow-sm hover:shadow-lg hover:shadow-cyan-500/10 dark:hover:shadow-cyan-500/20 transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-cyan-100 mb-4">
            Logs by Level
          </h3>
          <div className="h-64">
            <Pie data={levelChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-cyan-800/30 p-6 shadow-sm hover:shadow-lg hover:shadow-cyan-500/10 dark:hover:shadow-cyan-500/20 transition-all duration-300">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-cyan-100 mb-4">
            Logs by Service
          </h3>
          <div className="h-64">
            <Bar data={serviceChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-cyan-800/30 p-6 shadow-sm hover:shadow-lg hover:shadow-cyan-500/10 dark:hover:shadow-cyan-500/20 transition-all duration-300">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-cyan-100 mb-4">
          Logs Over Time
        </h3>
        <div className="h-64">
          <Line data={timeSeriesChartData} options={chartOptions} />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-cyan-800/30 p-4 shadow-sm hover:shadow-lg hover:shadow-cyan-500/10 dark:hover:shadow-cyan-500/20 transition-all duration-300">
          <p className="text-sm text-gray-600 dark:text-cyan-400/70">Total Logs</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-cyan-100">{totalCount.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-cyan-800/30 p-4 shadow-sm hover:shadow-lg hover:shadow-cyan-500/10 dark:hover:shadow-cyan-500/20 transition-all duration-300">
          <p className="text-sm text-gray-600 dark:text-cyan-400/70">Unique Services</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-cyan-100">
            {Object.keys(logsByService).length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-cyan-800/30 p-4 shadow-sm hover:shadow-lg hover:shadow-cyan-500/10 dark:hover:shadow-cyan-500/20 transition-all duration-300">
          <p className="text-sm text-gray-600 dark:text-cyan-400/70">Error Count</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            {(logsByLevel.error || 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

