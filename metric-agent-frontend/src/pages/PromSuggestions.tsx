import { useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../lib/api";
import { usePoll } from "../hooks/usePoll";
import { downloadText } from "../lib/download";
import { parsePromSuggestions } from "../lib/parsePromSuggestions";

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

/* ---------------- Prom Suggestions Page ---------------- */

export default function PromSuggestions({ settings }: { settings: AppSettings }) {
  const [enabled, setEnabled] = useState(false);

  const { data, error, loading } = usePoll(api.promSuggestions, {
    intervalMs: settings.intervals.promMs,
    enabled: settings.pollingEnabled && enabled,
  });

  const [promView, setPromView] = useState<"raw" | "structured">(settings.ui.defaultPromView);
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

  return (
    <Card
      title="Prom Suggestions"
      subtitle="Prometheus-style naming + labels (derived suggestions)"
      right={
        <div className="row">
          <button
            className={cn("btn", enabled && settings.pollingEnabled && "btnActive")}
            onClick={() => setEnabled((x) => !x)}
          >
            {enabled ? "Live" : "Load"}
          </button>

          <button className={cn("btn", promView === "raw" && "btnActive")} onClick={() => setPromView("raw")}>
            Raw
          </button>

          <button
            className={cn("btn", promView === "structured" && "btnActive")}
            onClick={() => setPromView("structured")}
          >
            Structured
          </button>

          <button className="btn" onClick={() => downloadText(`prom_suggestions_${Date.now()}.txt`, promText)}>
            Export TXT
          </button>
        </div>
      }
    >
      {!settings.pollingEnabled ? <Muted>Global polling is OFF (Settings).</Muted> : null}
      {error ? <ErrorBox text={error} /> : null}
      {loading && !data && enabled ? <Muted>Loading…</Muted> : null}
      {!enabled ? <Muted>Click “Load” to fetch the file.</Muted> : null}

      {enabled ? (
        <>
          <Toolbar
            left={
              <div className="row">
                <TextInput
                  value={promSearch}
                  onChange={setPromSearch}
                  placeholder="Search… (service/method/path/intent/metric text)"
                />
              </div>
            }
            right={
              <div className="meta">
                {promView === "structured"
                  ? `Blocks: ${promFiltered.length} / ${promBlocks.length}`
                  : `Lines: ${promText.split(/\r?\n/).filter(Boolean).length}`}
              </div>
            }
          />

          {promView === "raw" ? (
            <pre className="code">{promText}</pre>
          ) : (
            <div>
              {!promFiltered.length ? <Muted>No matches ✅</Muted> : null}

              {promFiltered.map((b, idx) => (
                <div key={`${b.service}-${b.routeLine}-${idx}`} className="card" style={{ marginBottom: 12 }}>
                  <div className="cardHeader">
                    <div>
                      <div className="cardTitle">
                        <span className="mono">{b.service}</span>{" "}
                        <span className="muted">
                          {b.method ? `${b.method} ` : ""}
                          {b.path ?? ""}
                        </span>
                      </div>
                      <div className="cardSub mono">
                        intent: {b.intent ?? "—"} • conf: {b.conf ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="cardBody">
                    <div className="mono" style={{ marginBottom: 8 }}>
                      {b.routeLine}
                    </div>

                    <pre className="code" style={{ margin: 0 }}>
                      {b.lines.map((l) => l.text).join("\n")}
                    </pre>
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