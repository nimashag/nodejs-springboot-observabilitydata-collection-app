import { useMemo, useState, type ReactNode } from "react";
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

function Badge({
  kind,
  children,
}: {
  kind: "neutral" | "ok" | "warn" | "crit";
  children: ReactNode;
}) {
  const styles =
    kind === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300"
      : kind === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300"
        : kind === "crit"
          ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
          : "border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
        styles,
      )}
    >
      {children}
    </span>
  );
}

function Toolbar({ left, right }: { left?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
      <div className="flex flex-wrap items-center gap-2">{left}</div>
      <div className="text-xs text-gray-500 dark:text-gray-400">{right}</div>
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
      className="h-9 w-72 rounded-xl border border-gray-200 bg-white px-3 text-xs text-gray-900 outline-none placeholder:text-gray-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-500 dark:focus:ring-blue-500/15"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
    />
  );
}

function Button({
  active,
  children,
  onClick,
  disabled,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-9 rounded-xl border px-3 text-xs font-medium transition",
        "border-gray-200 bg-white text-gray-800 hover:bg-gray-50",
        "dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800/50",
        active &&
          "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/30 dark:text-blue-300",
        disabled && "opacity-60 cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- KPI Coverage Page ---------------- */

export default function KpiCoverage({ settings }: { settings: AppSettings }) {
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
      .filter((r: any) =>
        showOnlyMissing ? (r.missing_kpis ?? []).length > 0 : true,
      )
      .filter((r: any) => {
        if (!qq) return true;
        const blob =
          `${r.service} ${(r.missing_kpis ?? []).join(" ")} ${r.url}`.toLowerCase();
        return blob.includes(qq);
      })
      .sort(
        (a: any, b: any) =>
          (b.missing_kpis?.length ?? 0) - (a.missing_kpis?.length ?? 0),
      );
  }, [data?.generated_at, q, showOnlyMissing]);

  const [selected, setSelected] = useState<any | null>(null);

  return (
    <div className="space-y-4">
      <Card
        title="KPI Coverage"
        subtitle="Shows missing KPIs per service"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              active={enabled && settings.pollingEnabled}
              onClick={() => setEnabled((x) => !x)}
            >
              {enabled ? "Live" : "Paused"}
            </Button>

            <Button
              onClick={() =>
                downloadJson(`kpi_coverage_${Date.now()}.json`, data ?? {})
              }
            >
              Export JSON
            </Button>

            <Button
              onClick={() =>
                downloadCsv(
                  `kpi_coverage_${Date.now()}.csv`,
                  data?.results ?? [],
                )
              }
            >
              Export CSV
            </Button>
          </div>
        }
      >
        <Toolbar
          left={
            <div className="flex flex-wrap items-center gap-2">
              <TextInput
                value={q}
                onChange={setQ}
                placeholder="Filter… (service/kpi/url)"
              />
              <Button
                active={showOnlyMissing}
                onClick={() => setShowOnlyMissing((x) => !x)}
              >
                {showOnlyMissing ? "Only missing" : "Show all"}
              </Button>
            </div>
          }
          right={<div>Generated: {formatTime(data?.generated_at)}</div>}
        />

        {!settings.pollingEnabled ? (
          <Muted>Global polling is OFF (Settings).</Muted>
        ) : null}
        {error ? <ErrorBox text={error} /> : null}
        {loading && !data ? <Muted>Loading…</Muted> : null}

        {/* Table */}
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-[180px_140px_1fr_1fr] gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
            <div>Service</div>
            <div>Status</div>
            <div>Missing KPIs</div>
            <div>URL</div>
          </div>

          {rows.map((r: any, idx: number) => {
            const missing = r.missing_kpis ?? [];
            const ok = missing.length === 0;
            return (
              <div
                key={idx}
                onClick={() => setSelected(r)}
                className="grid cursor-pointer grid-cols-[180px_140px_1fr_1fr] gap-3 border-b border-gray-100 px-4 py-3 text-xs text-gray-800 hover:bg-gray-50 dark:border-gray-800/70 dark:text-gray-200 dark:hover:bg-gray-800/30"
              >
                <div className="font-mono text-[12px]">{r.service}</div>
                <div>
                  {ok ? (
                    <Badge kind="ok">complete</Badge>
                  ) : (
                    <Badge kind="warn">{missing.length} missing</Badge>
                  )}
                </div>
                <div className="font-mono text-[12px]">
                  {ok ? "—" : missing.join(", ")}
                </div>
                <div className="font-mono text-[12px]">{r.url}</div>
              </div>
            );
          })}

          {!rows.length ? (
            <div className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
              No results ✅
            </div>
          ) : null}
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
        <pre className="mt-3 max-h-[560px] overflow-auto rounded-xl border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-100">
          {JSON.stringify(selected, null, 2)}
        </pre>

        <button
          className="mt-3 h-9 rounded-xl border border-gray-200 bg-white px-3 text-xs font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800/50"
          onClick={() =>
            downloadJson(
              `kpi_${selected?.service ?? "service"}_${Date.now()}.json`,
              selected,
            )
          }
        >
          Download this service report
        </button>
      </Drawer>
    </div>
  );
}
