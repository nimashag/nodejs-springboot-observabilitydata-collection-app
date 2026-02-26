import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../../api/metrics/metricsApi";
import { usePoll } from "../../hooks/usePoll";

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

/* ---------------- Local UI (Tailwind) ---------------- */

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
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div>
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {subtitle}
            </div>
          ) : null}
        </div>
        {right ? <div className="flex items-center gap-2">{right}</div> : null}
      </div>
      <div className="px-5 pb-5 pt-4">{children}</div>
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-red-300 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
      <div className="text-sm font-semibold text-red-700 dark:text-red-300">
        Error
      </div>
      <div className="mt-2 font-mono text-xs text-red-700/90 dark:text-red-200/90">
        {text}
      </div>
    </div>
  );
}

function Muted({ children }: { children: ReactNode }) {
  return (
    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
      {children}
    </div>
  );
}

/* ---------------- Mini Charts (Overview) ---------------- */

function Sparkline({
  values,
  height = 44,
}: {
  values: number[];
  height?: number;
}) {
  const w = 260;
  const h = height;
  if (!values.length)
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400">
        No data yet
      </div>
    );

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
    <svg
      className="text-blue-600 dark:text-blue-400"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
    >
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function BarList({
  items,
}: {
  items: Array<{ label: string; value: number }>;
}) {
  const max = Math.max(1, ...items.map((x) => x.value));
  return (
    <div className="mt-2 grid gap-2">
      {items.map((it) => (
        <div
          key={it.label}
          className="grid grid-cols-[1fr_2fr_50px] items-center gap-3"
        >
          <div className="truncate font-mono text-xs text-gray-800 dark:text-gray-200">
            {it.label}
          </div>

          <div className="h-2.5 overflow-hidden rounded-full border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/40">
            <div
              className="h-full rounded-full bg-blue-500/60 dark:bg-blue-400/50"
              style={{ width: `${(it.value / max) * 100}%` }}
            />
          </div>

          <div className="text-right font-mono text-xs text-gray-500 dark:text-gray-400">
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Overview Page ---------------- */

export default function Overview({ settings }: { settings: AppSettings }) {
  const pollOn = settings.pollingEnabled;

  const health = usePoll(api.health, {
    intervalMs: settings.intervals.healthMs,
    enabled: pollOn,
  });
  const signals = usePoll(api.signals, {
    intervalMs: settings.intervals.signalsMs,
    enabled: pollOn,
  });
  const kpi = usePoll(api.kpiCoverage, {
    intervalMs: settings.intervals.kpiMs,
    enabled: pollOn,
  });
  const plan = usePoll(api.updatePlan, {
    intervalMs: settings.intervals.planMs,
    enabled: pollOn,
  });

  const criticalCount =
    signals.data?.signals?.filter(
      (s: any) => s?.signal && s?.severity === "critical",
    ).length ?? 0;

  const totalSignals = signals.data?.signals?.length ?? 0;

  const missingKpiServices =
    kpi.data?.results?.filter((r: any) => (r.missing_kpis || []).length > 0)
      .length ?? 0;

  const totalRules = plan.data?.actions?.length ?? 0;

  const [hist, setHist] = useState<
    Array<{
      t: number;
      critical: number;
      total: number;
      missingSvc: number;
      actions: number;
    }>
  >([]);

  useEffect(() => {
    const hasAny =
      !!signals.data?.generated_at ||
      !!kpi.data?.generated_at ||
      !!plan.data?.generated_at ||
      !!health.data?.ts;
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
  }, [
    signals.data?.generated_at,
    kpi.data?.generated_at,
    plan.data?.generated_at,
  ]);

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
    // ✅ Border fix: removed "metric-agent" wrapper
    <div className="space-y-4">
      {/* Top grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Status" subtitle="Agent health">
          {health.error ? (
            <ErrorBox text={health.error} />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Agent
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-800 dark:text-gray-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
                  Running
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Health
                </div>
                <div className="text-xs text-gray-800 dark:text-gray-200">
                  {health.data?.ok ? "ok" : "—"}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Last
                </div>
                <div className="font-mono text-xs text-gray-800 dark:text-gray-200">
                  {formatTime(health.data?.ts)}
                </div>
              </div>

              {!settings.pollingEnabled ? (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Polling is OFF (Settings)
                </div>
              ) : null}
            </div>
          )}
        </Card>

        <Card title="Signals" subtitle="Latest anomalies">
          {signals.error ? (
            <ErrorBox text={signals.error} />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Critical
                </div>
                <div className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                  {criticalCount}
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total signals
                </div>
                <div className="text-xs text-gray-800 dark:text-gray-200">
                  {totalSignals}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Generated
                </div>
                <div className="font-mono text-xs text-gray-800 dark:text-gray-200">
                  {formatTime(signals.data?.generated_at)}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card title="KPI Coverage" subtitle="Coverage checker">
          {kpi.error ? (
            <ErrorBox text={kpi.error} />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Services missing KPIs
                </div>
                <div className="text-xs text-gray-800 dark:text-gray-200">
                  {missingKpiServices}
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Services checked
                </div>
                <div className="text-xs text-gray-800 dark:text-gray-200">
                  {kpi.data?.results?.length ?? 0}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Generated
                </div>
                <div className="font-mono text-xs text-gray-800 dark:text-gray-200">
                  {formatTime(kpi.data?.generated_at)}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card title="Update Plan" subtitle="Auto-telemetry actions">
          {plan.error ? (
            <ErrorBox text={plan.error} />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total actions
                </div>
                <div className="text-xs text-gray-800 dark:text-gray-200">
                  {totalRules}
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Generated
                </div>
                <div className="font-mono text-xs text-gray-800 dark:text-gray-200">
                  {formatTime(plan.data?.generated_at)}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  What it means
                </div>
                <div className="text-xs text-gray-800 dark:text-gray-200">
                  Routes → KPIs
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Bottom grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Trends" subtitle="Last samples (local history)">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Critical signals
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
                {seriesCritical.at(-1) ?? 0}
              </div>
              <div className="mt-2">
                <Sparkline values={seriesCritical} />
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Services missing KPIs
              </div>
              <div className="mt-1 font-mono text-sm font-bold text-gray-900 dark:text-gray-100">
                {seriesMissing.at(-1) ?? 0}
              </div>
              <div className="mt-2">
                <Sparkline values={seriesMissing} />
              </div>
            </div>
          </div>

          <Muted>These mini-trends update whenever API refreshes.</Muted>
        </Card>

        <Card title="Breakdown" subtitle="What needs attention right now">
          <div className="grid gap-4">
            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Signals by severity
              </div>
              <BarList items={sevBars} />
            </div>

            <div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Top services missing KPIs
              </div>
              {!topMissing.length ? (
                <Muted>Nothing missing ✅</Muted>
              ) : (
                <BarList items={topMissing} />
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
