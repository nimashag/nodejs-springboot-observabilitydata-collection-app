const express = require("express");
const { sendIncidentEmail } = require("../services/emailService");

const router = express.Router();

/**
POST /v1/email/send
{
  "to": ["a@x.com", "b@y.com"] or "a@x.com",
  "subject": "Incident: restaurants-service spike",
  "payload": {
     "title": "...",
     "service": "...",
     "severity": "HIGH",
     "timestamp": "...",
     "story": "...",
     "status_code": 500,
     "level": "error",
     "anomaly_score": 3,
     "request_id": "..."
  }
}
*/
router.post("/send", async (req, res) => {
  try {
    const { to, subject, payload } = req.body;

    if (!to || !subject || !payload) {
      return res.status(400).json({ error: "to, subject, payload are required" });
    }

    const recipients = Array.isArray(to) ? to : [to];

    const results = [];
    for (const r of recipients) {
      const messageId = await sendIncidentEmail({ to: r, subject, payload });
      results.push({ to: r, messageId });
    }

    return res.json({ ok: true, results });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Failed to send email",
    });
  }
});

module.exports = router;
