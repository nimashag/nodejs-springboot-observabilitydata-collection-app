import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronUp,
  CircleDot,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Siren,
  Sparkles,
  Clock,
  Database,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  fetchIncidents,
  fetchAllIncidents,
} from "../../api/anomalies/anomalyApi";
import type {
  IncidentsPayload,
  IncidentSummaryItem,
  AllIncidentsResponse,
} from "../../types/anomalies/anomaly.types";

type SeverityFilter = "all" | "high" | "medium" | "low";
type ReasonToken = "duration" | "cpu" | "db" | "status5xx" | "unknown";
type RootCauseInsight = {
  label: string;
  count: number;
  services: string[];
  service_breakdown: Array<{ name: string; count: number }>;
};
type DashboardIncident = IncidentSummaryItem & {
  occurrence_count?: number;
  first_detected_at?: string;
  last_detected_at?: string;
};
const PIE_COLORS = ["#059669", "#0891B2", "#14B8A6", "#22C55E", "#0284C7", "#65A30D"];

function incidentSignature(incident: IncidentSummaryItem): string {
  return [
    incident.request_id || "",
    incident.service || "",
    String(incident.status_code ?? ""),
    incident.level || "",
    incident.reason || "",
    (incident.events || []).join("|"),
  ].join("::");
}

function parseReasonTokens(reason: string): ReasonToken[] {
  if (!reason) return [];
  const parts = reason
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.map((part): ReasonToken => {
    if (part.startsWith("duration_ms>=")) return "duration";
    if (part.startsWith("cpu>=")) return "cpu";
    if (part.startsWith("db_query_time_ms>=")) return "db";
    if (part.startsWith("status_code>=")) return "status5xx";
    return "unknown";
  });
}

function reasonTokenLabel(token: ReasonToken): string {
  if (token === "duration") return "High request latency";
  if (token === "cpu") return "High CPU utilization";
  if (token === "db") return "Slow database operations";
  if (token === "status5xx") return "Server-side failures (5xx)";
  return "Unclassified anomaly condition";
}

function buildIncidentNarrative(incident: IncidentSummaryItem): string {
  const tokens = parseReasonTokens(incident.reason || "");
  const events = (incident.events || []).slice(0, 2).filter(Boolean);
  const eventText = events.length
    ? `Event pattern: ${events.join(", ")}. `
    : "";

  if (!tokens.length) {
    return `${eventText}Analysis: anomaly detected by model behavior.`;
  }

  const thresholdLabels = tokens.map((token) => {
    if (token === "duration") return "duration >= 3000ms";
    if (token === "cpu") return "cpu >= 80%";
    if (token === "db") return "db query time >= 300ms";
    if (token === "status5xx") return "status code >= 500";
    return "custom rule triggered";
  });

  return `${eventText}Analysis: thresholds exceeded -> ${thresholdLabels.join(", ")}.`;
}

function getSeverity(incident: IncidentSummaryItem): SeverityFilter {
  const level = (incident.level || "info").toLowerCase();
  const statusCode = Number(incident.status_code || 0);
  if (statusCode >= 500 || level === "error" || level === "fatal")
    return "high";
  if (
    (statusCode >= 400 && statusCode < 500) ||
    level === "warn" ||
    level === "warning"
  )
    return "medium";
  return "low";
}

function levelBadgeClass(level: string): string {
  const normalized = level.toLowerCase();
  if (normalized === "error" || normalized === "fatal") {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  }
  if (normalized === "warn" || normalized === "warning") {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  }
  return "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300";
}

function statusBadgeClass(statusCode: number): string {
  if (statusCode >= 500)
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300";
  if (statusCode >= 400)
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
}

