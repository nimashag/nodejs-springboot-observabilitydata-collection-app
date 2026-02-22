import "dotenv/config";
import { sendIncidentEmail } from "../src/services/emailService.js";

await sendIncidentEmail({
  subject: "🚨 Incident Detected: High Latency",
  text: `
Incident Summary:
- Service: restaurants-service
- Status: 500 errors detected
- Avg latency exceeded threshold

Action Required.
`,
  html: `
<h2>🚨 Incident Detected</h2>
<ul>
  <li><b>Service:</b> restaurants-service</li>
  <li><b>Issue:</b> High latency & errors</li>
  <li><b>Severity:</b> HIGH</li>
</ul>
<p>Please investigate immediately.</p>
`,
});
