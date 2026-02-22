import { useState, useEffect } from 'react';
import { checkHealth } from '../../api/logAggregationApi';

export default function Header() {
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'unhealthy' | 'checking'>('checking');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await checkHealth();
        setHealthStatus(response.status === 'healthy' ? 'healthy' : 'unhealthy');
      } catch (error) {
        setHealthStatus('unhealthy');
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Log Aggregation Dashboard</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div
              className={`w-2 h-2 rounded-full ${
                healthStatus === 'healthy'
                  ? 'bg-green-500'
                  : healthStatus === 'unhealthy'
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {healthStatus === 'healthy'
                ? 'Service Healthy'
                : healthStatus === 'unhealthy'
                ? 'Service Unavailable'
                : 'Checking...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

