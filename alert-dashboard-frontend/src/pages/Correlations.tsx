import { useState, useEffect } from 'react'
import { GitMerge, AlertCircle, Clock, TrendingUp, Users, Link as LinkIcon } from 'lucide-react'
import { apiService } from '../services/api'

const Correlations = () => {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIncident, setSelectedIncident] = useState<any>(null)

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

  const { correlations = [], incidents = [], summary = {} } = data

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Alert Correlations & Incidents</h1>
        <p className="text-gray-600 mt-1">Identify related alerts and complex incidents across services</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Correlations</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.total_correlations || 0}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <LinkIcon className="w-8 h-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Incidents Detected</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.total_incidents || incidents.length}</p>
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
                {correlations.filter((c: any) => c.correlation_strength === 'strong').length}
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
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.services_involved || 0}</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <Users className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <GitMerge className="w-5 h-5 text-primary-600" />
          Detected Incidents
        </h3>
        
        {incidents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No incidents detected at this time</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map((incident: any, index: number) => (
              <div 
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedIncident(incident)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900">Incident #{incident.incident_id || index + 1}</h4>
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
                        {incident.services_affected || 1} services
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {incident.duration || 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">{incident.timestamp || new Date().toLocaleString()}</p>
                  </div>
                </div>
                
                {incident.root_cause && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-700">Possible Root Cause:</p>
                    <p className="text-sm text-gray-600 mt-1">{incident.root_cause}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Correlations Table */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <LinkIcon className="w-5 h-5 text-primary-600" />
          Alert Correlations
        </h3>
        
        {correlations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <LinkIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No correlations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alert Pair
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Correlation Strength
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time Window
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confidence
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {correlations.slice(0, 20).map((correlation: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="font-medium text-gray-900">{correlation.alert1_type || 'Alert A'}</p>
                        <p className="text-gray-500">↔ {correlation.alert2_type || 'Alert B'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        correlation.correlation_strength === 'strong' ? 'bg-green-100 text-green-800' :
                        correlation.correlation_strength === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {correlation.correlation_strength || 'moderate'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {correlation.time_window || '5 min'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {correlation.confidence ? `${(correlation.confidence * 100).toFixed(1)}%` : 'N/A'}
                    </td>
                  </tr>
                ))}
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
              
              {selectedIncident.root_cause && (
                <div>
                  <p className="text-sm font-medium text-gray-600">Root Cause</p>
                  <p className="text-gray-900">{selectedIncident.root_cause}</p>
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

