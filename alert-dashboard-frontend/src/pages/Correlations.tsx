import { useState, useEffect, useMemo } from 'react'
import { GitMerge, AlertCircle, Clock, TrendingUp, Users, Link as LinkIcon, Filter, X } from 'lucide-react'
import { apiService } from '../services/api'

const Correlations = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<any>(null)
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterCorrelationStrength, setFilterCorrelationStrength] = useState<string>('all')
  const [filterService, setFilterService] = useState<string>('all')
  const [filterCorrelationType, setFilterCorrelationType] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const correlationData = await apiService.getCorrelations()
      setData(correlationData)
      setError(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load correlation data'
      setError(errorMessage)
      console.error('Correlations error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Safely extract data with proper defaults - must be before early returns
  const correlations = useMemo(() => {
    return Array.isArray(data?.correlations) ? data.correlations : []
  }, [data])

  const incidents = useMemo(() => {
    return Array.isArray(data?.incidents) ? data.incidents : []
  }, [data])

  const summary = useMemo(() => {
    return data?.summary || {}
  }, [data])

  // Calculate total correlations count
  const totalCorrelations = useMemo(() => {
    return correlations.length
  }, [correlations])

  // Helper function to determine correlation strength from score
  const getCorrelationStrength = (score: number): string => {
    if (score >= 0.8) return 'strong'
    if (score >= 0.6) return 'moderate'
    return 'weak'
  }

  // Calculate services affected from incidents
  const servicesAffected = useMemo(() => {
    if (incidents.length === 0) return 0
    const allServices = new Set<string>()
    incidents.forEach((incident: any) => {
      if (incident.affected_services && Array.isArray(incident.affected_services)) {
        incident.affected_services.forEach((service: string) => allServices.add(service))
      } else if (incident.alerts && Array.isArray(incident.alerts)) {
        incident.alerts.forEach((alert: any) => {
          if (alert.service_name) allServices.add(alert.service_name)
        })
      }
    })
    return allServices.size
  }, [incidents])

  // Get unique services for filter dropdown
  const uniqueServices = useMemo(() => {
    const services = new Set<string>()
    if (Array.isArray(correlations)) {
      correlations.forEach((corr: any) => {
        if (corr?.primary_alert?.service_name) {
          services.add(corr.primary_alert.service_name)
        }
        if (Array.isArray(corr?.related_alerts)) {
          corr.related_alerts.forEach((alert: any) => {
            if (alert?.service_name) {
              services.add(alert.service_name)
            }
          })
        }
      })
    }
    if (Array.isArray(incidents)) {
      incidents.forEach((incident: any) => {
        if (Array.isArray(incident?.affected_services)) {
          incident.affected_services.forEach((service: string) => {
            if (service) services.add(service)
          })
        }
      })
    }
    return Array.from(services).sort()
  }, [correlations, incidents])

  // Filter and search correlations
  const filteredCorrelations = useMemo(() => {
    if (!Array.isArray(correlations)) return []
    return correlations.filter((corr: any) => {
      if (!corr) return false
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const correlationId = (corr.correlation_id || '').toLowerCase()
        const primaryService = (corr.primary_alert?.service_name || '').toLowerCase()
        const primaryAlertType = (corr.primary_alert?.alert_type || '').toLowerCase()
        const relatedServices = Array.isArray(corr.related_alerts) 
          ? corr.related_alerts.map((a: any) => a?.service_name?.toLowerCase() || '').join(' ')
          : ''
        
        if (!correlationId.includes(query) && 
            !primaryService.includes(query) && 
            !primaryAlertType.includes(query) &&
            !relatedServices.includes(query)) {
          return false
        }
      }

      // Correlation strength filter
      if (filterCorrelationStrength !== 'all') {
        const strength = getCorrelationStrength(corr.correlation_score || 0)
        if (strength !== filterCorrelationStrength) return false
      }

      // Service filter
      if (filterService !== 'all') {
        const hasService = corr.primary_alert?.service_name === filterService ||
          (Array.isArray(corr.related_alerts) && corr.related_alerts.some((a: any) => a?.service_name === filterService))
        if (!hasService) return false
      }

      // Correlation type filter
      if (filterCorrelationType !== 'all') {
        if (corr.correlation_type !== filterCorrelationType) return false
      }

      return true
    })
  }, [correlations, searchQuery, filterCorrelationStrength, filterService, filterCorrelationType])

  // Filter and search incidents
  const filteredIncidents = useMemo(() => {
    if (!Array.isArray(incidents)) return []
    const filtered = incidents.filter((incident: any) => {
      if (!incident) return false
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const incidentId = (incident.incident_id || '').toLowerCase()
        const services = Array.isArray(incident.affected_services) 
          ? incident.affected_services.join(' ').toLowerCase()
          : ''
        const alertTypes = Array.isArray(incident.alert_types)
          ? incident.alert_types.join(' ').toLowerCase()
          : ''
        
        if (!incidentId.includes(query) && 
            !services.includes(query) && 
            !alertTypes.includes(query)) {
          return false
        }
      }

      // Severity filter
      if (filterSeverity !== 'all') {
        if (incident.severity !== filterSeverity) return false
      }

      // Service filter
      if (filterService !== 'all') {
        const hasService = (Array.isArray(incident.affected_services) && incident.affected_services.includes(filterService)) ||
          (Array.isArray(incident.alerts) && incident.alerts.some((a: any) => a?.service_name === filterService))
        if (!hasService) return false
      }

      return true
    })

    // Sort by timestamp (newest first)
    return filtered.sort((a: any, b: any) => {
      const timeA = a.start_time ? new Date(a.start_time).getTime() : 
                    (a.timestamp ? new Date(a.timestamp).getTime() : 0)
      const timeB = b.start_time ? new Date(b.start_time).getTime() : 
                    (b.timestamp ? new Date(b.timestamp).getTime() : 0)
      return timeB - timeA // Descending order (newest first)
    })
  }, [incidents, searchQuery, filterSeverity, filterService])

  // Reset filters
  const resetFilters = () => {
    setSearchQuery('')
    setFilterSeverity('all')
    setFilterCorrelationStrength('all')
    setFilterService('all')
    setFilterCorrelationType('all')
  }

  const hasActiveFilters = searchQuery || filterSeverity !== 'all' || filterCorrelationStrength !== 'all' || 
    filterService !== 'all' || filterCorrelationType !== 'all'

  // Early returns after all hooks
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-600" />
          <div>
            <h3 className="text-red-800 font-semibold">Error Loading Correlations</h3>
            <p className="text-red-600 text-sm">{error || 'Unknown error occurred'}</p>
            <button 
              onClick={loadData}
              className="mt-2 text-sm text-red-700 underline hover:text-red-800"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alert Correlations & Incidents</h1>
        <p className="text-gray-600 mt-1">Identify related alerts and complex incidents across services</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Incidents Detected</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.total_incidents || incidents.length || 0}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <GitMerge className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Strong Correlations</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {correlations.filter((c: any) => {
                  const strength = getCorrelationStrength(c.correlation_score || 0)
                  return strength === 'strong'
                }).length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Services Affected</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{servicesAffected || 0}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-primary-50 border-primary-500 text-primary-700'
                : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {[searchQuery, filterSeverity, filterCorrelationStrength, filterService, filterCorrelationType].filter(f => f !== 'all' && f !== '').length}
              </span>
            )}
          </button>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Correlation Strength Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Correlation Strength</label>
              <select
                value={filterCorrelationStrength}
                onChange={(e) => setFilterCorrelationStrength(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              >
                <option value="all">All Strengths</option>
                <option value="strong">Strong</option>
                <option value="moderate">Moderate</option>
                <option value="weak">Weak</option>
              </select>
            </div>

            {/* Service Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-gray-900"
              >
                <option value="all">All Services</option>
                {uniqueServices.map((service) => (
                  <option key={service} value={service}>{service}</option>
                ))}
              </select>
            </div>

          </div>
        )}
      </div>

      {/* Incidents List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-primary-600" />
            Detected Incidents
            {hasActiveFilters && (
              <span className="text-sm font-normal text-gray-500">
                ({filteredIncidents.length} of {incidents.length})
              </span>
            )}
          </h3>
        </div>
        
        {filteredIncidents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{incidents.length === 0 ? 'No incidents detected at this time' : 'No incidents match your filters'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredIncidents.map((incident: any, index: number) => (
              <div 
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">
                        Incident {incident.incident_id ? `#${incident.incident_id.split('_').pop()?.substring(0, 8)}` : `#${index + 1}`}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        incident.severity === 'critical' ? 'bg-red-100 text-red-800' :
                        incident.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                        incident.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {incident.severity || 'medium'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{incident.description || 'Multiple related alerts detected'}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {incident.alert_count || incident.alerts?.length || 0} alerts
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {incident.affected_services?.length || (() => {
                          if (!incident.alerts) return 1
                          const serviceSet = new Set<string>()
                          incident.alerts.forEach((alert: any) => {
                            if (alert.service_name) serviceSet.add(alert.service_name)
                          })
                          return serviceSet.size || 1
                        })()} services
                      </span>
                      {incident.duration_ms && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {Math.round(incident.duration_ms / 1000)}s
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {incident.start_time ? new Date(incident.start_time).toLocaleString() : new Date().toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {incident.root_cause_candidates && incident.root_cause_candidates.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-700">Possible Root Cause:</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {incident.root_cause_candidates[0].service_name}: {incident.root_cause_candidates[0].alert_type}
                      {incident.root_cause_candidates[0].reasoning && ` - ${incident.root_cause_candidates[0].reasoning}`}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Correlations Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary-600" />
            Alert Correlations
            {hasActiveFilters && (
              <span className="text-sm font-normal text-gray-500">
                ({filteredCorrelations.length} of {correlations.length})
              </span>
            )}
          </h3>
        </div>
        
        {filteredCorrelations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <LinkIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>{correlations.length === 0 ? 'No correlations found' : 'No correlations match your filters'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Correlation ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alert Pair
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Services
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Correlation Strength
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Window
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCorrelations.map((correlation: any, index: number) => {
                  const strength = getCorrelationStrength(correlation.correlation_score || 0)
                  const primaryAlert = correlation.primary_alert || {}
                  const relatedServices = new Set<string>()
                  if (primaryAlert.service_name) {
                    relatedServices.add(primaryAlert.service_name)
                  }
                  correlation.related_alerts?.forEach((a: any) => {
                    if (a?.service_name) relatedServices.add(a.service_name)
                  })
                  
                  return (
                    <tr key={correlation.correlation_id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <p className="font-mono text-xs text-gray-500">
                            {correlation.correlation_id ? correlation.correlation_id.substring(0, 12) + '...' : `corr_${index}`}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">{primaryAlert?.alert_type || primaryAlert?.alert_name || 'Alert A'}</p>
                          <p className="text-gray-500">↔ {correlation.related_alerts?.[0]?.alert_type || correlation.related_alerts?.[0]?.alert_name || 'Alert B'}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <p className="text-gray-900">{primaryAlert?.service_name || 'N/A'}</p>
                          {relatedServices.size > 0 && Array.from(relatedServices).slice(1, 3).map((service, idx) => (
                            service && <p key={idx} className="text-gray-500 text-xs">+ {service}</p>
                          ))}
                          {relatedServices.size > 3 && (
                            <p className="text-gray-400 text-xs">+ {relatedServices.size - 3} more</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          strength === 'strong' ? 'bg-green-100 text-green-800' :
                          strength === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {strength}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded">
                          {correlation.correlation_type || 'temporal'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {correlation.time_window_ms 
                          ? `${Math.round(correlation.time_window_ms / 1000)}s`
                          : correlation.time_window || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {correlation.correlation_score 
                          ? `${(correlation.correlation_score * 100).toFixed(1)}%`
                          : 'N/A'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected Incident Modal/Detail */}
      {selectedIncident && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedIncident(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Incident Details
              </h3>
              <button 
                onClick={() => setSelectedIncident(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-600">Severity</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">{selectedIncident.severity || 'medium'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-600">Description</p>
                <p className="text-gray-900">{selectedIncident.description || 'Multiple related alerts detected'}</p>
              </div>
              
              {selectedIncident.root_cause_candidates && selectedIncident.root_cause_candidates.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Root Cause Candidates</p>
                  <div className="space-y-2 mt-2">
                    {selectedIncident.root_cause_candidates.map((rc: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-gray-900 font-medium">{rc.service_name}: {rc.alert_type}</p>
                        <p className="text-sm text-gray-600 mt-1">{rc.reasoning}</p>
                        <p className="text-xs text-gray-500 mt-1">Confidence: {(rc.confidence * 100).toFixed(1)}%</p>
                        {rc.propagation_pattern && rc.propagation_pattern.length > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            Propagation: {rc.propagation_pattern.join(' → ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedIncident.alerts && (
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Related Alerts ({selectedIncident.alerts.length})</p>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedIncident.alerts.map((alert: any, idx: number) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded-lg text-sm">
                        <p className="font-medium">{alert.alert_name || alert.alert_type}</p>
                        <p className="text-gray-600">{alert.service_name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Correlations

