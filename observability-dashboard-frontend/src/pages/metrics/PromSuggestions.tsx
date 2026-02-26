import { useEffect, useMemo, useState } from "react";
import { api } from "../../api/metrics/metricsApi";
import { usePoll } from "../../hooks/usePoll";
import { downloadText } from "../../utils/metrics/download";
import { parsePromSuggestions } from "../../utils/metrics/parsePromSuggestions";

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
  right?: React.ReactNode;
  children: React.ReactNode;
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

function Muted({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
      {children}
    </div>
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
      className={cx(
        "h-10 w-[360px] max-w-full rounded-xl border px-3 text-sm outline-none transition",
        "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100",
        "dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:border-blue-700/60 dark:focus:ring-blue-900/30",
      )}
    />
  );
}

function CodeBox({ children }: { children: React.ReactNode }) {
  return (
    <pre
      className={cx(
        "mt-3 max-h-[560px] overflow-auto rounded-2xl border p-4 text-xs leading-relaxed",
        "border-gray-200 bg-gray-50 text-gray-900",
        "dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-100",
      )}
    >
      {children}
    </pre>
  );
}

export default function PromSuggestions({
  settings,
}: {
  settings: AppSettings;
}) {
  const [enabled, setEnabled] = useState(false);

  const { data, error, loading } = usePoll(api.promSuggestions, {
    intervalMs: settings.intervals.promMs,
    enabled: settings.pollingEnabled && enabled,
  });

  const [promView, setPromView] = useState<"raw" | "structured">(
    settings.ui.defaultPromView,
  );
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

  const statsText =
    promView === "structured"
      ? `Blocks: ${promFiltered.length} / ${promBlocks.length}`
      : `Lines: ${promText.split(/\r?\n/).filter(Boolean).length}`;

  return (
    // ✅ Border fix: NO "metric-agent" wrapper here
    <Card
      title="Prom Suggestions"
      subtitle="Prometheus-style naming + labels (derived suggestions)"
      right={
        <>
          <Button
            active={enabled && settings.pollingEnabled}
            onClick={() => setEnabled((x) => !x)}
            disabled={!settings.pollingEnabled && !enabled}
            title={
              !settings.pollingEnabled
                ? "Polling is OFF in Settings"
                : undefined
            }
          >
            {enabled ? "Live" : "Load"}
          </Button>

          <Button
            active={promView === "raw"}
            onClick={() => setPromView("raw")}
          >
            Raw
          </Button>

          <Button
            active={promView === "structured"}
            onClick={() => setPromView("structured")}
          >
            Structured
          </Button>

          <Button
            onClick={() =>
              downloadText(`prom_suggestions_${Date.now()}.txt`, promText)
            }
          >
            Export TXT
          </Button>
        </>
      }
    >
      {!settings.pollingEnabled ? (
        <Muted>Global polling is OFF (Settings).</Muted>
      ) : null}
      {error ? <ErrorBox text={error} /> : null}
      {loading && !data && enabled ? <Muted>Loading…</Muted> : null}
      {!enabled ? <Muted>Click “Load” to fetch the file.</Muted> : null}

      {enabled ? (
        <>
          <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <TextInput
                value={promSearch}
                onChange={setPromSearch}
                placeholder="Search… (service/method/path/intent/metric text)"
              />
            </div>

            <div className="text-xs text-gray-500 dark:text-gray-400">
              {statsText}
            </div>
          </div>

          {promView === "raw" ? (
            <CodeBox>{promText}</CodeBox>
          ) : (
            <div className="mt-4 space-y-3">
              {!promFiltered.length ? <Muted>No matches ✅</Muted> : null}

              {promFiltered.map((b, idx) => (
                <div
                  key={`${b.service}-${b.routeLine}-${idx}`}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="px-5 pt-5">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      <span className="font-mono">{b.service}</span>{" "}
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        {b.method ? `${b.method} ` : ""}
                        {b.path ?? ""}
                      </span>
                    </div>

                    <div className="mt-2 font-mono text-xs text-gray-500 dark:text-gray-400">
                      intent: {b.intent ?? "—"} • conf: {b.conf ?? "—"}
                    </div>
                  </div>

                  <div className="px-5 pb-5 pt-4">
                    <div className="mb-2 font-mono text-xs text-gray-800 dark:text-gray-200">
                      {b.routeLine}
                    </div>
                    <CodeBox>{b.lines.map((l) => l.text).join("\n")}</CodeBox>
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
