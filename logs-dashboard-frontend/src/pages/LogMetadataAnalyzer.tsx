import { useState, useEffect } from 'react';
import { queryLogs } from '../api/logAggregationApi';
import type { StructuredLog } from '../types/logAggregation.types';
import { 
  Database, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Search,
  Filter,
  Download,
  RefreshCw,
  Hash,
  Globe,
  User,
  Clock,
  Activity,
  Server,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

export default function LogMetadataAnalyzer() {
  const [logs, setLogs] = useState<StructuredLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<string>('all');
  const [selectedMetadataKey, setSelectedMetadataKey] = useState<string>('all');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const response = await queryLogs({ limit: 10000 });
      setLogs(response.logs);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extract all unique metadata keys
  const allMetadataKeys = Array.from(
    new Set(
      logs.flatMap(log => Object.keys(log.metadata || {}))
    )
  ).sort();

  // Get unique services
  const services = Array.from(new Set(logs.map(log => log.service))).sort();

  // Filter logs based on selection
  const filteredLogs = logs.filter(log => {
    if (selectedService !== 'all' && log.service !== selectedService) return false;
    return true;
  });

  // Analyze metadata distribution
  const metadataDistribution = allMetadataKeys.map(key => {
    const count = filteredLogs.filter(log => log.metadata && key in log.metadata).length;
    const percentage = filteredLogs.length > 0 ? (count / filteredLogs.length) * 100 : 0;
    return { key, count, percentage };
  }).sort((a, b) => b.count - a.count);

  // Analyze metadata values for selected key
  const getMetadataValueDistribution = (key: string) => {
    const valueCounts: Record<string, number> = {};
    filteredLogs.forEach(log => {
      if (log.metadata && key in log.metadata) {
        const value = String(log.metadata[key]);
        valueCounts[value] = (valueCounts[value] || 0) + 1;
      }
    });
    return Object.entries(valueCounts)
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 values
  };

  // Analyze metadata types
  const metadataTypes = allMetadataKeys.map(key => {
    const sampleValue = filteredLogs.find(log => log.metadata && key in log.metadata)?.metadata[key];
    let type = 'unknown';
    if (typeof sampleValue === 'string') type = 'string';
    else if (typeof sampleValue === 'number') type = 'number';
    else if (typeof sampleValue === 'boolean') type = 'boolean';
    else if (Array.isArray(sampleValue)) type = 'array';
    else if (typeof sampleValue === 'object') type = 'object';
    
    return { key, type, count: filteredLogs.filter(log => log.metadata && key in log.metadata).length };
  });

  // Service metadata coverage
  const serviceMetadataCoverage = services.map(service => {
    const serviceLogs = filteredLogs.filter(log => log.service === service);
    const avgMetadataKeys = serviceLogs.length > 0
      ? serviceLogs.reduce((sum, log) => sum + Object.keys(log.metadata || {}).length, 0) / serviceLogs.length
      : 0;
    return { service, count: serviceLogs.length, avgMetadataKeys: Math.round(avgMetadataKeys * 10) / 10 };
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading metadata analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Log Metadata Analyzer
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Analyze and visualize metadata patterns across logs
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Filter by Service
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Services ({services.length})</option>
            {services.map(service => (
              <option key={service} value={service}>{service}</option>
            ))}
          </select>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Analyze Metadata Key
          </label>
          <select
            value={selectedMetadataKey}
            onChange={(e) => setSelectedMetadataKey(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Keys</option>
            {allMetadataKeys.map(key => (
              <option key={key} value={key}>{key}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {filteredLogs.length.toLocaleString()}
              </p>
            </div>
            <Database className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Unique Metadata Keys</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {allMetadataKeys.length}
              </p>
            </div>
            <Hash className="w-8 h-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Services</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {services.length}
              </p>
            </div>
            <Server className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Metadata per Log</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {filteredLogs.length > 0
                  ? Math.round(
                      (filteredLogs.reduce((sum, log) => sum + Object.keys(log.metadata || {}).length, 0) /
                        filteredLogs.length) *
                        10
                    ) / 10
                  : 0}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Metadata Key Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Metadata Key Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metadataDistribution.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="key" 
                angle={-45}
                textAnchor="end"
                height={100}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Metadata Type Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5" />
            Metadata Type Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={[
                  { name: 'String', value: metadataTypes.filter(t => t.type === 'string').length },
                  { name: 'Number', value: metadataTypes.filter(t => t.type === 'number').length },
                  { name: 'Boolean', value: metadataTypes.filter(t => t.type === 'boolean').length },
                  { name: 'Object', value: metadataTypes.filter(t => t.type === 'object').length },
                  { name: 'Array', value: metadataTypes.filter(t => t.type === 'array').length },
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {[
                  { name: 'String', value: metadataTypes.filter(t => t.type === 'string').length },
                  { name: 'Number', value: metadataTypes.filter(t => t.type === 'number').length },
                  { name: 'Boolean', value: metadataTypes.filter(t => t.type === 'boolean').length },
                  { name: 'Object', value: metadataTypes.filter(t => t.type === 'object').length },
                  { name: 'Array', value: metadataTypes.filter(t => t.type === 'array').length },
                ].map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Service Metadata Coverage */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" />
          Service Metadata Coverage
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={serviceMetadataCoverage}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="service" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="count" fill="#3b82f6" name="Log Count" />
            <Bar yAxisId="right" dataKey="avgMetadataKeys" fill="#10b981" name="Avg Metadata Keys" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Metadata Key Details Table */}
      {selectedMetadataKey !== 'all' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Value Distribution: {selectedMetadataKey}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Value</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Count</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">Percentage</th>
                </tr>
              </thead>
              <tbody>
                {getMetadataValueDistribution(selectedMetadataKey).map((item, index) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50">
                    <td className="py-3 px-4 text-sm font-mono text-gray-900 dark:text-white">
                      {item.value.length > 50 ? `${item.value.substring(0, 50)}...` : item.value}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-700 dark:text-gray-300">
                      {item.count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-700 dark:text-gray-300">
                      {((item.count / filteredLogs.length) * 100).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}

