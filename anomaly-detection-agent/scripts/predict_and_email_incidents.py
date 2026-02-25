#!/usr/bin/env python3
import csv
import requests
from collections import Counter

# === CONFIG ===
CSV_FILE = "data/merged/logs_with_metrics_only_matches_labeled.csv"
EMAIL_SERVICE_URL = "http://localhost:4000/v1/email/send"

# Threshold: send email if >= this many anomalies
MIN_ANOMALIES_TO_ALERT = 1


def build_incident_story(rows):
    services = Counter(r["service"] for r in rows)
    events = Counter(r["event"] for r in rows)

    top_service = services.most_common(1)[0][0]
    top_event = events.most_common(1)[0][0]

    html = f"""
    <h2>🚨 Incident Detected</h2>
    <p><b>Total anomalous logs:</b> {len(rows)}</p>
    <p><b>Affected service:</b> {top_service}</p>
    <p><b>Most frequent event:</b> {top_event}</p>

    <h3>Sample anomalies</h3>
    <ul>
    """

    for r in rows[:5]:
        html += f"""
        <li>
          <b>Request:</b> {r['request_id']} |
          <b>Status:</b> {r['status_code']} |
          <b>Score:</b> {r['anomaly_score']}<br/>
          <i>{r['anomaly_reasons']}</i>
        </li>
        """

    html += "</ul>"
    return html


def main():
    anomalies = []

    with open(CSV_FILE, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if int(row["anomaly_label"]) == 1:
                anomalies.append(row)

    print(f"🔍 Found {len(anomalies)} anomalous records")

    if len(anomalies) < MIN_ANOMALIES_TO_ALERT:
        print("ℹ️ Not enough anomalies to trigger email")
        return

    html = build_incident_story(anomalies)

    payload = {
        "subject": "🚨 Incident Detected by Anomaly Detection System",
        "text": f"{len(anomalies)} anomalous events detected",
        "html": html
    }

    response = requests.post(EMAIL_SERVICE_URL, json=payload, timeout=10)

    if response.status_code == 200:
        print("✅ Incident email sent successfully")
    else:
        print("❌ Failed to send email:", response.text)


if __name__ == "__main__":
    main()
