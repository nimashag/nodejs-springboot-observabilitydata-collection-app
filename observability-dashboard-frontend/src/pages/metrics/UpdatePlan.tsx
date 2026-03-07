import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/metrics/metricsApi";
import { usePoll } from "../../hooks/usePoll";
import { Drawer } from "../../components/metrics/Drawer";
import { downloadCsv, downloadJson } from "../../utils/metrics/download";

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

function confidenceDeltaLabel(n?: number | null) {
  if (typeof n !== "number") return "—";
  if (n > 0) return `+${n}`;
  return `${n}`;
}

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
        props.className,
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
        className,
      )}
    >
      {children}
    </select>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-sm text-gray-500 dark:text-gray-400">{children}</div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-200">
      <div className="font-semibold">Error</div>
      <div className="mt-1 font-mono text-xs opacity-80">{text}</div>
    </div>
  );
}

function Badge({
  kind,
  children,
}: {
  kind: "neutral" | "improved" | "regressed" | "new";
  children: React.ReactNode;
}) {
  const styles =
    kind === "improved"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
      : kind === "regressed"
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
        : kind === "new"
          ? "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300"
          : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-200";

  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
        styles,
      )}
    >
      {children}
    </span>
  );
}

/* ---------------- Update Plan Page ---------------- */

