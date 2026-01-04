import { useMemo, useState } from "react";
import "./index.css";
import { api } from "./lib/api";
import { usePoll } from "./hooks/usePoll";
import { Drawer } from "./components/Drawer";
import { downloadCsv, downloadJson, downloadText } from "./lib/download";

type NavKey = "overview" | "signals" | "kpi" | "plan" | "prom" | "settings";
type NavItem = { key: NavKey; label: string };

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
          <div className="pageTitle">
            {navItems.find((x) => x.key === active)?.label ?? "Dashboard"}
          </div>

          <div className="topbarRight">
            <div className="search">
              <span className="searchIcon">⌘</span>
              <input className="searchInput" placeholder="Search…" disabled />
            </div>
          </div>
        </header>

        <section className="content">
          {active === "overview" && <Overview />}
          {active === "signals" && <SignalsPage />}
          {active === "kpi" && <KpiPage />}
          {active === "plan" && <PlanPage />}
          {active === "prom" && <PromPage />}
          {active === "settings" && <SettingsPage />}
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
  right?: React.ReactNode;
  children: React.ReactNode;
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

function Muted({ children }: { children: React.ReactNode }) {
  return <div className="muted">{children}</div>;
}

function Badge({
  kind,
  children,
}: {
  kind: "neutral" | "ok" | "warn" | "crit";
  children: React.ReactNode;
}) {
  return <span className={cn("badge", `badge-${kind}`)}>{children}</span>;
}

function Toolbar({
  left,
  right,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
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
  children: React.ReactNode;
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
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      className="input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

/* ---------------- Pages ---------------- */

function Overview() {
  const health = usePoll(api.health, { intervalMs: 3000 });
  const signals = usePoll(api.signals, { intervalMs: 2500 });
  const kpi = usePoll(api.kpiCoverage, { intervalMs: 5000 });
  const plan = usePoll(api.updatePlan, { intervalMs: 7000 });

  const criticalCount =
    signals.data?.signals?.filter((s: any) => s?.signal && s?.severity === "critical").length ?? 0;

  const missingKpiServices =
    kpi.data?.results?.filter((r) => (r.missing_kpis || []).length > 0).length ?? 0;

  const totalRules = plan.data?.actions?.length ?? 0;

  return (
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
              <div className="kvVal">{signals.data?.signals?.length ?? 0}</div>
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
  );
}

function SignalsPage() {
  const [enabled, setEnabled] = useState(true);
  const [intervalMs, setIntervalMs] = useState("2000");

  const [q, setQ] = useState("");
  const [svc, setSvc] = useState("all");
  const [sev, setSev] = useState("all");
  const [sort, setSort] = useState("severity_desc");

  const pollMs = Math.max(500, Number(intervalMs) || 2000);
  const { data, error, loading } = usePoll(api.signals, { intervalMs: pollMs, enabled });

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
      <button className={cn("btn", enabled && "btnActive")} onClick={() => setEnabled((x) => !x)}>
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

        <Muted>Showing {Math.min(filtered.length, 200)} / {raw.length} signals</Muted>
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

function KpiPage() {
  const [enabled, setEnabled] = useState(true);
  const [q, setQ] = useState("");
  const [showOnlyMissing, setShowOnlyMissing] = useState(true);

  const { data, error, loading } = usePoll(api.kpiCoverage, { intervalMs: 5000, enabled });

  const rows = useMemo(() => {
    const all = data?.results ?? [];
    const qq = q.trim().toLowerCase();
    return all
      .filter((r) => (showOnlyMissing ? (r.missing_kpis ?? []).length > 0 : true))
      .filter((r) => {
        if (!qq) return true;
        const blob = `${r.service} ${(r.missing_kpis ?? []).join(" ")} ${r.url}`.toLowerCase();
        return blob.includes(qq);
      })
      .sort((a, b) => (b.missing_kpis?.length ?? 0) - (a.missing_kpis?.length ?? 0));
  }, [data?.generated_at, q, showOnlyMissing]);

  const [selected, setSelected] = useState<any | null>(null);

  return (
    <>
      <Card
        title="KPI Coverage"
        subtitle="Shows missing KPIs per service"
        right={
          <div className="row">
            <button className={cn("btn", enabled && "btnActive")} onClick={() => setEnabled((x) => !x)}>
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

        {error ? <ErrorBox text={error} /> : null}
        {loading && !data ? <Muted>Loading…</Muted> : null}

        <div className="table tableKpi">
          <div className="tHead tKpi">
            <div>Service</div>
            <div>Status</div>
            <div>Missing KPIs</div>
            <div>URL</div>
          </div>

          {rows.map((r, idx) => {
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

        <Muted>Services: {data?.results?.length ?? 0} | Showing: {rows.length}</Muted>
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

function PlanPage() {
  const [enabled, setEnabled] = useState(false);
  const [q, setQ] = useState("");
  const [svc, setSvc] = useState("all");
  const [intent, setIntent] = useState("all");

  const { data, error, loading } = usePoll(api.updatePlan, { intervalMs: 9000, enabled });

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
    return actions
      .filter((a: any) => (svc === "all" ? true : String(a.service) === svc))
      .filter((a: any) => (intent === "all" ? true : String(a.intent) === intent))
      .filter((a: any) => {
        if (!qq) return true;
        const kpis = Array.isArray(a.required_kpis) ? a.required_kpis.map((x: any) => x?.name).join(" ") : "";
        const blob = `${a.service} ${a.route} ${a.intent} ${kpis}`.toLowerCase();
        return blob.includes(qq);
      });
  }, [actions, q, svc, intent]);

  const [selected, setSelected] = useState<any | null>(null);

  return (
    <>
      <Card
        title="Update Plan"
        subtitle="Auto-telemetry actions (intent → required KPIs)"
        right={
          <div className="row">
            <button className={cn("btn", enabled && "btnActive")} onClick={() => setEnabled((x) => !x)}>
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

            {filtered.slice(0, 120).map((a: any, idx: number) => (
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

        {enabled ? <Muted>Showing {Math.min(filtered.length, 120)} / {filtered.length} matches</Muted> : null}
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

function PromPage() {
  const [enabled, setEnabled] = useState(false);
  const { data, error, loading } = usePoll(api.promSuggestions, { intervalMs: 12000, enabled });

  return (
    <Card
      title="Prom Suggestions"
      subtitle="Prometheus-style naming + labels (derived suggestions)"
      right={
        <div className="row">
          <button className={cn("btn", enabled && "btnActive")} onClick={() => setEnabled((x) => !x)}>
            {enabled ? "Live" : "Load"}
          </button>
          <button className="btn" onClick={() => downloadText(`prom_suggestions_${Date.now()}.txt`, data ?? "")}>
            Export TXT
          </button>
        </div>
      }
    >
      {error ? <ErrorBox text={error} /> : null}
      {loading && !data && enabled ? <Muted>Loading…</Muted> : null}
      {!enabled ? <Muted>Click “Load” to fetch the file.</Muted> : null}
      {enabled ? <pre className="code">{data ?? ""}</pre> : null}
    </Card>
  );
}

function SettingsPage() {
  return (
    <Card title="Settings" subtitle="Quick actions coming next">
      <div className="empty">
        <div className="emptyTitle">Next</div>
        <div className="emptySub">
          If you want, we’ll add real “Run steps” buttons (start scripts from UI) using a tiny node API endpoint.
        </div>
      </div>
    </Card>
  );
}
