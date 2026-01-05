let TREND_CHART = null;
let SERVICE_CHART = null;
let RAW_DATA = null;

function severityOf(inc) {
  const level = (inc.level || "info").toLowerCase();
  const sc = Number(inc.status_code || 0);
  if (sc >= 500 || level === "error" || level === "fatal") return "high";
  if ((sc >= 400 && sc < 500) || level === "warn" || level === "warning") return "medium";
  return "low";
}

function badgeStatus(sc) {
  const n = Number(sc || 0);
  if (n >= 500) return `<span class="rounded-full bg-rose-500/15 text-rose-200 px-2.5 py-1 text-xs font-semibold border border-rose-500/25">${n}</span>`;
  if (n >= 400) return `<span class="rounded-full bg-amber-500/15 text-amber-200 px-2.5 py-1 text-xs font-semibold border border-amber-500/25">${n}</span>`;
  return `<span class="rounded-full bg-slate-500/15 text-slate-200 px-2.5 py-1 text-xs font-semibold border border-white/10">${n}</span>`;
}

function badgeLevel(level) {
  const lvl = (level || "info").toLowerCase();
  if (lvl === "error" || lvl === "fatal") return `<span class="rounded-full bg-rose-500/15 text-rose-200 px-2.5 py-1 text-xs font-semibold border border-rose-500/25">error</span>`;
  if (lvl === "warn" || lvl === "warning") return `<span class="rounded-full bg-amber-500/15 text-amber-200 px-2.5 py-1 text-xs font-semibold border border-amber-500/25">warn</span>`;
  return `<span class="rounded-full bg-indigo-500/15 text-indigo-200 px-2.5 py-1 text-xs font-semibold border border-indigo-500/25">info</span>`;
}

function buildServiceOptions(incidents) {
  const sel = document.getElementById("serviceFilter");
  const existing = new Set(Array.from(sel.options).map(o => o.value));
  const services = [...new Set((incidents || []).map(i => i.service).filter(Boolean))].sort();

  services.forEach(s => {
    if (!existing.has(s)) {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      sel.appendChild(opt);
    }
  });
}

function applyFilters(data) {
  const severity = document.getElementById("severityFilter").value;
  const service = document.getElementById("serviceFilter").value;

  let incidents = data.incidents || [];

  if (severity !== "all") incidents = incidents.filter(i => severityOf(i) === severity);
  if (service !== "all") incidents = incidents.filter(i => i.service === service);

  return incidents;
}

function renderStats(data, filteredIncidents) {
  document.getElementById("statTotal").textContent = data.total_rows ?? "-";
  document.getElementById("statAnomRows").textContent = data.predicted_anomaly_count ?? "-";
  document.getElementById("statNormRows").textContent = data.predicted_normal_count ?? "-";
  document.getElementById("statAnomReq").textContent = filteredIncidents.length ?? 0;

  const hint = document.getElementById("tableHint");
  const sev = document.getElementById("severityFilter").value;
  const svc = document.getElementById("serviceFilter").value;
  hint.textContent = `Showing ${filteredIncidents.length} incident(s) | Severity: ${sev} | Service: ${svc}`;
}

function renderStory(data) {
  const story = data.incident_story || {};
  document.getElementById("story").innerHTML = `
    <div class="font-semibold text-slate-100">${story.title || "Incident Story"}</div>
    <div class="mt-2 text-slate-200">${story.summary || "-"}</div>
  `;

  const topServices = (story.top_services || []).map(x => `${x[0]} (${x[1]})`).join(", ");
  const topEvents = (story.top_events || []).map(x => `${x[0]} (${x[1]})`).join(", ");
  const topStatus = (story.top_status_codes || []).map(x => `${x[0]} (${x[1]})`).join(", ");

  document.getElementById("topServices").textContent = topServices || "-";
  document.getElementById("topEvents").textContent = topEvents || "-";
  document.getElementById("topStatus").textContent = topStatus || "-";
}

function renderTable(incidents) {
  const tbody = document.getElementById("incidentsTable");
  tbody.innerHTML = "";

  incidents.forEach(inc => {
    const events = (inc.events || []).join(", ");
    const tr = document.createElement("tr");
    tr.className = "hover:bg-white/5";

    tr.innerHTML = `
      <td class="px-5 py-3 mono text-slate-100">${inc.request_id || "-"}</td>
      <td class="px-5 py-3 text-slate-200">${inc.service || "-"}</td>
      <td class="px-5 py-3">${badgeStatus(inc.status_code)}</td>
      <td class="px-5 py-3">${badgeLevel(inc.level)}</td>
      <td class="px-5 py-3 mono text-slate-200">${inc.level_encoded ?? "-"}</td>
      <td class="px-5 py-3 mono text-slate-200">${events || "-"}</td>
      <td class="px-5 py-3 mono text-slate-200 max-w-xl break-words">${inc.reason || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

function renderCharts(incidents) {
  Chart.defaults.color = "rgba(226,232,240,0.9)";
  Chart.defaults.borderColor = "rgba(148,163,184,0.25)";

  const labels = incidents.map((_, idx) => String(idx + 1));
  const scores = incidents.map(i => Number(i.max_anomaly_score ?? 1));

  const trendCtx = document.getElementById("trendChart");
  if (TREND_CHART) TREND_CHART.destroy();
  TREND_CHART = new Chart(trendCtx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label: "Anomaly score (per incident)",
        data: scores,
        tension: 0.35,
        pointRadius: 3,
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true } }
    }
  });

  const serviceCounts = new Map();
  incidents.forEach(i => {
    const s = i.service || "unknown";
    serviceCounts.set(s, (serviceCounts.get(s) || 0) + 1);
  });

  const sorted = [...serviceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const svcLabels = sorted.map(x => x[0]);
  const svcVals = sorted.map(x => x[1]);

  const svcCtx = document.getElementById("serviceChart");
  if (SERVICE_CHART) SERVICE_CHART.destroy();
  SERVICE_CHART = new Chart(svcCtx, {
    type: "bar",
    data: {
      labels: svcLabels,
      datasets: [{
        label: "Incidents",
        data: svcVals,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
    }
  });
}

function refreshUI() {
  if (!RAW_DATA) return;
  const filtered = applyFilters(RAW_DATA);

  renderStats(RAW_DATA, filtered);
  renderTable(filtered);
  renderCharts(filtered);
}

async function load() {
  const res = await fetch("/api/incidents");
  const data = await res.json();

  if (data.error) {
    document.getElementById("meta").innerHTML =
      `<span class="text-rose-300 font-semibold">ERROR:</span> ${data.error}`;
    return;
  }

  RAW_DATA = data;

  document.getElementById("meta").innerHTML = `
    <span class="text-slate-300">Generated:</span> <span class="mono text-slate-100">${data.generated_at}</span>
    <span class="text-slate-500">|</span>
    <span class="text-slate-300">Input:</span> <span class="mono text-slate-100">${data.input_csv}</span>
  `;

  buildServiceOptions(data.incidents || []);
  renderStory(data);
  refreshUI();
}

document.getElementById("severityFilter").addEventListener("change", refreshUI);
document.getElementById("serviceFilter").addEventListener("change", refreshUI);
document.getElementById("refreshBtn").addEventListener("click", () => load().catch(console.error));

load().catch(err => {
  document.getElementById("meta").innerHTML =
    `<span class="text-rose-300 font-semibold">Failed to load:</span> ${String(err)}`;
});
