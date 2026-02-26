import { useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { usePoll } from "../hooks/usePoll";
import { Drawer } from "../components/Drawer";
import { downloadCsv, downloadJson } from "../lib/download";

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
            <button
              className={cn("btn", enabled && settings.pollingEnabled && "btnActive")}
              onClick={() => setEnabled((x) => !x)}
            >
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
              <button
                className={cn("btn", showOnlyMissing && "btnActive")}
                onClick={() => setShowOnlyMissing((x) => !x)}
              >
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
        <button
          className="btn"
          onClick={() => downloadJson(`kpi_${selected?.service ?? "service"}_${Date.now()}.json`, selected)}
        >
          Download this service report
        </button>
      </Drawer>
    </>
  );
}