export default function UpdatePlan({ settings }: { settings: AppSettings }) {
  const [enabled, setEnabled] = useState(false);

  const [q, setQ] = useState("");
  const [svc, setSvc] = useState("all");
  const [intent, setIntent] = useState("all");
  const [trend, setTrend] = useState("all");

  const { data, error, loading } = usePoll(api.updatePlan, {
    intervalMs: settings.intervals.planMs,
    enabled: settings.pollingEnabled && enabled,
  });

  const actions = data?.actions ?? [];

  const services = useMemo(() => {
    const set = new Set<string>();
    for (const a of actions as any[]) {
      if (a?.service) set.add(String(a.service));
    }
    return ["all", ...Array.from(set).sort()];
  }, [data?.generated_at, actions]);

  const intents = useMemo(() => {
    const set = new Set<string>();
    for (const a of actions as any[]) {
      if (a?.intent) set.add(String(a.intent));
    }
    return ["all", ...Array.from(set).sort()];
  }, [data?.generated_at, actions]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();

    return (actions as any[])
      .filter((a) => (svc === "all" ? true : String(a.service) === svc))
      .filter((a) =>
        intent === "all" ? true : String(a.intent) === intent,
      )
      .filter((a) =>
        trend === "all" ? true : String(a.trend ?? "unchanged") === trend,
      )
      .filter((a) => {
        if (!qq) return true;
        const kpis = Array.isArray(a.required_kpis)
          ? a.required_kpis.map((x: any) => x?.name).join(" ")
          : "";
        const blob =
          `${a.service} ${a.route} ${a.intent} ${kpis} ${a.trend ?? ""}`.toLowerCase();
        return blob.includes(qq);
      })
      .sort((a: any, b: any) => (Number(b.confidence) || 0) - (Number(a.confidence) || 0));
  }, [actions, q, svc, intent, trend]);

  const [selected, setSelected] = useState<any | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("50");

  useEffect(() => {
    setPage(1);
  }, [q, svc, intent, trend, data?.generated_at]);

  const size = Math.max(10, Math.min(200, Number(pageSize) || 50));
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / size));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const pageRows = filtered.slice((safePage - 1) * size, safePage * size);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Update Plan
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Auto-telemetry actions (intent → required KPIs)
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              active={enabled && settings.pollingEnabled}
              onClick={() => setEnabled((x) => !x)}
            >
              {enabled ? "Live" : "Load"}
            </Button>

            <Button
              onClick={() =>
                downloadJson(
                  `telemetry_update_plan_${Date.now()}.json`,
                  data ?? {},
                )
              }
            >
              Export JSON
            </Button>

            <Button
              onClick={() =>
                downloadCsv(
                  `telemetry_update_plan_${Date.now()}.csv`,
                  (actions as any[]).map((a) => ({
                    action: a.action,
                    service: a.service,
                    route: a.route,
                    intent: a.intent,
                    confidence: a.confidence,
                    previous_confidence: a.previous_confidence ?? "",
                    confidence_delta: a.confidence_delta ?? "",
                    trend: a.trend ?? "",
                    required_kpis: Array.isArray(a.required_kpis)
                      ? a.required_kpis
                          .map((x: any) => x?.name)
                          .filter(Boolean)
                          .join("|")
                      : "",
                  })),
                )
              }
            >
              Export CSV
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <TextInput
              value={q}
              onChange={setQ}
              placeholder="Filter... (route/intent/kpi/trend)"
            />

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

            <Select value={trend} onChange={setTrend}>
              <option value="all">all trends</option>
              <option value="new">new</option>
              <option value="improved">improved</option>
              <option value="regressed">regressed</option>
              <option value="unchanged">unchanged</option>
            </Select>
          </div>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Generated: {formatTime(data?.generated_at)} | Actions:{" "}
            {data?.total_rules ?? actions.length} | Avg conf:{" "}
            {data?.avg_confidence ?? "—"} | Services:{" "}
            {data?.services_covered ?? "—"}
          </div>
        </div>

        {!settings.pollingEnabled ? (
          <div className="mt-3">
            <Muted>Global polling is OFF (Settings).</Muted>
          </div>
        ) : null}

        {error ? (
          <div className="mt-3">
            <ErrorBox text={error} />
          </div>
        ) : null}

        {loading && !data && enabled ? (
          <div className="mt-3">
            <Muted>Loading…</Muted>
          </div>
        ) : null}

        {!enabled ? (
          <div className="mt-3">
            <Muted>Paused by default (plan is large). Click “Load”.</Muted>
          </div>
        ) : null}

        {enabled ? (
          <>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Total actions
                </div>
                <div className="mt-1 font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {data?.total_rules ?? actions.length}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Improved
                </div>
                <div className="mt-1 font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {data?.improved_actions ?? 0}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Regressed
                </div>
                <div className="mt-1 font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {data?.regressed_actions ?? 0}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  New
                </div>
                <div className="mt-1 font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {data?.new_actions ?? 0}
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl bg-white dark:bg-gray-900">
              <div className="grid grid-cols-[170px_1.2fr_160px_1fr_90px_90px_120px] gap-4 border-b border-gray-200 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:text-gray-400">
                <div>Service</div>
                <div>Route</div>
                <div>Intent</div>
                <div>KPIs</div>
                <div>Conf</div>
                <div>Δ</div>
                <div>Trend</div>
              </div>

              {pageRows.length === 0 ? (
                <div className="px-5 py-4 text-sm text-gray-500 dark:text-gray-400">
                  No results ✅
                </div>
              ) : (
                pageRows.map((a: any, idx: number) => (
                  <div
                    key={idx}
                    onClick={() => setSelected(a)}
                    className="grid cursor-pointer grid-cols-[170px_1.2fr_160px_1fr_90px_90px_120px] gap-4 border-b border-gray-100 px-5 py-3 text-sm hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/40"
                  >
                    <div className="font-mono text-xs text-gray-700 dark:text-gray-200">
                      {a.service ?? "—"}
                    </div>

                    <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
                      {a.route ?? "—"}
                    </div>

                    <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
                      {a.intent ?? "—"}
                    </div>

                    <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
                      {Array.isArray(a.required_kpis)
                        ? a.required_kpis
                            .map((x: any) => x?.name)
                            .filter(Boolean)
                            .join(", ")
                        : "—"}
                    </div>

                    <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
                      {a.confidence ?? "—"}
                    </div>

                    <div className="font-mono text-xs text-gray-600 dark:text-gray-300">
                      {confidenceDeltaLabel(a.confidence_delta)}
                    </div>

                    <div>
                      {a.trend === "improved" ? (
                        <Badge kind="improved">improved</Badge>
                      ) : a.trend === "regressed" ? (
                        <Badge kind="regressed">regressed</Badge>
                      ) : a.trend === "new" ? (
                        <Badge kind="new">new</Badge>
                      ) : (
                        <Badge kind="neutral">unchanged</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Button
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Prev
                </Button>

                <Button
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next →
                </Button>

                <div className="font-mono text-sm text-gray-500 dark:text-gray-400">
                  Page {safePage} / {totalPages} • Total {total}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Rows per page
                </div>

                <Select value={pageSize} onChange={setPageSize}>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                  <option value="150">150</option>
                </Select>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <Drawer
        open={!!selected}
        title={`${selected?.service ?? "service"} — ${selected?.route ?? "route"}`}
        subtitle={`Intent: ${selected?.intent ?? "—"} • Conf: ${selected?.confidence ?? "—"} • Δ: ${confidenceDeltaLabel(selected?.confidence_delta)} • Trend: ${selected?.trend ?? "unchanged"}`}
        onClose={() => setSelected(null)}
      >
        <pre className="mt-3 max-h-[420px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs dark:border-gray-800 dark:bg-gray-950/40">
          {JSON.stringify(selected, null, 2)}
        </pre>

        <div className="mt-3">
          <Button
            onClick={() =>
              downloadJson(`plan_action_${Date.now()}.json`, selected)
            }
          >
            Download this action
          </Button>
        </div>
      </Drawer>
    </div>
  );
}