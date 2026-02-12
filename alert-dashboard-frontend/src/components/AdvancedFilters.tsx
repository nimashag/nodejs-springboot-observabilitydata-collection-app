import { useState } from 'react'
import { Filter, X, Search, Calendar } from 'lucide-react'

export interface FilterOptions {
  services: string[]
  alertTypes: string[]
  severities: string[]
  states: string[]
}

export interface ActiveFilters {
  search: string
  services: string[]
  alertTypes: string[]
  severities: string[]
  states: string[]
  dateRange: { start: string; end: string }
}

interface AdvancedFiltersProps {
  options: FilterOptions
  activeFilters: ActiveFilters
  onChange: (filters: ActiveFilters) => void
  onReset: () => void
}

export function AdvancedFilters({ options, activeFilters, onChange, onReset }: AdvancedFiltersProps) {
  const [expanded, setExpanded] = useState(false)
  
  const updateFilter = (key: keyof ActiveFilters, value: any) => {
    onChange({ ...activeFilters, [key]: value })
  }
  
  const toggleArrayFilter = (key: 'services' | 'alertTypes' | 'severities' | 'states', value: string) => {
    const current = activeFilters[key]
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    updateFilter(key, updated)
  }
  
  const hasActiveFilters = 
    activeFilters.search ||
    activeFilters.services.length > 0 ||
    activeFilters.alertTypes.length > 0 ||
    activeFilters.severities.length > 0 ||
    activeFilters.states.length > 0 ||
    activeFilters.dateRange.start ||
    activeFilters.dateRange.end
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-4">
      {/* Search and Toggle */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[300px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={activeFilters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          Advanced Filters
          {hasActiveFilters && (
            <span className="ml-1 px-2 py-0.5 bg-primary-500 text-white text-xs font-semibold rounded-full">
              Active
            </span>
          )}
        </button>
        
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
            Reset
          </button>
        )}
      </div>
      
      {/* Expanded Filters */}
      {expanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
          {/* Services Filter */}
          {options.services.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Services ({activeFilters.services.length} selected)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700/50">
                {options.services.map(service => (
                  <label key={service} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={activeFilters.services.includes(service)}
                      onChange={() => toggleArrayFilter('services', service)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{service}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* Alert Types Filter */}
          {options.alertTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Alert Types ({activeFilters.alertTypes.length} selected)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700/50">
                {options.alertTypes.map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={activeFilters.alertTypes.includes(type)}
                      onChange={() => toggleArrayFilter('alertTypes', type)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* Severity Filter */}
          {options.severities.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Severity ({activeFilters.severities.length} selected)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700/50">
                {options.severities.map(severity => (
                  <label key={severity} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={activeFilters.severities.includes(severity)}
                      onChange={() => toggleArrayFilter('severities', severity)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">{severity}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* State Filter */}
          {options.states.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                State ({activeFilters.states.length} selected)
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700/50">
                {options.states.map(state => (
                  <label key={state} className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 p-1 rounded">
                    <input
                      type="checkbox"
                      checked={activeFilters.states.includes(state)}
                      onChange={() => toggleArrayFilter('states', state)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">{state}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          
          {/* Date Range Filter */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="datetime-local"
                  value={activeFilters.dateRange.start}
                  onChange={(e) => updateFilter('dateRange', { ...activeFilters.dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Start date"
                />
              </div>
              <div>
                <input
                  type="datetime-local"
                  value={activeFilters.dateRange.end}
                  onChange={(e) => updateFilter('dateRange', { ...activeFilters.dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="End date"
                />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Active Filter Tags */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
          {activeFilters.search && (
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
              Search: "{activeFilters.search}"
              <button onClick={() => updateFilter('search', '')} className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {activeFilters.services.map(service => (
            <span key={service} className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm">
              Service: {service}
              <button onClick={() => toggleArrayFilter('services', service)} className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {activeFilters.severities.map(severity => (
            <span key={severity} className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-sm capitalize">
              Severity: {severity}
              <button onClick={() => toggleArrayFilter('severities', severity)} className="hover:bg-red-200 dark:hover:bg-red-800 rounded-full p-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

