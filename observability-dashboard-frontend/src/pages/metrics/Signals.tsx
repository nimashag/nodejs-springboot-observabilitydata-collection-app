import { useMemo, useState } from "react";
import { api } from "../../../../metric-agent-frontend/src/lib/api";
import { usePoll } from "../../../../metric-agent-frontend/src/hooks/usePoll";
import { Drawer } from "../../../../metric-agent-frontend/src/components/Drawer";
import { downloadCsv, downloadJson } from "../../../../metric-agent-frontend/src/lib/download";

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

function severityRank(s?: string) {
  if (s === "critical") return 3;
  if (s === "warning") return 2;
  if (s === "info") return 1;
  return 0;
}

/* ---------------- UI Bits (match KPI layout) ---------------- */

function Button({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      {...props}
      className={cx(
        "rounded-xl border px-3 py-2 text-sm transition",
        "border-gray-200 bg-white text-gray-800 hover:bg-gray-50",
        "dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800/60",
        active &&
          "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700/50 dark:bg-blue-950/30 dark:text-blue-200",
        props.className
      )}
    >
      {children}
    </button>
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
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-[300px] rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-400
                 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500"
    />
  );
}

function Select({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cx(
        "h-10 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900",
        "dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100",
        className
      )}
    >
      {children}
    </select>
  );
}

function Badge({
  kind,
  children,
}: {
  kind: "crit" | "warn" | "info" | "neutral";
  children: React.ReactNode;
}) {
  const styles =
    kind === "crit"
      ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
      : kind === "warn"
      ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200"
      : kind === "info"
      ? "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200"
      : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-950/30 dark:text-gray-200";

  return <span className={cx("inline-flex rounded-full border px-2 py-1 text-xs", styles)}>{children}</span>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-gray-500 dark:text-gray-400">{children}</div>;
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-200">
      <div className="font-semibold">Error</div>
      <div className="mt-1 font-mono text-xs opacity-80">{text}</div>
    </div>
  );
}

/* ---------------- Signals Page ---------------- */

export default function Signals({ settings }: { settings: AppSettings }) {
  const [enabled, setEnabled] = useState(true);

  const [q, setQ] = useState("");
  const [svc, setSvc] = useState("all");
  const [sev, setSev] = useState("all");
  const [sort, setSort] = useState("severity_desc");

  const { data, error, loading } = usePoll(api.signals, {
    intervalMs: settings.intervals.signalsMs,
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

  return (
    <div className="space-y-4">
      {/* ✅ single border outer card only */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        {/* Header row */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">Signals</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Anomalies detected by signal-detector
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button active={enabled && settings.pollingEnabled} onClick={() => setEnabled((x) => !x)}>
              {enabled ? "Live" : "Paused"}
            </Button>

            <Button
              onClick={() =>
                downloadJson(`signals_${Date.now()}.json`, data ?? { generated_at: Date.now(), signals: [] })
              }
            >
              Export JSON
            </Button>

            <Button
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
            </Button>
          </div>
        </div>

        {/* Controls row */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <TextInput value={q} onChange={setQ} placeholder="Filter... (service/signal/metric)" />

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

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Generated: {formatTime(data?.generated_at)}
          </div>
        </div>

        {/* States */}
        {!settings.pollingEnabled ? <div className="mt-3"><Muted>Global polling is OFF (Settings).</Muted></div> : null}
        {error ? <div className="mt-3"><ErrorBox text={error} /></div> : null}
        {loading && !data ? <div className="mt-3"><Muted>Loading…</Muted></div> : null}

        {/* Table */}
        <div className="mt-5 overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
          {/* no border box around table => avoids 2 borders */}
          <div className="grid grid-cols-[200px_140px_140px_140px_1fr_140px] gap-4 border-b border-gray-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <div>Service</div>
            <div>Type</div>
            <div>Severity</div>
            <div>Confidence</div>
            <div>Metric</div>
            <div>When</div>
          </div>

          {filtered.slice(0, 200).length === 0 ? (
            <div className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">No matching signals ✅</div>
          ) : (
            filtered.slice(0, 200).map((s: any, idx: number) => (
              <div
                key={idx}
                onClick={() => setSelected(s)}
                className="grid cursor-pointer grid-cols-[200px_140px_140px_140px_1fr_140px] gap-4 border-b border-gray-100 px-5 py-3 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40"
              >
                <div className="font-mono text-xs text-gray-700 dark:text-gray-200">{s.service}</div>
                <div className="font-mono text-xs text-gray-600 dark:text-gray-300">{s.signal ?? "error"}</div>

                <div>
                  {s.severity === "critical" ? (
                    <Badge kind="crit">critical</Badge>
                  ) : s.severity === "warning" ? (
                    <Badge kind="warn">warning</Badge>
                  ) : s.severity === "info" ? (
                    <Badge kind="info">info</Badge>
                  ) : (
                    <Badge kind="neutral">{s.severity ?? "—"}</Badge>
                  )}
                </div>

                <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
                  {typeof s.confidence === "number" ? `${(s.confidence * 100).toFixed(0)}%` : "—"}
                </div>

                <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
                  {s.metric ?? s.error ?? "—"}
                </div>

                <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
                  {formatTime(s.timestamp)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          Showing {Math.min(filtered.length, 200)} / {raw.length} signals
        </div>
      </div>

      {/* Drawer */}
      <Drawer
        open={!!selected}
        title={`${selected?.service ?? "signal"} — ${selected?.signal ?? "error"}`}
        subtitle={`Severity: ${selected?.severity ?? "—"} • Confidence: ${selected?.confidence ?? "—"}`}
        onClose={() => setSelected(null)}
      >
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="text-xs text-gray-500 dark:text-gray-400">Metric</div>
              <div className="mt-1 font-mono text-xs text-gray-800 dark:text-gray-100">
                {selected?.metric ?? "—"}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="text-xs text-gray-500 dark:text-gray-400">Current</div>
              <div className="mt-1 font-mono text-xs text-gray-800 dark:text-gray-100">
                {selected?.current ?? selected?.current_delta ?? "—"}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="text-xs text-gray-500 dark:text-gray-400">Baseline mean</div>
              <div className="mt-1 font-mono text-xs text-gray-800 dark:text-gray-100">
                {selected?.baseline_mean ?? "—"}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/40">
              <div className="text-xs text-gray-500 dark:text-gray-400">Z-score</div>
              <div className="mt-1 font-mono text-xs text-gray-800 dark:text-gray-100">
                {selected?.z_score ?? "—"}
              </div>
            </div>
          </div>

          {Array.isArray(selected?.top_slow_routes) && selected.top_slow_routes.length ? (
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top slow routes</div>
              <pre className="mt-2 max-h-[340px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs dark:border-gray-800 dark:bg-gray-950/40">
                {JSON.stringify(selected.top_slow_routes, null, 2)}
              </pre>
            </div>
          ) : null}

          {Array.isArray(selected?.top_error_routes) && selected.top_error_routes.length ? (
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Top error routes</div>
              <pre className="mt-2 max-h-[340px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs dark:border-gray-800 dark:bg-gray-950/40">
                {JSON.stringify(selected.top_error_routes, null, 2)}
              </pre>
            </div>
          ) : null}

          {selected?.error ? (
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">Error</div>
              <pre className="mt-2 overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs dark:border-gray-800 dark:bg-gray-950/40">
                {String(selected.error)}
              </pre>
            </div>
          ) : null}

          <Button onClick={() => downloadJson(`signal_${Date.now()}.json`, selected)}>Download this signal</Button>
        </div>
      </Drawer>
    </div>
  );
}