# Metric & Signal Discovery Agent (Custom Telemetry + ML)

## What this does
This agent collects **real-time telemetry** from multiple microservices (Node.js + Spring Boot),
creates a **discovery report** (top routes, slow routes, error routes), and applies a lightweight
**ML-based anomaly detector** to generate operational signals such as:
- `latency_spike`
- `error_burst`

No OpenTelemetry, Prometheus, or external observability APIs are used.

## Inputs
Each service exposes a custom telemetry endpoint:
- orders-service: `http://localhost:3002/api/orders/telemetry`
- restaurants-service: `http://localhost:3001/api/restaurants/telemetry`
- delivery-service: `http://localhost:3004/api/delivery/telemetry`
- users-service: `http://localhost:3003/telemetry`

Service URLs are configured in:
`agent/services.json`

## Outputs
Generated in `agent/`:
- `baseline.json` → learned baseline time-series per service
- `signals.json` → detected ML signals (with evidence + top offending routes)
- `discovery_report.json` → route discovery summary per service
- `final_agent_report.json` → combined final report (discovery + signals)

## Run (single command)
From `metric-signal-discovery-agent/agent`:

```bash
node run-all.js
