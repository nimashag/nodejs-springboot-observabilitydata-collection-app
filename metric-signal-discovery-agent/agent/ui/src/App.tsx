import { useEffect, useMemo, useState, type ReactNode } from "react";
import "./index.css";
import { api } from "./lib/api";
import { usePoll } from "./hooks/usePoll";
import { Drawer } from "./components/Drawer";
import { downloadCsv, downloadJson, downloadText } from "./lib/download";
import { parsePromSuggestions } from "./lib/parsePromSuggestions";

type NavKey = "overview" | "signals" | "kpi" | "plan" | "prom" | "settings";
type NavItem = { key: NavKey; label: string };

/* ---------------- Settings Model ---------------- */

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

const SETTINGS_KEY = "metric_agent_ui_settings_v1";

function clampMs(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

function loadSettings(): AppSettings {
  const defaults: AppSettings = {
    pollingEnabled: true,
    intervals: {
      healthMs: 3000,
      signalsMs: 2500,
      kpiMs: 5000,
      planMs: 9000,
      promMs: 12000,
    },
    ui: {
      defaultPromView: "raw",
    },
  };

  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);

    const merged: AppSettings = {
      pollingEnabled: typeof parsed?.pollingEnabled === "boolean" ? parsed.pollingEnabled : defaults.pollingEnabled,
      intervals: {
        healthMs: clampMs(Number(parsed?.intervals?.healthMs ?? defaults.intervals.healthMs), 500, 60000),
        signalsMs: clampMs(Number(parsed?.intervals?.signalsMs ?? defaults.intervals.signalsMs), 500, 60000),
        kpiMs: clampMs(Number(parsed?.intervals?.kpiMs ?? defaults.intervals.kpiMs), 500, 60000),
        planMs: clampMs(Number(parsed?.intervals?.planMs ?? defaults.intervals.planMs), 500, 60000),
        promMs: clampMs(Number(parsed?.intervals?.promMs ?? defaults.intervals.promMs), 500, 60000),
      },
      ui: {
        defaultPromView:
          parsed?.ui?.defaultPromView === "structured" || parsed?.ui?.defaultPromView === "raw"
            ? parsed.ui.defaultPromView
            : defaults.ui.defaultPromView,
      },
    };

    return merged;
  } catch {
    return defaults;
  }
}

function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

/* ---------------- Utils ---------------- */

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function formatTime(ts?: number) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return "—";
  }
}

function severityRank(s?: string) {
  if (s === "critical") return 3;
  if (s === "warning") return 2;
  if (s === "info") return 1;
  return 0;
}

/* ---------------- App ---------------- */

