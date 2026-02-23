import { useEffect, useMemo, useState, type ReactNode } from "react";
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

/* ---------------- Update Plan Page ---------------- */

export default function UpdatePlan({ settings }: { settings: AppSettings }) {
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
            <button
              className={cn("btn", enabled && settings.pollingEnabled && "btnActive")}
              onClick={() => setEnabled((x) => !x)}
            >
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
                  {Array.isArray(a.required_kpis) ? a.required_kpis.map((x: any) => x?.name).filter(Boolean).join(", ") : "—"}
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

                <button className="btn" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
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