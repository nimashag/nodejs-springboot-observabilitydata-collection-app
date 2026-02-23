import { useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { downloadJson, downloadText } from "../lib/download";

type NavKey = "overview" | "signals" | "kpi" | "plan" | "prom" | "settings";

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

type DiagRow = {
  key: string;
  label: string;
  ok?: boolean;
  ms?: number;
  at?: number;
  error?: string;
};

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

function clampMs(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.floor(n)));
}

/* ---------------- Local UI ---------------- */

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

/* ---------------- Settings Page ---------------- */

export default function SettingsPage({
  settings,
  onChange,
  onJump,
  onResetDefaults,
}: {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onJump: (k: NavKey) => void;
  onResetDefaults: () => void;
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

    const signals =
      signalsRes.status === "fulfilled" ? signalsRes.value : { generated_at: Date.now(), signals: [] };
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
            <button className="btn" onClick={onResetDefaults}>
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
        <Muted>
          This pulls fresh data once (best effort) and downloads 4 files: signals, kpi coverage, update plan, prom txt.
        </Muted>
      </Card>
    </div>
  );
}