export default function AnomalyDashboard() {
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"latest" | "all">("all"); // New: view mode toggle
  const [data, setData] = useState<IncidentsPayload | null>(null);
  const [allIncidentsData, setAllIncidentsData] =
    useState<AllIncidentsResponse | null>(null);
  const [expandedRootCause, setExpandedRootCause] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsFetching(true);
      setError(null);

      // Fetch latest snapshot
      const payload = await fetchIncidents();
      console.log("[AnomalyDashboard] ✅ Latest data loaded:", {
        total_rows: payload.total_rows,
        predicted_anomaly_count: payload.predicted_anomaly_count,
        incidents_count: payload.incidents?.length || 0,
        has_incidents: (payload.incidents?.length || 0) > 0,
      });
      setData(payload);

      // Fetch all historical incidents
      const allIncidents = await fetchAllIncidents(100); // Last 100 files
      console.log("[AnomalyDashboard] ✅ Historical data loaded:", {
        total_incidents: allIncidents.total_count,
        files_scanned: allIncidents.files_scanned,
        total_files: allIncidents.total_files,
      });
      setAllIncidentsData(allIncidents);
    } catch (err) {
      console.error("[AnomalyDashboard] ❌ Error loading data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to fetch incidents",
      );
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

  const allHistoricalIncidentsRaw = useMemo(
    () => allIncidentsData?.all_incidents || [],
    [allIncidentsData],
  );

  const historicalIncidentsDeduped = useMemo<DashboardIncident[]>(() => {
    if (!allHistoricalIncidentsRaw.length) return [];

    const grouped = new Map<string, DashboardIncident>();
    allHistoricalIncidentsRaw.forEach((incident) => {
      const key = incidentSignature(incident);
      const currentDetectedAt = incident.detected_at || "";
      const existing = grouped.get(key);

      if (!existing) {
        grouped.set(key, {
          ...incident,
          occurrence_count: 1,
          first_detected_at: currentDetectedAt,
          last_detected_at: currentDetectedAt,
          detected_at: currentDetectedAt,
        });
        return;
      }

      const existingLast = existing.last_detected_at || "";
      const existingFirst = existing.first_detected_at || "";
      const nextLast =
        currentDetectedAt && currentDetectedAt > existingLast
          ? currentDetectedAt
          : existingLast;
      const nextFirst =
        !existingFirst || (currentDetectedAt && currentDetectedAt < existingFirst)
          ? currentDetectedAt
          : existingFirst;

      const useCurrentAsBase =
        currentDetectedAt &&
        (!existingLast || currentDetectedAt > existingLast);

      grouped.set(
        key,
        useCurrentAsBase
          ? {
              ...incident,
              occurrence_count: (existing.occurrence_count || 1) + 1,
              first_detected_at: nextFirst,
              last_detected_at: nextLast,
              detected_at: nextLast,
            }
          : {
              ...existing,
              occurrence_count: (existing.occurrence_count || 1) + 1,
              first_detected_at: nextFirst,
              last_detected_at: nextLast,
              detected_at: nextLast,
            },
      );
    });

    return Array.from(grouped.values()).sort((a, b) => {
      const byOccurrences =
        (b.occurrence_count || 1) - (a.occurrence_count || 1);
      if (byOccurrences !== 0) return byOccurrences;
      return (
        new Date(b.last_detected_at || 0).getTime() -
        new Date(a.last_detected_at || 0).getTime()
      );
    });
  }, [allHistoricalIncidentsRaw]);

  // Get incidents based on view mode
  const currentIncidents = useMemo<DashboardIncident[]>(() => {
    if (viewMode === "all") {
      return historicalIncidentsDeduped;
    }
    return data?.incidents || [];
  }, [viewMode, data, historicalIncidentsDeduped]);

  const services = useMemo(() => {
    if (!currentIncidents.length) return [];
    return Array.from(
      new Set(
        currentIncidents.map((incident) => incident.service).filter(Boolean),
      ),
    ).sort();
  }, [currentIncidents]);

  const filteredIncidents = useMemo<DashboardIncident[]>(() => {
    return currentIncidents.filter((incident) => {
      const severityMatches =
        severityFilter === "all" || getSeverity(incident) === severityFilter;
      const serviceMatches =
        serviceFilter === "all" || incident.service === serviceFilter;
      return severityMatches && serviceMatches;
    });
  }, [currentIncidents, severityFilter, serviceFilter]);

  const filteredHistoricalRawIncidents = useMemo(() => {
    return allHistoricalIncidentsRaw.filter((incident) => {
      const severityMatches =
        severityFilter === "all" || getSeverity(incident) === severityFilter;
      const serviceMatches =
        serviceFilter === "all" || incident.service === serviceFilter;
      return severityMatches && serviceMatches;
    });
  }, [allHistoricalIncidentsRaw, severityFilter, serviceFilter]);

  const latestAnomalyRows = data?.predicted_anomaly_count ?? 0;
  const latestNormalRows = data?.predicted_normal_count ?? 0;
  const latestTotalRows = data?.total_rows ?? 0;
  const latestIncidentRequests = data?.incidents?.length ?? 0;
  const historicalUniqueIncidents = filteredIncidents.length;
  const historicalDetections = filteredHistoricalRawIncidents.length;

  const trendData = useMemo(() => {
    if (viewMode === "all") {
      const buckets = new Map<string, { count: number; ts: number; label: string }>();
      filteredHistoricalRawIncidents.forEach((incident) => {
        const ts = incident.detected_at;
        if (!ts) return;
        const date = new Date(ts);
        const key = date.toISOString();
        const existing = buckets.get(key);
        if (existing) {
          existing.count += 1;
          return;
        }
        buckets.set(key, {
          count: 1,
          ts: date.getTime(),
          label: date.toLocaleTimeString(),
        });
      });
      return Array.from(buckets.values())
        .sort((a, b) => a.ts - b.ts)
        .map((item) => ({ name: item.label, count: item.count }));
    }

    return filteredIncidents.map((incident, index) => ({
      name: `#${index + 1}`,
      score:
        incident.max_anomaly_score ??
        (incident.reason ? incident.reason.split(";").filter(Boolean).length : 1),
    }));
  }, [viewMode, filteredIncidents, filteredHistoricalRawIncidents]);

  const serviceImpactData = useMemo(() => {
    const counts = new Map<string, number>();
    filteredIncidents.forEach((incident) => {
      counts.set(
        incident.service || "unknown",
        (counts.get(incident.service || "unknown") || 0) + 1,
      );
    });
    return Array.from(counts.entries())
      .map(([service, incidents]) => ({ service, incidents }))
      .sort((a, b) => b.incidents - a.incidents)
      .slice(0, 6);
  }, [filteredIncidents]);
  const serviceImpactPieData = useMemo(
    () =>
      serviceImpactData.map((item, idx) => ({
        ...item,
        fill: PIE_COLORS[idx % PIE_COLORS.length],
      })),
    [serviceImpactData],
  );

  const metaText = useMemo(() => {
    if (!data) return "";
    if (viewMode === "all" && allIncidentsData) {
      return `Historical view: ${historicalIncidentsDeduped.length} unique incidents (${allIncidentsData.total_count} detections) from ${allIncidentsData.files_scanned} snapshots`;
    }
    return `Latest snapshot: ${data.generated_at}`;
  }, [data, viewMode, allIncidentsData, historicalIncidentsDeduped]);

  const countDefinitionText = useMemo(() => {
    if (viewMode === "all") {
      return `Historical mode: ${historicalUniqueIncidents} unique incidents were seen ${historicalDetections} times across snapshots.`;
    }
    return `Latest mode: anomaly rows (${latestAnomalyRows}) are row-level predictions; incidents (${latestIncidentRequests}) are grouped by request_id.`;
  }, [
    viewMode,
    historicalUniqueIncidents,
    historicalDetections,
    latestAnomalyRows,
    latestIncidentRequests,
  ]);

  const storySummaryText = useMemo(() => {
    if (viewMode === "all") {
      return `${historicalUniqueIncidents} unique incident(s) detected from ${historicalDetections} historical detection(s).`;
    }
    return data?.incident_story?.summary || "-";
  }, [viewMode, data, historicalUniqueIncidents, historicalDetections]);

  const storyTopServices = useMemo(() => {
    if (viewMode !== "all") return data?.incident_story?.top_services || [];
    const counts = new Map<string, number>();
    filteredIncidents.forEach((incident) => {
      counts.set(
        incident.service || "unknown",
        (counts.get(incident.service || "unknown") || 0) +
          (incident.occurrence_count || 1),
      );
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) as Array<[string, number]>;
  }, [viewMode, data, filteredIncidents]);

  const storyTopEvents = useMemo(() => {
    if (viewMode !== "all") return data?.incident_story?.top_events || [];
    const counts = new Map<string, number>();
    filteredIncidents.forEach((incident) => {
      (incident.events || []).forEach((eventName) => {
        if (!eventName) return;
        counts.set(
          eventName,
          (counts.get(eventName) || 0) + (incident.occurrence_count || 1),
        );
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) as Array<[string, number]>;
  }, [viewMode, data, filteredIncidents]);

  const storyTopStatusCodes = useMemo(() => {
    if (viewMode !== "all") return data?.incident_story?.top_status_codes || [];
    const counts = new Map<string, number>();
    filteredIncidents.forEach((incident) => {
      const key = String(incident.status_code ?? "unknown");
      counts.set(
        key,
        (counts.get(key) || 0) + (incident.occurrence_count || 1),
      );
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) as Array<[string, number]>;
  }, [viewMode, data, filteredIncidents]);

  const rootCauseInsights = useMemo<RootCauseInsight[]>(() => {
    const counters = new Map<
      ReasonToken,
      { count: number; services: Set<string>; serviceCounts: Map<string, number> }
    >();
    filteredIncidents.forEach((incident) => {
      const weight = viewMode === "all" ? incident.occurrence_count || 1 : 1;
      const serviceName = incident.service || "unknown";
      parseReasonTokens(incident.reason || "").forEach((token) => {
        const entry = counters.get(token) || {
          count: 0,
          services: new Set<string>(),
          serviceCounts: new Map<string, number>(),
        };
        entry.count += weight;
        entry.services.add(serviceName);
        entry.serviceCounts.set(
          serviceName,
          (entry.serviceCounts.get(serviceName) || 0) + weight,
        );
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
        service_breakdown: Array.from(details.serviceCounts.entries())
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count),
      }));
  }, [filteredIncidents, viewMode]);

  const rootCauseTotalCount = useMemo(
    () => rootCauseInsights.reduce((sum, item) => sum + item.count, 0),
    [rootCauseInsights],
  );

  const storyContextText = useMemo(() => {
    if (viewMode === "all") {
      return `Scope: last ${allIncidentsData?.files_scanned || 0} snapshot files. Counts are weighted by recurrence.`;
    }
    return `Scope: latest snapshot only (${data?.generated_at || "n/a"}).`;
  }, [viewMode, allIncidentsData, data]);

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
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {isLoading ? "Loading..." : metaText || "-"}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 lg:w-[720px]">
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">
                View Mode
              </label>
              <select
                value={viewMode}
                onChange={(event) =>
                  setViewMode(event.target.value as "latest" | "all")
                }
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="latest">Latest Snapshot</option>
                <option value="all">All Historical</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Severity
              </label>
              <select
                value={severityFilter}
                onChange={(event) =>
                  setSeverityFilter(event.target.value as SeverityFilter)
                }
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              >
                <option value="all">All</option>
                <option value="high">High (5xx / error)</option>
                <option value="medium">Medium (4xx / warn)</option>
                <option value="low">Low (others)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 dark:text-gray-400">
                Service
              </label>
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
                <RefreshCcw
                  className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
                />
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
        <StatCard
          label={viewMode === "all" ? "Latest Total Rows" : "Total Rows"}
          value={latestTotalRows}
          icon={<BarChart3 className="h-5 w-5" />}
        />
        <StatCard
          label={viewMode === "all" ? "Latest Anomaly Rows" : "Anomalies (Rows)"}
          value={latestAnomalyRows}
          accent="red"
          icon={<Siren className="h-5 w-5" />}
        />
        <StatCard
          label={viewMode === "all" ? "Latest Normal Rows" : "Normals (Rows)"}
          value={latestNormalRows}
          accent="green"
          icon={<ShieldCheck className="h-5 w-5" />}
        />
        <StatCard
          label={
            viewMode === "all"
              ? "Historical Unique Incidents"
              : "Latest Incidents"
          }
          value={viewMode === "all" ? historicalUniqueIncidents : filteredIncidents.length}
          accent="indigo"
          icon={<ShieldAlert className="h-5 w-5" />}
        />
        <StatCard
          label={viewMode === "all" ? "Historical Detections" : "Historical Files"}
          value={viewMode === "all" ? historicalDetections : allIncidentsData?.total_files}
          accent="slate"
          icon={<Database className="h-5 w-5" />}
        />
      </div>

      <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900 dark:border-cyan-900/40 dark:bg-cyan-950/20 dark:text-cyan-200">
        {countDefinitionText}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Incident Story
            </h2>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-1 text-xs font-semibold ${
                  viewMode === "all"
                    ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300"
                    : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                }`}
              >
                {viewMode === "all" ? "Historical Summary" : "Latest Snapshot"}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Auto-generated
              </span>
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-gray-800 dark:text-gray-200">
            {storySummaryText}
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {storyContextText}
          </p>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Unique Incidents
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {viewMode === "all" ? historicalUniqueIncidents : latestIncidentRequests}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Detections
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {viewMode === "all" ? historicalDetections : latestAnomalyRows}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
              <p className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Services
              </p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {services.length}
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 dark:border-cyan-900/40 dark:bg-cyan-950/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
              Root Cause Analysis
            </p>
            <div className="mt-2 space-y-2">
              {rootCauseInsights.length ? (
                rootCauseInsights.map((item) => {
                  const percent =
                    rootCauseTotalCount > 0
                      ? Math.round((item.count / rootCauseTotalCount) * 100)
                      : 0;
                  const isExpanded = expandedRootCause === item.label;
                  return (
                    <div
                      key={item.label}
                      className="rounded-lg border border-cyan-200 bg-white/70 p-2 dark:border-cyan-900/50 dark:bg-slate-900/30"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRootCause(isExpanded ? null : item.label)
                        }
                        className="flex w-full items-center justify-between gap-2 text-left"
                      >
                        <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                          {item.label}
                        </span>
                        <span className="inline-flex items-center gap-2 text-xs font-semibold text-cyan-700 dark:text-cyan-300">
                          {item.count} detections • {percent}% share
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </span>
                      </button>
                      <div className="mt-1 h-1.5 w-full rounded-full bg-cyan-100 dark:bg-cyan-950/40">
                        <div
                          className="h-1.5 rounded-full bg-cyan-500 dark:bg-cyan-400"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      {isExpanded ? (
                        <div className="mt-2 rounded-md border border-cyan-100 bg-cyan-50 p-2 dark:border-cyan-900/40 dark:bg-cyan-950/20">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
                            Affected Services
                          </p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {item.service_breakdown.map((svc) => (
                              <span
                                key={`${item.label}-${svc.name}`}
                                className="rounded-full border border-cyan-200 bg-white px-2 py-0.5 text-[11px] text-gray-700 dark:border-cyan-800 dark:bg-slate-900/30 dark:text-gray-200"
                              >
                                {svc.name} ({svc.count})
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  No dominant root cause found for the current filters.
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 space-y-2 text-xs text-gray-600 dark:text-gray-400">
            <div>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                Top services:{" "}
              </span>
              {storyTopServices
                .map(([name, count]) => `${name} (${count})`)
                .join(", ") || "-"}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-white p-5 shadow-sm dark:border-cyan-900/40 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Anomaly Trend
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {viewMode === "all"
              ? "Historical detections per snapshot"
              : "Latest snapshot incident score"}
          </p>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              {viewMode === "all" ? (
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891b2" stopOpacity={0.38} />
                      <stop offset="95%" stopColor="#0891b2" stopOpacity={0.06} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    minTickGap={26}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [`${value} detections`, "Count"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#0891b2"
                    strokeWidth={2.4}
                    fill="url(#trendFill)"
                  />
                </AreaChart>
              ) : (
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" hide />
                  <YAxis allowDecimals={false} />
                  <Tooltip formatter={(value: number) => [`${value}`, "Score"]} />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#0891b2"
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm dark:border-emerald-900/40 dark:bg-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Service Impact
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Top services
          </p>
          <div className="mt-3 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={serviceImpactPieData}
                  dataKey="incidents"
                  nameKey="service"
                  cx="50%"
                  cy="44%"
                  outerRadius={80}
                  label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {serviceImpactPieData.map((entry) => (
                    <Cell key={entry.service} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} incidents`, "Count"]} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Incidents
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredIncidents.length} incident(s) | Mode:{" "}
            {viewMode === "all" ? "All Historical" : "Latest Snapshot"} |
            Severity: {severityFilter} | Service: {serviceFilter}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                {viewMode === "all" && <Th>Detected At</Th>}
                {viewMode === "all" && <Th>Seen In Snapshots</Th>}
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
              {filteredIncidents.map((incident, idx) => (
                <tr
                  key={`${incident.request_id}-${incident.service}-${incident.detected_at || idx}`}
                  className="border-t border-gray-100 transition-colors hover:bg-cyan-50 dark:border-gray-700 dark:hover:bg-cyan-950/20"
                >
                  {viewMode === "all" && (
                    <Td mono>
                      <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        {incident.last_detected_at
                          ? new Date(incident.last_detected_at).toLocaleString()
                          : incident.detected_at
                            ? new Date(incident.detected_at).toLocaleString()
                          : "-"}
                      </div>
                    </Td>
                  )}
                  {viewMode === "all" && (
                    <Td mono>{incident.occurrence_count || 1}</Td>
                  )}
                  <Td mono>{incident.request_id}</Td>
                  <Td>{incident.service}</Td>
                  <Td>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(Number(incident.status_code || 0))}`}
                    >
                      {incident.status_code}
                    </span>
                  </Td>
                  <Td>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${levelBadgeClass(incident.level || "info")}`}
                    >
                      {(incident.level || "info").toLowerCase()}
                    </span>
                  </Td>
                  <Td mono>{incident.level_encoded}</Td>
                  <Td mono>{incident.events?.join(", ") || "-"}</Td>
                  <Td>{buildIncidentNarrative(incident)}</Td>
                </tr>
              ))}
              {!filteredIncidents.length ? (
                <tr>
                  <td
                    colSpan={viewMode === "all" ? 9 : 7}
                    className="px-5 py-12 text-center text-sm text-gray-500 dark:text-gray-400"
                  >
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
  accent = "slate",
  icon,
}: {
  label: string;
  value: number | undefined;
  accent?: "slate" | "red" | "green" | "indigo";
  icon?: ReactNode;
}) {
  const accentClass: Record<typeof accent, string> = {
    slate: "border-gray-200 dark:border-gray-700",
    red: "border-red-200 dark:border-red-800 bg-gradient-to-br from-red-50 to-white dark:from-red-950/20 dark:to-gray-800",
    green:
      "border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-gray-800",
    indigo:
      "border-cyan-200 dark:border-cyan-800 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/20 dark:to-gray-800",
  };

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${accentClass[accent]}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
        <span className="text-gray-400 dark:text-gray-500">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">
        {value ?? "-"}
      </p>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return (
    <th className="px-5 py-3 text-left font-semibold text-gray-700 dark:text-gray-200">
      {children}
    </th>
  );
}

function Td({
  children,
  mono = false,
}: {
  children: ReactNode;
  mono?: boolean;
}) {
  return (
    <td
      className={`px-5 py-3 text-gray-700 dark:text-gray-300 ${mono ? "font-mono text-xs" : ""}`}
    >
      {children}
    </td>
  );
}
