import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { usePoll } from "../hooks/usePoll";

type AppSettings = {
  pollingEnabled: boolean;
  intervals: {
    healthMs: number;
    signalsMs: number;
    kpiMs: number;
    planMs: number;
    promMs: number;
  };
  ui: {
    defaultPromView: "raw" | "structured";
  };
};

function formatTime(ts?: number) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return "—";
  }
}

/* ---------------- Local UI (kept local for Overview only) ---------------- */

function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="card">
      <div className="cardHeader">
        <div>
          <div className="cardTitle">{title}</div>
          {subtitle ? <div className="cardSub">{subtitle}</div> : null}
        </div>
        {right ? <div className="cardRight">{right}</div> : null}
      </div>
      <div className="cardBody">{children}</div>
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="empty">
      <div className="emptyTitle">Error</div>
      <div className="emptySub mono">{text}</div>
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return <div className="muted">{children}</div>;
}

/* ---------------- Mini Charts (Overview) ---------------- */

function Sparkline({ values, height = 44 }: { values: number[]; height?: number }) {
  const w = 260;
  const h = height;
  if (!values.length) return <div className="muted">No data yet</div>;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1e-9, max - min);

  const pts = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * (w - 2) + 1;
      const y = (1 - (v - min) / span) * (h - 2) + 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg className="spark" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function BarList({ items }: { items: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...items.map((x) => x.value));
  return (
    <div className="barList">
      {items.map((it) => (
        <div className="barRow" key={it.label}>
          <div className="barLabel mono">{it.label}</div>
          <div className="barTrack">
            <div className="barFill" style={{ width: `${(it.value / max) * 100}%` }} />
          </div>
          <div className="barVal mono">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Overview Page ---------------- */

export default function Overview({ settings }: { settings: AppSettings }) {
  const pollOn = settings.pollingEnabled;

  const health = usePoll(api.health, { intervalMs: settings.intervals.healthMs, enabled: pollOn });
  const signals = usePoll(api.signals, { intervalMs: settings.intervals.signalsMs, enabled: pollOn });
  const kpi = usePoll(api.kpiCoverage, { intervalMs: settings.intervals.kpiMs, enabled: pollOn });
  const plan = usePoll(api.updatePlan, { intervalMs: settings.intervals.planMs, enabled: pollOn });

  const criticalCount =
    signals.data?.signals?.filter((s: any) => s?.signal && s?.severity === "critical").length ?? 0;

  const totalSignals = signals.data?.signals?.length ?? 0;

  const missingKpiServices =
    kpi.data?.results?.filter((r: any) => (r.missing_kpis || []).length > 0).length ?? 0;

  const totalRules = plan.data?.actions?.length ?? 0;

  const [hist, setHist] = useState<
    Array<{ t: number; critical: number; total: number; missingSvc: number; actions: number }>
  >([]);

  useEffect(() => {
    const hasAny =
      !!signals.data?.generated_at || !!kpi.data?.generated_at || !!plan.data?.generated_at || !!health.data?.ts;
    if (!hasAny) return;

    setHist((prev) => {
      const next = [
        ...prev,
        {
          t: Date.now(),
          critical: criticalCount,
          total: totalSignals,
          missingSvc: missingKpiServices,
          actions: totalRules,
        },
      ];
      return next.slice(-30);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signals.data?.generated_at, kpi.data?.generated_at, plan.data?.generated_at]);

  const sevBars = useMemo(() => {
    const list = signals.data?.signals ?? [];
    let crit = 0,
      warn = 0,
      info = 0,
      other = 0;
    for (const s of list as any[]) {
      const sev = String(s?.severity ?? "");
      if (sev === "critical") crit++;
      else if (sev === "warning") warn++;
      else if (sev === "info") info++;
      else other++;
    }
    return [
      { label: "critical", value: crit },
      { label: "warning", value: warn },
      { label: "info", value: info },
      { label: "other", value: other },
    ];
  }, [signals.data?.generated_at]);

  const topMissing = useMemo(() => {
    const rows = (kpi.data?.results ?? []) as any[];
    return rows
      .map((r) => ({
        label: String(r.service ?? "—"),
        value: Array.isArray(r.missing_kpis) ? r.missing_kpis.length : 0,
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [kpi.data?.generated_at]);

  const seriesCritical = hist.map((x) => x.critical);
  const seriesMissing = hist.map((x) => x.missingSvc);

  return (
    <>
      <div className="grid">
        <Card title="Status" subtitle="Agent health">
          {health.error ? (
            <ErrorBox text={health.error} />
          ) : (
            <div className="kv">
              <div className="kvRow">
                <div className="kvKey">Agent</div>
                <div className="kvVal">
                  <span className="status ok" /> Running
                </div>
              </div>
              <div className="kvRow">
                <div className="kvKey">Health</div>
                <div className="kvVal">{health.data?.ok ? "ok" : "—"}</div>
              </div>
              <div className="kvRow">
                <div className="kvKey">Last</div>
                <div className="kvVal">{formatTime(health.data?.ts)}</div>
              </div>
              {!settings.pollingEnabled ? <div className="muted">Polling is OFF (Settings)</div> : null}
            </div>
          )}
        </Card>

        <Card title="Signals" subtitle="Latest anomalies">
          {signals.error ? (
            <ErrorBox text={signals.error} />
          ) : (
            <div className="kv">
              <div className="kvRow">
                <div className="kvKey">Critical</div>
                <div className="kvVal">{criticalCount}</div>
              </div>
              <div className="kvRow">
                <div className="kvKey">Total signals</div>
                <div className="kvVal">{totalSignals}</div>
              </div>
              <div className="kvRow">
                <div className="kvKey">Generated</div>
                <div className="kvVal">{formatTime(signals.data?.generated_at)}</div>
              </div>
            </div>
          )}
        </Card>

        <Card title="KPI Coverage" subtitle="Coverage checker">
          {kpi.error ? (
            <ErrorBox text={kpi.error} />
          ) : (
            <div className="kv">
              <div className="kvRow">
                <div className="kvKey">Services missing KPIs</div>
                <div className="kvVal">{missingKpiServices}</div>
              </div>
              <div className="kvRow">
                <div className="kvKey">Services checked</div>
                <div className="kvVal">{kpi.data?.results?.length ?? 0}</div>
              </div>
              <div className="kvRow">
                <div className="kvKey">Generated</div>
                <div className="kvVal">{formatTime(kpi.data?.generated_at)}</div>
              </div>
            </div>
          )}
        </Card>

        <Card title="Update Plan" subtitle="Auto-telemetry actions">
          {plan.error ? (
            <ErrorBox text={plan.error} />
          ) : (
            <div className="kv">
              <div className="kvRow">
                <div className="kvKey">Total actions</div>
                <div className="kvVal">{totalRules}</div>
              </div>
              <div className="kvRow">
                <div className="kvKey">Generated</div>
                <div className="kvVal">{formatTime(plan.data?.generated_at)}</div>
              </div>
              <div className="kvRow">
                <div className="kvKey">What it means</div>
                <div className="kvVal">Routes → KPIs</div>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid" style={{ marginTop: 14 }}>
        <Card title="Trends" subtitle="Last samples (local history)">
          <div className="chartGrid">
            <div className="chartCard">
              <div className="chartTitle">Critical signals</div>
              <div className="chartSub mono">{seriesCritical.at(-1) ?? 0}</div>
              <Sparkline values={seriesCritical} />
            </div>

            <div className="chartCard">
              <div className="chartTitle">Services missing KPIs</div>
              <div className="chartSub mono">{seriesMissing.at(-1) ?? 0}</div>
              <Sparkline values={seriesMissing} />
            </div>
          </div>
          <Muted>These mini-trends update whenever API refreshes.</Muted>
        </Card>

        <Card title="Breakdown" subtitle="What needs attention right now">
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <div className="chartTitle">Signals by severity</div>
              <BarList items={sevBars} />
            </div>

            <div>
              <div className="chartTitle">Top services missing KPIs</div>
              {!topMissing.length ? <Muted>Nothing missing ✅</Muted> : <BarList items={topMissing} />}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}