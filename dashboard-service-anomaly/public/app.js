async function load() {
  const res = await fetch("/api/incidents");
  const data = await res.json();

  if (data.error) {
    document.getElementById("meta").innerHTML =
      `<span class="danger">ERROR:</span> ${data.error}<br><span class="mono">${data.expected_path || ""}</span>`;
    return;
  }

  document.getElementById("meta").innerHTML =
    `Generated: <span class="mono">${data.generated_at}</span> | Input: <span class="mono">${data.input_csv}</span>`;

  // counts
  const anomalyCount = data.predicted_anomaly_count ?? 0;
  const normalCount = data.predicted_normal_count ?? 0;

  document.getElementById("counts").innerHTML = `
    <div><span class="pill danger">Anomalies: ${anomalyCount}</span></div>
    <div><span class="pill ok">Normals: ${normalCount}</span></div>
    <div class="small">Model: <span class="mono">${data.model_path}</span></div>
  `;

  // story
  const story = data.incident_story || {};
  const topServices = (story.top_services || []).map(x => `${x[0]} (${x[1]})`).join(", ");
  const topEvents = (story.top_events || []).map(x => `${x[0]} (${x[1]})`).join(", ");
  const topStatus = (story.top_status_codes || []).map(x => `${x[0]} (${x[1]})`).join(", ");

  document.getElementById("story").innerHTML = `
    <div><b>${story.title || "Incident Story"}</b></div>
    <p>${story.summary || ""}</p>
    <div class="small"><b>Top services:</b> ${topServices || "-"}</div>
    <div class="small"><b>Top events:</b> ${topEvents || "-"}</div>
    <div class="small"><b>Top status:</b> ${topStatus || "-"}</div>
  `;

  // incidents table
  const tbody = document.getElementById("incidentsTable");
  tbody.innerHTML = "";

  (data.incidents || []).forEach(inc => {
    const events = (inc.events || []).slice(0, 3).join(", ");
    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="mono">${inc.request_id}</td>
      <td>${inc.service}</td>
      <td>${inc.status_code}</td>
      <td><b>${inc.max_anomaly_score}</b></td>
      <td class="small">${events}</td>
      <td class="small">${inc.reason || ""}</td>
    `;
    tbody.appendChild(row);
  });
}

load().catch(err => {
  document.getElementById("meta").innerHTML =
    `<span class="danger">Failed to load:</span> ${String(err)}`;
});
