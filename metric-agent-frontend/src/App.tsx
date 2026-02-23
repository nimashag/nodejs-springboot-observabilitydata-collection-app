import { useEffect, useMemo, useState, type ReactNode } from "react";
import "./index.css";
import { api } from "./lib/api";
import { usePoll } from "./hooks/usePoll";
import { Drawer } from "./components/Drawer";
import { downloadCsv, downloadJson, downloadText } from "./lib/download";
import { parsePromSuggestions } from "./lib/parsePromSuggestions";
import Overview from "./pages/Overview";
import Signals from "./pages/Signals";
import KpiCoverage from "./pages/KpiCoverage";
import UpdatePlan from "./pages/UpdatePlan";
import PromSuggestions from "./pages/PromSuggestions";
import Settings from "./pages/Settings";

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
          {active === "signals" && <Signals settings={settings} />}
          {active === "kpi" && <KpiCoverage settings={settings} />}
          {active === "plan" && <UpdatePlan settings={settings} />}
          {active === "prom" && <PromSuggestions settings={settings} />}
          {active === "settings" && (
            <Settings
              settings={settings}
              onChange={setSettings}
              onJump={onJump}
              onResetDefaults={() => setSettings(loadSettings())}
            />
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

function Toolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="toolbar">
      <div className="toolbarLeft">{left}</div>
      <div className="toolbarRight">{right}</div>
    </div>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: ReactNode }) {
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
    <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type={type} />
  );
}

/* ---------------- Pages ---------------- */

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
      <button className="btn" onClick={() => downloadJson(`signals_${Date.now()}.json`, data ?? { generated_at: Date.now(), signals: [] })}>
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

              <div className="mono">{typeof s.confidence === "number" ? `${(s.confidence * 100).toFixed(0)}%` : "—"}</div>

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

/* ---- The rest of your original pages remain unchanged below ---- */
/* KpiPage, PlanPage, PromPage, SettingsPage ... keep as-is (no changes needed for Overview-only refactor). */