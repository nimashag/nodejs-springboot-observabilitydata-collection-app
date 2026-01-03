import { useState, useEffect } from 'react';
import { getTemplates, mineTemplates, deleteTemplate } from '../api/logAggregationApi';
import type { LogTemplate, TemplateMiningParams } from '../types/logAggregation.types';
import { format } from 'date-fns';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<LogTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [mining, setMining] = useState(false);
  const [selectedService, setSelectedService] = useState<string>('');
  const [services, setServices] = useState<string[]>([]);

  useEffect(() => {
    loadTemplates();
  }, [selectedService]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await getTemplates(selectedService || undefined);
      setTemplates(data);
      
      // Extract unique services
      const uniqueServices = Array.from(
        new Set(data.map((t) => t.service).filter((s): s is string => Boolean(s)))
      ).sort();
      setServices(uniqueServices);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMineTemplates = async () => {
    try {
      setMining(true);
      const params: TemplateMiningParams = {
        source: 'aggregated',
        minClusterSize: 3,
        maxClusters: 50,
      };
      await mineTemplates(params);
      await loadTemplates();
    } catch (error) {
      console.error('Error mining templates:', error);
      alert('Error mining templates. Please check the console.');
    } finally {
      setMining(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await deleteTemplate(id);
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Error deleting template. Please check the console.');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Log Templates</h1>
            <p className="text-sm text-gray-600 mt-1">
              Discovered log patterns and templates
            </p>
          </div>
          <button
            onClick={handleMineTemplates}
            disabled={mining}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mining ? 'Mining...' : 'Mine Templates'}
          </button>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Service
        </label>
        <select
          value={selectedService}
          onChange={(e) => setSelectedService(e.target.value)}
          className="w-full md:w-64 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">All Services</option>
          {services.map((service) => (
            <option key={service} value={service}>
              {service}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No templates found</p>
          <button
            onClick={handleMineTemplates}
            disabled={mining}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {mining ? 'Mining...' : 'Mine Templates from Aggregated Logs'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Template {template.id.split('-')[1]}
                    </h3>
                    {template.service && (
                      <span className="text-sm bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {template.service}
                      </span>
                    )}
                    {template.eventType && (
                      <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {template.eventType}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono text-gray-700 bg-gray-50 p-3 rounded mb-2">
                    {template.template}
                  </p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span>Frequency: {template.frequency}</span>
                    {template.metadata?.parameterCount && (
                      <span>Parameters: {template.metadata.parameterCount}</span>
                    )}
                    <span>
                      Last seen: {format(new Date(template.lastSeen), 'PPp')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="text-red-600 hover:text-red-700 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
              {template.exampleLogs.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Example Logs:</p>
                  <div className="space-y-1">
                    {template.exampleLogs.slice(0, 3).map((example, index) => (
                      <p
                        key={index}
                        className="text-xs font-mono text-gray-600 bg-gray-50 p-2 rounded truncate"
                      >
                        {example}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

