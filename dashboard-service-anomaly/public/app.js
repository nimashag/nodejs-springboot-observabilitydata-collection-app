async function load() {
  const res = await fetch("/api/incidents");
  const data = await res.json();

  if (data.error) {
    document.getElementById("meta").innerHTML = `
      <span class="text-danger">ERROR:</span> ${data.error}<br>
      <span class="mono">${data.expected_path || ""}</span>
    `;
    return;
  }

  // Meta info
  document.getElementById("meta").innerHTML = `
    Generated: <span class="mono">${data.generated_at}</span>
    &nbsp;|&nbsp;
    Input: <span class="mono">${data.input_csv}</span>
  `;

  // Counts
  const anomalyCount = data.predicted_anomaly_count ?? 0;
  const normalCount = data.predicted_normal_count ?? 0;
  const anomalyReqCount = data.incidents?.length ?? 0;
  const totalRows = data.total_rows ?? "-";

  document.getElementById("counts").innerHTML = `
    <div class="d-flex gap-2 flex-wrap">
      <span class="badge text-bg-danger">Anomalies (rows): ${anomalyCount}</span>
      <span class="badge text-bg-success">Normals (rows): ${normalCount}</span>
      <span class="badge text-bg-secondary">Anomaly requests: ${anomalyReqCount}</span>
      <span class="badge text-bg-light text-dark">Total rows: ${totalRows}</span>
    </div>
  `;

  // Incident story
  const story = data.incident_story || {};
  const topServices = (story.top_services || [])
    .map(x => `${x[0]} (${x[1]})`)
    .join(", ");

  const topEvents = (story.top_events || [])
    .map(x => `${x[0]} (${x[1]})`)
    .join(", ");

  const topStatus = (story.top_status_codes || [])
    .map(x => `${x[0]} (${x[1]})`)
    .join(", ");

  document.getElementById("story").innerHTML = `
    <div><b>${story.title || "Incident Story"}</b></div>
    <p class="mb-2">${story.summary || ""}</p>
    <div class="subtle"><b>Top services:</b> ${topServices || "-"}</div>
    <div class="subtle"><b>Top events:</b> ${topEvents || "-"}</div>
    <div class="subtle"><b>Top status:</b> ${topStatus || "-"}</div>
  `;

  // Incidents table
  const tbody = document.getElementById("incidentsTable");
  tbody.innerHTML = "";

  (data.incidents || []).forEach(inc => {
    const events = (inc.events || []).join(", ");
    const level = (inc.level || "info").toLowerCase();
    const levelEnc = inc.level_encoded ?? "-";

    let lvlBadge = "info";
    if (level === "error" || level === "fatal") lvlBadge = "danger";
    else if (level === "warn" || level === "warning") lvlBadge = "warning";

    let statusBadge = "secondary";
    const sc = Number(inc.status_code || 0);
    if (sc >= 500) statusBadge = "danger";
    else if (sc >= 400) statusBadge = "warning";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="mono">${inc.request_id}</td>
      <td>${inc.service}</td>
      <td><span class="badge text-bg-${statusBadge}">${inc.status_code}</span></td>
      <td>
        <span class="badge text-bg-${lvlBadge} ${lvlBadge === "warning" ? "text-dark" : ""}">
          ${level}
        </span>
      </td>
      <td class="mono">${levelEnc}</td>
      <td class="mono">${events || "-"}</td>
      <td class="mono">${inc.reason || "-"}</td>
    `;
    tbody.appendChild(row);
  });
}

load().catch(err => {
  document.getElementById("meta").innerHTML = `
    <span class="text-danger">Failed to load:</span> ${String(err)}
  `;
});