export default function App() {
  const navItems: NavItem[] = useMemo(
    () => [
      { key: "overview", label: "Overview" },
      { key: "signals", label: "Signals" },
      { key: "kpi", label: "KPI Coverage" },
      { key: "plan", label: "Update Plan" },
      { key: "prom", label: "Prom Suggestions" },
      { key: "settings", label: "Settings" },
    ],
    []
  );

  const [active, setActive] = useState<NavKey>("overview");

  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  const onJump = (k: NavKey) => setActive(k);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark" />
          <div className="brandText">
            <div className="brandName">Metric Agent</div>
            <div className="brandSub">Telemetry intelligence</div>
          </div>
        </div>

        <div className="sidebarSection">
          <div className="sidebarLabel">Dashboard</div>
          <nav className="nav">
            {navItems.map((item) => (
              <button
                key={item.key}
                className={cn("navItem", active === item.key && "navItemActive")}
                onClick={() => setActive(item.key)}
              >
                <span className="navDot" />
                <span className="navText">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="sidebarFooter">
          <div className="pill">
            <span className="pillDot" />
            <span className="pillText">API via /api (proxy)</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="pageTitle">{navItems.find((x) => x.key === active)?.label ?? "Dashboard"}</div>

          <div className="topbarRight">
            <div className="search">
              <span className="searchIcon">⌘</span>
              <input className="searchInput" placeholder="Search…" disabled />
            </div>
          </div>
        </header>

        <section className="content">
          {active === "overview" && <Overview settings={settings} />}
          {active === "signals" && <SignalsPage settings={settings} />}
          {active === "kpi" && <KpiPage settings={settings} />}
          {active === "plan" && <PlanPage settings={settings} />}
          {active === "prom" && <PromPage settings={settings} />}
          {active === "settings" && (
            <SettingsPage settings={settings} onChange={setSettings} onJump={onJump} />
          )}
        </section>
      </main>
    </div>
  );
}

/* ---------------- Common UI ---------------- */

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

function Badge({
  kind,
  children,
}: {
  kind: "neutral" | "ok" | "warn" | "crit";
  children: ReactNode;
}) {
  return <span className={cn("badge", `badge-${kind}`)}>{children}</span>;
}

function Toolbar({
  left,
  right,
}: {
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="toolbar">
      <div className="toolbarLeft">{left}</div>
      <div className="toolbarRight">{right}</div>
    </div>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      {children}
    </select>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
    />
  );
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

/* ---------------- Pages ---------------- */

function Overview({ settings }: { settings: AppSettings }) {
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
              {!settings.pollingEnabled ? (
                <div className="muted">Polling is OFF (Settings)</div>
              ) : null}
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

function SignalsPage({ settings }: { settings: AppSettings }) {
  const [enabled, setEnabled] = useState(true);
  const [intervalMs, setIntervalMs] = useState(String(settings.intervals.signalsMs));

  const [q, setQ] = useState("");
  const [svc, setSvc] = useState("all");
  const [sev, setSev] = useState("all");
  const [sort, setSort] = useState("severity_desc");

  const pollMs = Math.max(500, Number(intervalMs) || settings.intervals.signalsMs);
  const { data, error, loading } = usePoll(api.signals, {
    intervalMs: pollMs,
    enabled: settings.pollingEnabled && enabled,
  });

  const raw = (data?.signals ?? []).filter((x: any) => x && (x.signal || x.error));

  const services = useMemo(() => {
    const set = new Set<string>();
    for (const s of raw as any[]) if (s?.service) set.add(String(s.service));
    return ["all", ...Array.from(set).sort()];
  }, [data?.generated_at]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return raw
      .filter((s: any) => (svc === "all" ? true : String(s.service) === svc))
      .filter((s: any) => (sev === "all" ? true : String(s.severity) === sev))
      .filter((s: any) => {
        if (!qq) return true;
        const blob = `${s.service} ${s.signal ?? ""} ${s.metric ?? ""} ${s.error ?? ""}`.toLowerCase();
        return blob.includes(qq);
      })
      .sort((a: any, b: any) => {
        if (sort === "severity_desc") return severityRank(b.severity) - severityRank(a.severity);
        if (sort === "confidence_desc") return (b.confidence ?? 0) - (a.confidence ?? 0);
        if (sort === "time_desc") return (b.timestamp ?? 0) - (a.timestamp ?? 0);
        if (sort === "service_asc") return String(a.service).localeCompare(String(b.service));
        return 0;
      });
  }, [raw, q, svc, sev, sort]);

  const [selected, setSelected] = useState<any | null>(null);

  const headRight = (
    <div className="row">
      <button className={cn("btn", enabled && settings.pollingEnabled && "btnActive")} onClick={() => setEnabled((x) => !x)}>
        {enabled ? "Live" : "Paused"}
      </button>
      <Select value={intervalMs} onChange={setIntervalMs}>
        <option value="1000">1s</option>
        <option value="2000">2s</option>
        <option value="4000">4s</option>
        <option value="8000">8s</option>
      </Select>
      <button
        className="btn"
        onClick={() => downloadJson(`signals_${Date.now()}.json`, data ?? { generated_at: Date.now(), signals: [] })}
      >
        Export JSON
      </button>
      <button
        className="btn"
        onClick={() =>
          downloadCsv(
            `signals_${Date.now()}.csv`,
            (raw as any[]).map((s) => ({
              service: s.service,
              signal: s.signal ?? "error",
              severity: s.severity ?? "",
              confidence: s.confidence ?? "",
              metric: s.metric ?? "",
              current: s.current ?? "",
              baseline_mean: s.baseline_mean ?? "",
              z_score: s.z_score ?? "",
              timestamp: s.timestamp ?? "",
              error: s.error ?? "",
            }))
          )
        }
      >
        Export CSV
      </button>
    </div>
  );

  return (
    <>
      <Card title="Signals" subtitle="Anomalies detected by signal-detector" right={headRight}>
        <Toolbar
          left={
            <div className="row">
              <TextInput value={q} onChange={setQ} placeholder="Filter… (service/signal/metric)" />
              <Select value={svc} onChange={setSvc}>
                {services.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Select value={sev} onChange={setSev}>
                <option value="all">all severities</option>
                <option value="critical">critical</option>
                <option value="warning">warning</option>
                <option value="info">info</option>
              </Select>
              <Select value={sort} onChange={setSort}>
                <option value="severity_desc">sort: severity</option>
                <option value="confidence_desc">sort: confidence</option>
                <option value="time_desc">sort: newest</option>
                <option value="service_asc">sort: service</option>
              </Select>
            </div>
          }
          right={<div className="meta">Generated: {formatTime(data?.generated_at)}</div>}
        />

        {!settings.pollingEnabled ? <Muted>Global polling is OFF (Settings).</Muted> : null}
        {error ? <ErrorBox text={error} /> : null}
        {loading && !data ? <Muted>Loading…</Muted> : null}

        <div className="table tableSignals">
          <div className="tHead tSignals">
            <div>Service</div>
            <div>Type</div>
            <div>Severity</div>
            <div>Confidence</div>
            <div>Metric</div>
            <div>When</div>
          </div>

          {filtered.slice(0, 200).map((s: any, idx: number) => (
            <div className="tRow tSignals" key={idx} onClick={() => setSelected(s)}>
              <div className="mono">{s.service}</div>
              <div className="mono">{s.signal ?? "error"}</div>

              <div>
                {s.severity === "critical" ? (
                  <Badge kind="crit">critical</Badge>
                ) : s.severity === "warning" ? (
                  <Badge kind="warn">warning</Badge>
                ) : (
                  <Badge kind="neutral">{s.severity ?? "—"}</Badge>
                )}
              </div>

              <div className="mono">
                {typeof s.confidence === "number" ? `${(s.confidence * 100).toFixed(0)}%` : "—"}
              </div>

              <div className="mono">{s.metric ?? s.error ?? "—"}</div>
              <div className="mono">{formatTime(s.timestamp)}</div>
            </div>
          ))}

          {!filtered.length ? <Muted>No matching signals ✅</Muted> : null}
        </div>

        <Muted>
          Showing {Math.min(filtered.length, 200)} / {raw.length} signals
        </Muted>
      </Card>

      <Drawer
        open={!!selected}
        title={`${selected?.service ?? "signal"} — ${selected?.signal ?? "error"}`}
        subtitle={`Severity: ${selected?.severity ?? "—"} • Confidence: ${selected?.confidence ?? "—"}`}
        onClose={() => setSelected(null)}
      >
        <div className="kv">
          <div className="kvRow">
            <div className="kvKey">Metric</div>
            <div className="kvVal mono">{selected?.metric ?? "—"}</div>
          </div>
          <div className="kvRow">
            <div className="kvKey">Current</div>
            <div className="kvVal mono">{selected?.current ?? selected?.current_delta ?? "—"}</div>
          </div>
          <div className="kvRow">
            <div className="kvKey">Baseline mean</div>
            <div className="kvVal mono">{selected?.baseline_mean ?? "—"}</div>
          </div>
          <div className="kvRow">
            <div className="kvKey">Z-score</div>
            <div className="kvVal mono">{selected?.z_score ?? "—"}</div>
          </div>
          <div className="kvRow">
            <div className="kvKey">Timestamp</div>
            <div className="kvVal mono">{formatTime(selected?.timestamp)}</div>
          </div>
        </div>

        {Array.isArray(selected?.top_slow_routes) && selected.top_slow_routes.length ? (
          <div>
            <div className="cardTitle" style={{ marginBottom: 8 }}>
              Top slow routes
            </div>
            <pre className="code">{JSON.stringify(selected.top_slow_routes, null, 2)}</pre>
          </div>
        ) : null}

        {Array.isArray(selected?.top_error_routes) && selected.top_error_routes.length ? (
          <div>
            <div className="cardTitle" style={{ marginBottom: 8 }}>
              Top error routes
            </div>
            <pre className="code">{JSON.stringify(selected.top_error_routes, null, 2)}</pre>
          </div>
        ) : null}

        {selected?.error ? (
          <div>
            <div className="cardTitle" style={{ marginBottom: 8 }}>
              Error
            </div>
            <pre className="code">{String(selected.error)}</pre>
          </div>
        ) : null}

        <button className="btn" onClick={() => downloadJson(`signal_${Date.now()}.json`, selected)}>
          Download this signal
        </button>
      </Drawer>
    </>
  );
}

function KpiPage({ settings }: { settings: AppSettings }) {
  const [enabled, setEnabled] = useState(true);
  const [q, setQ] = useState("");
  const [showOnlyMissing, setShowOnlyMissing] = useState(true);

  const { data, error, loading } = usePoll(api.kpiCoverage, {
    intervalMs: settings.intervals.kpiMs,
    enabled: settings.pollingEnabled && enabled,
  });

  const rows = useMemo(() => {
    const all = data?.results ?? [];
    const qq = q.trim().toLowerCase();
    return all
      .filter((r: any) => (showOnlyMissing ? (r.missing_kpis ?? []).length > 0 : true))
      .filter((r: any) => {
        if (!qq) return true;
        const blob = `${r.service} ${(r.missing_kpis ?? []).join(" ")} ${r.url}`.toLowerCase();
        return blob.includes(qq);
      })
      .sort((a: any, b: any) => (b.missing_kpis?.length ?? 0) - (a.missing_kpis?.length ?? 0));
  }, [data?.generated_at, q, showOnlyMissing]);

  const [selected, setSelected] = useState<any | null>(null);

  return (
    <>
      <Card
        title="KPI Coverage"
        subtitle="Shows missing KPIs per service"
        right={
          <div className="row">
            <button className={cn("btn", enabled && settings.pollingEnabled && "btnActive")} onClick={() => setEnabled((x) => !x)}>
              {enabled ? "Live" : "Paused"}
            </button>
            <button className="btn" onClick={() => downloadJson(`kpi_coverage_${Date.now()}.json`, data ?? {})}>
              Export JSON
            </button>
            <button className="btn" onClick={() => downloadCsv(`kpi_coverage_${Date.now()}.csv`, data?.results ?? [])}>
              Export CSV
            </button>
          </div>
        }
      >
        <Toolbar
          left={
            <div className="row">
              <TextInput value={q} onChange={setQ} placeholder="Filter… (service/kpi/url)" />
              <button className={cn("btn", showOnlyMissing && "btnActive")} onClick={() => setShowOnlyMissing((x) => !x)}>
                {showOnlyMissing ? "Only missing" : "Show all"}
              </button>
            </div>
          }
          right={<div className="meta">Generated: {formatTime(data?.generated_at)}</div>}
        />

        {!settings.pollingEnabled ? <Muted>Global polling is OFF (Settings).</Muted> : null}
        {error ? <ErrorBox text={error} /> : null}
        {loading && !data ? <Muted>Loading…</Muted> : null}

        <div className="table tableKpi">
          <div className="tHead tKpi">
            <div>Service</div>
            <div>Status</div>
            <div>Missing KPIs</div>
            <div>URL</div>
          </div>

          {rows.map((r: any, idx: number) => {
            const missing = r.missing_kpis ?? [];
            const ok = missing.length === 0;
            return (
              <div className="tRow tKpi" key={idx} onClick={() => setSelected(r)}>
                <div className="mono">{r.service}</div>
                <div>{ok ? <Badge kind="ok">complete</Badge> : <Badge kind="warn">{missing.length} missing</Badge>}</div>
                <div className="mono">{ok ? "—" : missing.join(", ")}</div>
                <div className="mono">{r.url}</div>
              </div>
            );
          })}
        </div>

        <Muted>
          Services: {data?.results?.length ?? 0} | Showing: {rows.length}
        </Muted>
      </Card>

      <Drawer
        open={!!selected}
        title={`${selected?.service ?? "service"} — KPI Coverage`}
        subtitle={`Missing KPIs: ${(selected?.missing_kpis ?? []).length}`}
        onClose={() => setSelected(null)}
      >
        <pre className="code">{JSON.stringify(selected, null, 2)}</pre>
        <button className="btn" onClick={() => downloadJson(`kpi_${selected?.service ?? "service"}_${Date.now()}.json`, selected)}>
          Download this service report
        </button>
      </Drawer>
    </>
  );
}

function PlanPage({ settings }: { settings: AppSettings }) {
  const [enabled, setEnabled] = useState(false);
  const [q, setQ] = useState("");
  const [svc, setSvc] = useState("all");
  const [intent, setIntent] = useState("all");

  const { data, error, loading } = usePoll(api.updatePlan, {
    intervalMs: settings.intervals.planMs,
    enabled: settings.pollingEnabled && enabled,
  });

  const actions = data?.actions ?? [];

  const services = useMemo(() => {
    const set = new Set<string>();
    for (const a of actions as any[]) if (a?.service) set.add(String(a.service));
    return ["all", ...Array.from(set).sort()];
  }, [data?.generated_at]);

  const intents = useMemo(() => {
    const set = new Set<string>();
    for (const a of actions as any[]) if (a?.intent) set.add(String(a.intent));
    return ["all", ...Array.from(set).sort()];
  }, [data?.generated_at]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return (actions as any[])
      .filter((a) => (svc === "all" ? true : String(a.service) === svc))
      .filter((a) => (intent === "all" ? true : String(a.intent) === intent))
      .filter((a) => {
        if (!qq) return true;
        const kpis = Array.isArray(a.required_kpis) ? a.required_kpis.map((x: any) => x?.name).join(" ") : "";
        const blob = `${a.service} ${a.route} ${a.intent} ${kpis}`.toLowerCase();
        return blob.includes(qq);
      });
  }, [actions, q, svc, intent]);

  const [selected, setSelected] = useState<any | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("50");

  useEffect(() => {
    setPage(1);
  }, [q, svc, intent, data?.generated_at]);

  const size = Math.max(10, Math.min(200, Number(pageSize) || 50));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const pageRows = filtered.slice((safePage - 1) * size, safePage * size);

  return (
    <>
      <Card
        title="Update Plan"
        subtitle="Auto-telemetry actions (intent → required KPIs)"
        right={
          <div className="row">
            <button className={cn("btn", enabled && settings.pollingEnabled && "btnActive")} onClick={() => setEnabled((x) => !x)}>
              {enabled ? "Live" : "Load"}
            </button>
            <button className="btn" onClick={() => downloadJson(`telemetry_update_plan_${Date.now()}.json`, data ?? {})}>
              Export JSON
            </button>
            <button
              className="btn"
              onClick={() =>
                downloadCsv(
                  `telemetry_update_plan_${Date.now()}.csv`,
                  (actions as any[]).map((a) => ({
                    action: a.action,
                    service: a.service,
                    route: a.route,
                    intent: a.intent,
                    confidence: a.confidence,
                    required_kpis: Array.isArray(a.required_kpis)
                      ? a.required_kpis.map((x: any) => x?.name).filter(Boolean).join("|")
                      : "",
                  }))
                )
              }
            >
              Export CSV
            </button>
          </div>
        }
      >
        <Toolbar
          left={
            <div className="row">
              <TextInput value={q} onChange={setQ} placeholder="Filter… (route/intent/kpi)" />
              <Select value={svc} onChange={setSvc}>
                {services.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <Select value={intent} onChange={setIntent}>
                {intents.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
          }
          right={<div className="meta">Actions: {actions.length}</div>}
        />

        {!settings.pollingEnabled ? <Muted>Global polling is OFF (Settings).</Muted> : null}
        {error ? <ErrorBox text={error} /> : null}
        {loading && !data && enabled ? <Muted>Loading…</Muted> : null}
        {!enabled ? <Muted>Paused by default (plan is large). Click “Load”.</Muted> : null}

        {enabled ? (
          <div className="table tablePlan">
            <div className="tHead tPlan">
              <div>Service</div>
              <div>Route</div>
              <div>Intent</div>
              <div>KPIs</div>
              <div>Conf</div>
            </div>

            {pageRows.map((a: any, idx: number) => (
              <div className="tRow tPlan" key={idx} onClick={() => setSelected(a)}>
                <div className="mono">{a.service ?? "—"}</div>
                <div className="mono">{a.route ?? "—"}</div>
                <div className="mono">{a.intent ?? "—"}</div>
                <div className="mono">
                  {Array.isArray(a.required_kpis)
                    ? a.required_kpis.map((x: any) => x?.name).filter(Boolean).join(", ")
                    : "—"}
                </div>
                <div className="mono">{a.confidence ?? "—"}</div>
              </div>
            ))}
          </div>
        ) : null}

        {enabled ? (
          <Toolbar
            left={
              <div className="row">
                <button className="btn" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  ← Prev
                </button>
                <button
                  className="btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </button>
                <div className="meta mono">
                  Page {safePage} / {totalPages} • Total {total}
                </div>
              </div>
            }
            right={
              <div className="row">
                <div className="meta">Rows per page</div>
                <Select value={pageSize} onChange={setPageSize}>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="150">150</option>
                </Select>
              </div>
            }
          />
        ) : null}
      </Card>

      <Drawer
        open={!!selected}
        title={`${selected?.service ?? "service"} — ${selected?.route ?? "route"}`}
        subtitle={`Intent: ${selected?.intent ?? "—"} • Conf: ${selected?.confidence ?? "—"}`}
        onClose={() => setSelected(null)}
      >
        <pre className="code">{JSON.stringify(selected, null, 2)}</pre>
        <button className="btn" onClick={() => downloadJson(`plan_action_${Date.now()}.json`, selected)}>
          Download this action
        </button>
      </Drawer>
    </>
  );
}

function PromPage({ settings }: { settings: AppSettings }) {
  const [enabled, setEnabled] = useState(false);

  const { data, error, loading } = usePoll(api.promSuggestions, {
    intervalMs: settings.intervals.promMs,
    enabled: settings.pollingEnabled && enabled,
  });

  const [promView, setPromView] = useState<"raw" | "structured">(settings.ui.defaultPromView);
  const [promSearch, setPromSearch] = useState("");

  useEffect(() => {
    setPromView(settings.ui.defaultPromView);
  }, [settings.ui.defaultPromView]);

  const promText = String(data ?? "");
  const promBlocks = useMemo(() => parsePromSuggestions(promText), [promText]);

  const promFiltered = useMemo(() => {
    const q = promSearch.trim().toLowerCase();
    if (!q) return promBlocks;

    return promBlocks.filter((b) => {
      const hay =
        `${b.service} ${b.method ?? ""} ${b.path ?? ""} ${b.intent ?? ""} ${b.conf ?? ""} ` +
        b.lines.map((l) => l.text).join(" ");
      return hay.toLowerCase().includes(q);
    });
  }, [promBlocks, promSearch]);

  return (
    <Card
      title="Prom Suggestions"
      subtitle="Prometheus-style naming + labels (derived suggestions)"
      right={
        <div className="row">
          <button className={cn("btn", enabled && settings.pollingEnabled && "btnActive")} onClick={() => setEnabled((x) => !x)}>
            {enabled ? "Live" : "Load"}
          </button>

          <button className={cn("btn", promView === "raw" && "btnActive")} onClick={() => setPromView("raw")}>
            Raw
          </button>
          <button className={cn("btn", promView === "structured" && "btnActive")} onClick={() => setPromView("structured")}>
            Structured
          </button>

          <button className="btn" onClick={() => downloadText(`prom_suggestions_${Date.now()}.txt`, promText)}>
            Export TXT
          </button>
        </div>
      }
    >
      {!settings.pollingEnabled ? <Muted>Global polling is OFF (Settings).</Muted> : null}
      {error ? <ErrorBox text={error} /> : null}
      {loading && !data && enabled ? <Muted>Loading…</Muted> : null}
      {!enabled ? <Muted>Click “Load” to fetch the file.</Muted> : null}

      {enabled ? (
        <>
          <Toolbar
            left={
              <div className="row">
                <TextInput value={promSearch} onChange={setPromSearch} placeholder="Search… (service/method/path/intent/metric text)" />
              </div>
            }
            right={
              <div className="meta">
                {promView === "structured"
                  ? `Blocks: ${promFiltered.length} / ${promBlocks.length}`
                  : `Lines: ${promText.split(/\r?\n/).filter(Boolean).length}`}
              </div>
            }
          />

          {promView === "raw" ? (
            <pre className="code">{promText}</pre>
          ) : (
            <div>
              {!promFiltered.length ? <Muted>No matches ✅</Muted> : null}

              {promFiltered.map((b, idx) => (
                <div key={`${b.service}-${b.routeLine}-${idx}`} className="card" style={{ marginBottom: 12 }}>
                  <div className="cardHeader">
                    <div>
                      <div className="cardTitle">
                        <span className="mono">{b.service}</span>{" "}
                        <span className="muted">
                          {b.method ? `${b.method} ` : ""}
                          {b.path ?? ""}
                        </span>
                      </div>
                      <div className="cardSub mono">
                        intent: {b.intent ?? "—"} • conf: {b.conf ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="cardBody">
                    <div className="mono" style={{ marginBottom: 8 }}>
                      {b.routeLine}
                    </div>

                    <pre className="code" style={{ margin: 0 }}>
                      {b.lines.map((l) => l.text).join("\n")}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </Card>
  );
}

/* ---------------- Settings Page (Best) ---------------- */

type DiagRow = {
  key: string;
  label: string;
  ok?: boolean;
  ms?: number;
  at?: number;
  error?: string;
};

function SettingsPage({
  settings,
  onChange,
  onJump,
}: {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onJump: (k: NavKey) => void;
}) {
  const [diag, setDiag] = useState<DiagRow[]>([]);
  const [diagRunning, setDiagRunning] = useState(false);

  const setPollingEnabled = (v: boolean) => onChange({ ...settings, pollingEnabled: v });

  const setInterval = (key: keyof AppSettings["intervals"], v: string) => {
    const n = clampMs(Number(v), 500, 60000);
    onChange({ ...settings, intervals: { ...settings.intervals, [key]: n } });
  };

  async function runDiagnostics() {
    setDiagRunning(true);

    const tests: Array<{ key: string; label: string; fn: () => Promise<any> }> = [
      { key: "health", label: "Health", fn: () => api.health() },
      { key: "signals", label: "Signals", fn: () => api.signals() },
      { key: "kpi", label: "KPI Coverage", fn: () => api.kpiCoverage() },
      { key: "plan", label: "Update Plan", fn: () => api.updatePlan() },
      { key: "prom", label: "Prom Suggestions", fn: () => api.promSuggestions() },
    ];

    const out: DiagRow[] = [];

    for (const t of tests) {
      const t0 = performance.now();
      try {
        await t.fn();
        const ms = Math.round(performance.now() - t0);
        out.push({ key: t.key, label: t.label, ok: true, ms, at: Date.now() });
      } catch (e: any) {
        const ms = Math.round(performance.now() - t0);
        out.push({
          key: t.key,
          label: t.label,
          ok: false,
          ms,
          at: Date.now(),
          error: String(e?.message ?? e ?? "error"),
        });
      }
    }

    setDiag(out);
    setDiagRunning(false);
  }

  async function exportEverything() {
    const [signalsRes, kpiRes, planRes, promRes] = await Promise.allSettled([
      api.signals(),
      api.kpiCoverage(),
      api.updatePlan(),
      api.promSuggestions(),
    ]);

    const signals = signalsRes.status === "fulfilled" ? signalsRes.value : { generated_at: Date.now(), signals: [] };
    const kpi = kpiRes.status === "fulfilled" ? kpiRes.value : {};
    const plan = planRes.status === "fulfilled" ? planRes.value : {};
    const prom = promRes.status === "fulfilled" ? String(promRes.value ?? "") : "";

    downloadJson(`signals_${Date.now()}.json`, signals);
    downloadJson(`kpi_coverage_${Date.now()}.json`, kpi);
    downloadJson(`update_plan_${Date.now()}.json`, plan);
    downloadText(`prom_suggestions_${Date.now()}.txt`, prom);
  }

  async function copyDebug() {
    const payload = {
      ts: Date.now(),
      settings,
      diagnostics: diag,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      alert("Copied debug info ✅");
    } catch {
      alert("Copy failed (browser blocked clipboard).");
    }
  }

  const intervals = settings.intervals;

  return (
    <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 12 }}>
      <Card
        title="Global Controls"
        subtitle="Master switches for the whole UI"
        right={
          <div className="row">
            <button
              className={cn("btn", settings.pollingEnabled && "btnActive")}
              onClick={() => setPollingEnabled(!settings.pollingEnabled)}
            >
              {settings.pollingEnabled ? "Polling ON" : "Polling OFF"}
            </button>
            <button className="btn" onClick={() => onJump("signals")}>
              Go Signals →
            </button>
            <button className="btn" onClick={() => onJump("prom")}>
              Go Prom →
            </button>
          </div>
        }
      >
        <Muted>If you’re debugging backend, turn polling OFF so the UI stops firing requests.</Muted>
      </Card>

      <Card title="Intervals" subtitle="Default polling intervals (ms)">
        <div className="kv">
          <div className="kvRow">
            <div className="kvKey">Health</div>
            <div className="kvVal">
              <TextInput value={String(intervals.healthMs)} onChange={(v) => setInterval("healthMs", v)} type="number" />
            </div>
          </div>

          <div className="kvRow">
            <div className="kvKey">Signals</div>
            <div className="kvVal">
              <TextInput value={String(intervals.signalsMs)} onChange={(v) => setInterval("signalsMs", v)} type="number" />
            </div>
          </div>

          <div className="kvRow">
            <div className="kvKey">KPI Coverage</div>
            <div className="kvVal">
              <TextInput value={String(intervals.kpiMs)} onChange={(v) => setInterval("kpiMs", v)} type="number" />
            </div>
          </div>

          <div className="kvRow">
            <div className="kvKey">Update Plan</div>
            <div className="kvVal">
              <TextInput value={String(intervals.planMs)} onChange={(v) => setInterval("planMs", v)} type="number" />
            </div>
          </div>

          <div className="kvRow">
            <div className="kvKey">Prom Suggestions</div>
            <div className="kvVal">
              <TextInput value={String(intervals.promMs)} onChange={(v) => setInterval("promMs", v)} type="number" />
            </div>
          </div>
        </div>

        <Muted>Limits: min 500ms, max 60,000ms.</Muted>
      </Card>

      <Card
        title="UI Preferences"
        subtitle="Saved in localStorage"
        right={
          <div className="row">
            <button className="btn" onClick={() => onChange(loadSettings())}>
              Reset defaults
            </button>
          </div>
        }
      >
        <Toolbar
          left={
            <div className="row">
              <div className="meta">Default Prom view:</div>
              <button
                className={cn("btn", settings.ui.defaultPromView === "raw" && "btnActive")}
                onClick={() => onChange({ ...settings, ui: { ...settings.ui, defaultPromView: "raw" } })}
              >
                Raw
              </button>
              <button
                className={cn("btn", settings.ui.defaultPromView === "structured" && "btnActive")}
                onClick={() => onChange({ ...settings, ui: { ...settings.ui, defaultPromView: "structured" } })}
              >
                Structured
              </button>
            </div>
          }
        />
      </Card>

      <Card
        title="Diagnostics"
        subtitle="Ping endpoints and see if backend is alive"
        right={
          <div className="row">
            <button className={cn("btn", diagRunning && "btnActive")} onClick={runDiagnostics} disabled={diagRunning}>
              {diagRunning ? "Running…" : "Run diagnostics"}
            </button>
            <button className="btn" onClick={copyDebug} disabled={!diag.length}>
              Copy debug info
            </button>
          </div>
        }
      >
        {!diag.length ? (
          <Muted>Click “Run diagnostics” to test all endpoints.</Muted>
        ) : (
          <div className="table" style={{ marginTop: 8 }}>
            <div className="tHead" style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
              <div>Endpoint</div>
              <div>Status</div>
              <div>Latency</div>
              <div>Checked</div>
            </div>

            {diag.map((d) => (
              <div className="tRow" key={d.key} style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}>
                <div className="mono">{d.label}</div>
                <div>{d.ok ? <Badge kind="ok">ok</Badge> : <Badge kind="crit">fail</Badge>}</div>
                <div className="mono">{typeof d.ms === "number" ? `${d.ms}ms` : "—"}</div>
                <div className="mono">{formatTime(d.at)}</div>
              </div>
            ))}

            {diag.some((d) => d.error) ? (
              <div style={{ marginTop: 10 }}>
                <div className="cardTitle" style={{ marginBottom: 6 }}>
                  Errors
                </div>
                <pre className="code" style={{ margin: 0 }}>
                  {diag
                    .filter((d) => d.error)
                    .map((d) => `${d.label}: ${d.error}`)
                    .join("\n")}
                </pre>
              </div>
            ) : null}
          </div>
        )}
      </Card>

      <Card
        title="Exports"
        subtitle="One-click export bundle"
        right={
          <div className="row">
            <button className="btn" onClick={exportEverything}>
              Export everything
            </button>
          </div>
        }
      >
        <Muted>This pulls fresh data once (best effort) and downloads 4 files: signals, kpi coverage, update plan, prom txt.</Muted>
      </Card>
    </div>
  );
}
