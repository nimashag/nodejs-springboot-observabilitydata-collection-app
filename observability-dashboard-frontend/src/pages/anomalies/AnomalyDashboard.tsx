import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CircleDot, RefreshCcw, ShieldAlert, ShieldCheck, Siren, Sparkles } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fetchIncidents } from '../../api/anomalies/anomalyApi';
import type { IncidentsPayload, IncidentSummaryItem } from '../../types/anomalies/anomaly.types';

type SeverityFilter = 'all' | 'high' | 'medium' | 'low';
type ReasonToken = 'duration' | 'cpu' | 'db' | 'status5xx' | 'unknown';

function parseReasonTokens(reason: string): ReasonToken[] {
  if (!reason) return [];
  const parts = reason
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.map((part): ReasonToken => {
    if (part.startsWith('duration_ms>=')) return 'duration';
    if (part.startsWith('cpu>=')) return 'cpu';
    if (part.startsWith('db_query_time_ms>=')) return 'db';
    if (part.startsWith('status_code>=')) return 'status5xx';
    return 'unknown';
  });
}

function reasonTokenLabel(token: ReasonToken): string {
  if (token === 'duration') return 'High request latency';
  if (token === 'cpu') return 'High CPU utilization';
  if (token === 'db') return 'Slow database operations';
  if (token === 'status5xx') return 'Server-side failures (5xx)';
  return 'Unclassified anomaly condition';
}

function buildIncidentNarrative(incident: IncidentSummaryItem): string {
  const tokens = parseReasonTokens(incident.reason || '');
  const events = (incident.events || []).slice(0, 2).filter(Boolean);
  const eventText = events.length ? `Event pattern: ${events.join(', ')}. ` : '';

  if (!tokens.length) {
    return `${eventText}Analysis: anomaly detected by model behavior.`;
  }

  const thresholdLabels = tokens.map((token) => {
    if (token === 'duration') return 'duration >= 3000ms';
    if (token === 'cpu') return 'cpu >= 80%';
    if (token === 'db') return 'db query time >= 300ms';
    if (token === 'status5xx') return 'status code >= 500';
    return 'custom rule triggered';
  });

  return `${eventText}Analysis: thresholds exceeded -> ${thresholdLabels.join(', ')}.`;
}

function getSeverity(incident: IncidentSummaryItem): SeverityFilter {
  const level = (incident.level || 'info').toLowerCase();
  const statusCode = Number(incident.status_code || 0);
  if (statusCode >= 500 || level === 'error' || level === 'fatal') return 'high';
  if ((statusCode >= 400 && statusCode < 500) || level === 'warn' || level === 'warning') return 'medium';
  return 'low';
}

function levelBadgeClass(level: string): string {
  const normalized = level.toLowerCase();
  if (normalized === 'error' || normalized === 'fatal') {
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  }
  if (normalized === 'warn' || normalized === 'warning') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  }
  return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
}

function statusBadgeClass(statusCode: number): string {
  if (statusCode >= 500) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (statusCode >= 400) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300';
}

