import { useState } from 'react';
import type { LogQueryParams, LogTemplate } from '../../types/logAggregation.types';

interface LogFiltersProps {
  filters: LogQueryParams;
  onFiltersChange: (filters: LogQueryParams) => void;
  services: string[];
  templates?: LogTemplate[];
}

export default function LogFilters({ filters, onFiltersChange, services, templates = [] }: LogFiltersProps) {
  const [localFilters, setLocalFilters] = useState<LogQueryParams>(filters);

  const handleChange = (key: keyof LogQueryParams, value: any) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const cleared = {};
    setLocalFilters(cleared);
    onFiltersChange(cleared);
  };

  const levels = ['error', 'warn', 'info', 'debug'];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
        <button
          onClick={clearFilters}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Clear All
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Service</label>
          <select
            value={localFilters.service || ''}
            onChange={(e) => handleChange('service', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <label className="block text-xs font-medium text-gray-700 mb-1">Level</label>
          <select
            value={localFilters.level || ''}
            onChange={(e) => handleChange('level', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <label className="block text-xs font-medium text-gray-700 mb-1">Template ID</label>
          <select
            value={localFilters.templateId || ''}
            onChange={(e) => handleChange('templateId', e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Templates</option>
            {templates.map((template) => {
              const templateNum = template.id.split('-')[1] || template.id;
              const serviceLabel = template.service ? ` [${template.service}]` : '';
              const templatePreview = template.template.length > 40 
                ? template.template.substring(0, 40) + '...' 
                : template.template;
              return (
                <option key={template.id} value={template.id} title={template.template}>
                  #{templateNum}{serviceLabel} - {templatePreview}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Event</label>
          <input
            type="text"
            value={localFilters.event || ''}
            onChange={(e) => handleChange('event', e.target.value)}
            placeholder="Filter by event..."
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Trace ID</label>
          <input
            type="text"
            value={localFilters.traceId || ''}
            onChange={(e) => handleChange('traceId', e.target.value)}
            placeholder="Filter by trace ID..."
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
          />
        </div>
      </div>
    </div>
  );
}

