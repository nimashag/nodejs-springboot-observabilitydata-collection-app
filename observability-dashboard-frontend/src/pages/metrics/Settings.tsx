import { useState, type ReactNode } from "react";
import { api } from "../../api/metrics/metricsApi";
import { downloadJson, downloadText } from "../../utils/metrics/download";

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

function cx(...xs: Array<string | false | null | undefined>) {
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

function formatMsLabel(ms: number) {
  if (ms >= 3600000) return `${ms / 3600000}h`;
  if (ms >= 60000) return `${ms / 60000}m`;
  if (ms >= 1000) return `${ms / 1000}s`;
  return `${ms}ms`;
}

/* ---------------- Tailwind UI ---------------- */

function Button({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={cx(
        "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm transition",
        "border-gray-200 bg-white text-gray-800 hover:bg-gray-50",
        "dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800/60",
        active &&
          "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/30 dark:text-blue-200",
        props.className,
      )}
    >
      {children}
    </button>
  );
}

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
        {right ? (
          <div className="flex flex-wrap items-center gap-2">{right}</div>
        ) : null}
      </div>
      <div className="px-5 pb-5 pt-4">{children}</div>
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

function Badge({
  kind,
  children,
}: {
  kind: "neutral" | "ok" | "warn" | "crit";
  children: ReactNode;
}) {
  const base =
    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium";
  const styles =
    kind === "ok"
      ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200"
      : kind === "warn"
        ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
        : kind === "crit"
          ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-300";

  return <span className={cx(base, styles)}>{children}</span>;
}

function TextInput({
  value,
  onChange,
  type,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      className={cx(
        "h-10 w-[220px] max-w-full rounded-xl border px-3 text-sm outline-none transition",
        "border-gray-200 bg-white text-gray-900 focus:border-blue-300 focus:ring-4 focus:ring-blue-100",
        "dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:focus:border-blue-700/60 dark:focus:ring-blue-900/30",
      )}
    />
  );
}

function CodeBox({ children }: { children: ReactNode }) {
  return (
    <pre
      className={cx(
        "mt-3 overflow-auto rounded-2xl border p-4 text-xs leading-relaxed",
        "border-gray-200 bg-gray-50 text-gray-900",
        "dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-100",
      )}
    >
      {children}
    </pre>
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

  const setPollingEnabled = (v: boolean) =>
    onChange({ ...settings, pollingEnabled: v });

  const setInterval = (key: keyof AppSettings["intervals"], v: string) => {
    const n = clampMs(Number(v), 500, 3600000);
    onChange({ ...settings, intervals: { ...settings.intervals, [key]: n } });
  };

  const applyAwsPreset = () => {
    onChange({
      ...settings,
      intervals: {
        healthMs: 30000,
        signalsMs: 900000,
        kpiMs: 3600000,
        planMs: 3600000,
        promMs: 3600000,
      },
    });
  };

  const applyBalancedPreset = () => {
    onChange({
      ...settings,
      intervals: {
        healthMs: 15000,
        signalsMs: 300000,
        kpiMs: 1800000,
        planMs: 1800000,
        promMs: 1800000,
      },
    });
  };

  const applyFastLocalPreset = () => {
    onChange({
      ...settings,
      intervals: {
        healthMs: 5000,
        signalsMs: 30000,
        kpiMs: 60000,
        planMs: 60000,
        promMs: 60000,
      },
    });
  };

  async function runDiagnostics() {
    setDiagRunning(true);

    const tests: Array<{ key: string; label: string; fn: () => Promise<any> }> =
      [
        { key: "health", label: "Health", fn: () => api.health() },
        { key: "signals", label: "Signals", fn: () => api.signals() },
        { key: "kpi", label: "KPI Coverage", fn: () => api.kpiCoverage() },
        { key: "plan", label: "Update Plan", fn: () => api.updatePlan() },
        {
          key: "prom",
          label: "Prom Suggestions",
          fn: () => api.promSuggestions(),
        },
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
      signalsRes.status === "fulfilled"
        ? signalsRes.value
        : { generated_at: Date.now(), signals: [] };
    const kpi = kpiRes.status === "fulfilled" ? kpiRes.value : {};
    const plan = planRes.status === "fulfilled" ? planRes.value : {};
    const prom =
      promRes.status === "fulfilled" ? String(promRes.value ?? "") : "";

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
    <div className="grid grid-cols-1 gap-3">
      <Card
        title="Global Controls"
        subtitle="Master switches for the whole UI"
        right={
          <>
            <Button
              active={settings.pollingEnabled}
              onClick={() => setPollingEnabled(!settings.pollingEnabled)}
            >
              {settings.pollingEnabled ? "Polling ON" : "Polling OFF"}
            </Button>
            <Button onClick={() => onJump("signals")}>Go Signals →</Button>
            <Button onClick={() => onJump("prom")}>Go Prom →</Button>
          </>
        }
      >
        <Muted>
          If you’re debugging backend, turn polling OFF so the UI stops firing
          requests.
        </Muted>
      </Card>

      <Card
        title="Intervals"
        subtitle="Default polling intervals (ms)"
        right={
          <>
            <Button onClick={applyFastLocalPreset}>Fast local</Button>
            <Button onClick={applyBalancedPreset}>Balanced</Button>
            <Button onClick={applyAwsPreset}>AWS light</Button>
          </>
        }
      >
        <div className="mt-1 space-y-3">
          {(
            [
              ["healthMs", "Health"],
              ["signalsMs", "Signals"],
              ["kpiMs", "KPI Coverage"],
              ["planMs", "Update Plan"],
              ["promMs", "Prom Suggestions"],
            ] as Array<[keyof AppSettings["intervals"], string]>
          ).map(([key, label]) => (
            <div
              key={key}
              className="flex items-center justify-between gap-4 border-b border-gray-100 pb-3 last:border-b-0 last:pb-0 dark:border-gray-800"
            >
              <div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {label}
                </div>
                <div className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                  Current: {formatMsLabel(intervals[key])}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <TextInput
                  value={String(intervals[key])}
                  onChange={(v) => setInterval(key, v)}
                  type="number"
                />
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  ms
                </span>
              </div>
            </div>
          ))}
        </div>

        <Muted>Limits: min 500ms, max 3,600,000ms (1 hour).</Muted>
      </Card>

      <Card
        title="UI Preferences"
        subtitle="Saved in localStorage"
        right={<Button onClick={onResetDefaults}>Reset defaults</Button>}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Default Prom view:
          </div>
          <Button
            active={settings.ui.defaultPromView === "raw"}
            onClick={() =>
              onChange({
                ...settings,
                ui: { ...settings.ui, defaultPromView: "raw" },
              })
            }
          >
            Raw
          </Button>
          <Button
            active={settings.ui.defaultPromView === "structured"}
            onClick={() =>
              onChange({
                ...settings,
                ui: { ...settings.ui, defaultPromView: "structured" },
              })
            }
          >
            Structured
          </Button>
        </div>
      </Card>

      <Card
        title="Diagnostics"
        subtitle="Ping endpoints and see if backend is alive"
        right={
          <>
            <Button
              active={diagRunning}
              onClick={runDiagnostics}
              disabled={diagRunning}
            >
              {diagRunning ? "Running…" : "Run diagnostics"}
            </Button>
            <Button onClick={copyDebug} disabled={!diag.length}>
              Copy debug info
            </Button>
          </>
        }
      >
        {!diag.length ? (
          <Muted>Click “Run diagnostics” to test all endpoints.</Muted>
        ) : (
          <>
            <div className="mt-3 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-4 gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[11px] uppercase tracking-wider text-gray-500 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-400">
                <div>Endpoint</div>
                <div>Status</div>
                <div>Latency</div>
                <div>Checked</div>
              </div>

              {diag.map((d) => (
                <div
                  key={d.key}
                  className="grid grid-cols-4 gap-3 border-b border-gray-100 px-4 py-3 text-sm last:border-b-0 dark:border-gray-800"
                >
                  <div className="font-mono text-xs text-gray-900 dark:text-gray-100">
                    {d.label}
                  </div>
                  <div>
                    {d.ok ? (
                      <Badge kind="ok">ok</Badge>
                    ) : (
                      <Badge kind="crit">fail</Badge>
                    )}
                  </div>
                  <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
                    {typeof d.ms === "number" ? `${d.ms}ms` : "—"}
                  </div>
                  <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
                    {formatTime(d.at)}
                  </div>
                </div>
              ))}
            </div>

            {diag.some((d) => d.error) ? (
              <div className="mt-4">
                <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  Errors
                </div>
                <CodeBox>
                  {diag
                    .filter((d) => d.error)
                    .map((d) => `${d.label}: ${d.error}`)
                    .join("\n")}
                </CodeBox>
              </div>
            ) : null}
          </>
        )}
      </Card>

      <Card
        title="Exports"
        subtitle="One-click export bundle"
        right={<Button onClick={exportEverything}>Export everything</Button>}
      >
        <Muted>
          This pulls fresh data once (best effort) and downloads 4 files:
          signals, kpi coverage, update plan, prom txt.
        </Muted>
      </Card>
    </div>
  );
}