export default function AnomalyDashboard() {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [serviceFilter, setServiceFilter] = useState<string>('all');
  const [data, setData] = useState<IncidentsPayload | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsFetching(true);
      setError(null);
      const payload = await fetchIncidents();
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch incidents');
    } finally {
      setIsLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = window.setInterval(loadData, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const services = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.incidents.map((incident) => incident.service).filter(Boolean))).sort();
  }, [data]);

  const filteredIncidents = useMemo(() => {
    if (!data) return [];
    return data.incidents.filter((incident) => {
      const severityMatches = severityFilter === 'all' || getSeverity(incident) === severityFilter;
      const serviceMatches = serviceFilter === 'all' || incident.service === serviceFilter;
      return severityMatches && serviceMatches;
    });
  }, [data, severityFilter, serviceFilter]);

  const trendData = useMemo(
    () =>
      filteredIncidents.map((incident, index) => ({
        name: `#${index + 1}`,
        score: incident.max_anomaly_score ?? (incident.reason ? incident.reason.split(';').filter(Boolean).length : 1),
      })),
    [filteredIncidents],
  );

  const serviceImpactData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredIncidents.forEach((incident) => {
      counts.set(incident.service || 'unknown', (counts.get(incident.service || 'unknown') || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([service, incidents]) => ({ service, incidents }))
      .sort((a, b) => b.incidents - a.incidents)
      .slice(0, 6);
  }, [filteredIncidents]);

  const metaText = useMemo(() => {
    if (!data) return '';
    return `Generated: ${data.generated_at}`;
  }, [data]);

  const rootCauseInsights = useMemo(() => {
    const counters = new Map<ReasonToken, { count: number; services: Set<string> }>();
    filteredIncidents.forEach((incident) => {
      parseReasonTokens(incident.reason || '').forEach((token) => {
        const entry = counters.get(token) || { count: 0, services: new Set<string>() };
        entry.count += 1;
        entry.services.add(incident.service || 'unknown');
        counters.set(token, entry);
      });
    });

    return Array.from(counters.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 3)
      .map(([token, details]) => ({
        label: reasonTokenLabel(token),
        count: details.count,
        services: Array.from(details.services).sort(),
      }));
  }, [filteredIncidents]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-emerald-50 p-6 shadow-sm dark:border-cyan-900/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live Dashboard
            </div>
            <h1 className="mt-3 flex items-center gap-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              <Sparkles className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
              Anomaly Incident Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{isLoading ? 'Loading...' : metaText || '-'}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:w-[560px]">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Severity</label>
              <select
                value={severityFilter}
                onChange={(event) => setSeverityFilter(event.target.value as SeverityFilter)}
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="all">All</option>
                <option value="high">High (5xx / error)</option>
                <option value="medium">Medium (4xx / warn)</option>
                <option value="low">Low (others)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">Service</label>
              <select
                value={serviceFilter}
                onChange={(event) => setServiceFilter(event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="all">All services</option>
                {services.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={loadData}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-900/20 hover:from-cyan-500 hover:to-emerald-500"
              >
                <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Failed to load anomaly incidents
          </div>
          <p className="mt-2 text-sm">{error}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard label="Total rows" value={data?.total_rows} icon={<BarChart3 className="h-5 w-5" />} />
        <StatCard label="Anomalies (rows)" value={data?.predicted_anomaly_count} accent="red" icon={<Siren className="h-5 w-5" />} />
        <StatCard label="Normals (rows)" value={data?.predicted_normal_count} accent="green" icon={<ShieldCheck className="h-5 w-5" />} />
        <StatCard label="Anomaly requests" value={filteredIncidents.length} accent="indigo" icon={<ShieldAlert className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Incident Story</h2>
            <span className="text-xs text-gray-500 dark:text-gray-400">Auto-generated</span>
          </div>
          <p className="mt-3 text-sm text-gray-700 dark:text-gray-300">{data?.incident_story?.summary || '-'}</p>
          <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 dark:border-cyan-900/40 dark:bg-cyan-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Root Cause Analysis</p>
            <ul className="mt-2 space-y-1 text-xs text-gray-700 dark:text-gray-300">
              {rootCauseInsights.length ? (
                rootCauseInsights.map((item) => (
                  <li key={item.label}>
                    <span
                      className="cursor-help underline decoration-dotted underline-offset-2"
                      title={`Affected services: ${item.services.join(', ')}`}
                    >
                      - {item.label} ({item.count})
                    </span>
                  </li>
                ))
              ) : (
                <li>- No dominant pattern found for current filters</li>
              )}
            </ul>
          </div>
          <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-semibold text-gray-800 dark:text-gray-200">Top services: </span>
              {(data?.incident_story?.top_services || []).map(([name, count]) => `${name} (${count})`).join(', ') || '-'}
            </div>
            <div>
              <span className="font-semibold text-gray-800 dark:text-gray-200">Top events: </span>
              {(data?.incident_story?.top_events || []).map(([name, count]) => `${name} (${count})`).join(', ') || '-'}
            </div>
            <div>
              <span className="font-semibold text-gray-800 dark:text-gray-200">Top status: </span>
              {(data?.incident_story?.top_status_codes || []).map(([name, count]) => `${name} (${count})`).join(', ') || '-'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm dark:border-cyan-900/40 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Anomaly Trend</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">By incident order</p>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" hide />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#0891b2" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-900/40 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Service Impact</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Top services</p>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceImpactData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="service" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="incidents" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Incidents</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredIncidents.length} incident(s) | Severity: {severityFilter} | Service: {serviceFilter}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <Th>Request ID</Th>
                <Th>Service</Th>
                <Th>Status</Th>
                <Th>Level</Th>
                <Th>Level Encoded</Th>
                <Th>Events</Th>
                <Th>Reason</Th>
              </tr>
            </thead>
            <tbody>
              {filteredIncidents.map((incident) => (
                <tr key={`${incident.request_id}-${incident.service}`} className="border-t border-gray-100 transition-colors hover:bg-cyan-50 dark:border-gray-700 dark:hover:bg-cyan-950/20">
                  <Td mono>{incident.request_id}</Td>
                  <Td>{incident.service}</Td>
                  <Td>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(Number(incident.status_code || 0))}`}>
                      {incident.status_code}
                    </span>
                  </Td>
                  <Td>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${levelBadgeClass(incident.level || 'info')}`}>
                      {(incident.level || 'info').toLowerCase()}
                    </span>
                  </Td>
                  <Td mono>{incident.level_encoded}</Td>
                  <Td mono>{incident.events?.join(', ') || '-'}</Td>
                  <Td>{buildIncidentNarrative(incident)}</Td>
                </tr>
              ))}
              {!filteredIncidents.length ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                    <div className="mx-auto flex w-fit items-center gap-2 rounded-full bg-gray-100 px-4 py-2 dark:bg-gray-700/60">
                      <CircleDot className="h-4 w-4" />
                      No incidents for current filters
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = 'slate',
  icon,
}: {
  label: string;
  value: number | undefined;
  accent?: 'slate' | 'red' | 'green' | 'indigo';
  icon?: ReactNode;
}) {
  const accentClass: Record<typeof accent, string> = {
    slate: 'border-gray-200 dark:border-gray-700',
    red: 'border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-gray-800',
    green: 'border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-800',
    indigo: 'border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/20 dark:to-gray-800',
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accentClass[accent]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{value ?? '-'}</p>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-5 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">{children}</th>;
}

function Td({ children, mono = false }: { children: ReactNode; mono?: boolean }) {
  return <td className={`px-5 py-3 text-gray-700 dark:text-gray-300 ${mono ? 'font-mono text-xs' : ''}`}>{children}</td>;
}
