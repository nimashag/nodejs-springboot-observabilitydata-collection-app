import { useState, useEffect } from 'react';
import type { LogQueryParams, LogTemplate } from '../../types/logAggregation.types';

interface LogFiltersProps {
  filters: LogQueryParams;
  onFiltersChange: (filters: LogQueryParams) => void;
  services: string[];
  templates?: LogTemplate[];
}

export default function LogFilters({ filters, onFiltersChange, services, templates = [] }: LogFiltersProps) {
  const [localFilters, setLocalFilters] = useState<LogQueryParams>(filters);

  // Sync localFilters when filters prop changes (e.g., when cleared from parent)
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleChange = (key: keyof LogQueryParams, value: any) => {
    // Handle boolean values for piiRedacted
    if (key === 'piiRedacted') {
      const newFilters = { ...localFilters, [key]: value === '' ? undefined : value === 'true' };
      setLocalFilters(newFilters);
      onFiltersChange(newFilters);
    } else {
      const newFilters = { ...localFilters, [key]: value || undefined };
      setLocalFilters(newFilters);
      onFiltersChange(newFilters);
    }
  };

  // Helper function to convert ISO string to datetime-local format
  const toLocalDateTimeString = (isoString?: string): string => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      // Format as YYYY-MM-DDTHH:mm for datetime-local input
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  // Helper function to convert datetime-local value to ISO string
  const fromLocalDateTimeString = (localDateTime: string): string | undefined => {
    if (!localDateTime) return undefined;
    try {
      const date = new Date(localDateTime);
      return date.toISOString();
    } catch {
      return undefined;
    }
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
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
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

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Session ID</label>
            <input
              type="text"
              value={localFilters.sessionId || ''}
              onChange={(e) => handleChange('sessionId', e.target.value)}
              placeholder="Filter by session ID..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">PII Redacted</label>
            <select
              value={localFilters.piiRedacted === undefined ? '' : localFilters.piiRedacted ? 'true' : 'false'}
              onChange={(e) => handleChange('piiRedacted', e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Logs</option>
              <option value="true">PII Redacted Only</option>
              <option value="false">Not PII Redacted</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
            <input
              type="datetime-local"
              value={toLocalDateTimeString(localFilters.startTime)}
              onChange={(e) => handleChange('startTime', fromLocalDateTimeString(e.target.value))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
            <input
              type="datetime-local"
              value={toLocalDateTimeString(localFilters.endTime)}
              onChange={(e) => handleChange('endTime', fromLocalDateTimeString(e.target.value))}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

