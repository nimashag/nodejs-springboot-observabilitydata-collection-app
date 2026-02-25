#!/usr/bin/env python3
import json
import joblib
import pandas as pd
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime, timezone
import requests
import os

# ---------------- CONFIG ----------------
DEFAULT_INPUT_CSV = "data/merged/logs_with_metrics_clean.csv"
DEFAULT_MODEL_PATH = "model_experiments/models/random_forest/rf_model.pkl"

OUT_DIR = Path("outputs")
OUT_PRED_CSV = OUT_DIR / "predictions_latest.csv"
OUT_INCIDENTS_JSON = OUT_DIR / "incidents_latest.json"

FEATURES_NUMERIC = ["duration_ms", "cpu_percent", "memory_mb", "db_query_time_ms", "status_code"]
FEATURE_LEVEL = "level"

LEVEL_MAP = {"debug": 0, "info": 1, "warn": 2, "warning": 2, "error": 3, "fatal": 4}

EMAIL_SERVICE_URL = "http://localhost:4000/v1/email/send"
SEND_EMAIL = os.getenv("ANOMALY_SEND_EMAIL", "1").strip().lower() not in {"0", "false", "no"}
MIN_INCIDENTS_TO_EMAIL = 1
# ----------------------------------------


def safe_float(x, default=0.0):
    try:
        if pd.isna(x) or x == "":
            return default
        return float(x)
    except:
        return default


def safe_int(x, default=0):
    try:
        if pd.isna(x) or x == "":
            return default
        return int(float(x))
    except:
        return default


def encode_level(level_str):
    if not isinstance(level_str, str):
        return LEVEL_MAP["info"]
    return LEVEL_MAP.get(level_str.strip().lower(), LEVEL_MAP["info"])


def worst_level(rows):
    best = ("info", LEVEL_MAP["info"])
    for r in rows:
        lv = str(r.get("level", "info")).strip().lower()
        enc = LEVEL_MAP.get(lv, LEVEL_MAP["info"])
        if enc > best[1]:
            best = (lv, enc)
    return best[0], best[1]


def build_story(incidents):
    if not incidents:
        return {
            "title": "No incidents detected",
            "summary": "No anomalous requests found in this dataset.",
            "top_services": [],
            "top_events": [],
            "top_status_codes": [],
        }

    svc_counter = Counter()
    event_counter = Counter()
    status_counter = Counter()

    for inc in incidents:
        svc_counter[inc.get("service", "unknown")] += 1
        for ev in inc.get("events", []):
            event_counter[ev] += 1
        status_counter[str(inc.get("status_code", "unknown"))] += 1

    top_services = svc_counter.most_common(5)
    top_events = event_counter.most_common(5)
    top_status = status_counter.most_common(5)

    return {
        "title": "Incident Story (Auto-Generated)",
        "summary": f"{len(incidents)} anomalous request(s) detected. Most impacted service: {top_services[0][0] if top_services else 'N/A'}.",
        "top_services": top_services,
        "top_events": top_events,
        "top_status_codes": top_status,
    }


def send_incident_email(payload):
    incidents = payload.get("incidents", [])
    story = payload.get("incident_story", {})

    subject = f"🚨 Incident Alert: {len(incidents)} anomaly request(s)"
    text = story.get("summary", "")

    rows_html = ""
    for inc in incidents[:10]:
        rows_html += f"""
        <tr>
          <td>{inc.get('request_id')}</td>
          <td>{inc.get('service')}</td>
          <td>{inc.get('status_code')}</td>
          <td>{inc.get('level')}</td>
          <td>{inc.get('level_encoded')}</td>
          <td>{", ".join(inc.get("events", [])[:2])}</td>
          <td>{inc.get('reason')}</td>
        </tr>
        """

    html = f"""
    <h2>🚨 Incident Detected</h2>
    <p><b>{story.get('summary','')}</b></p>
    <p><b>Total anomaly requests:</b> {len(incidents)}</p>
    <table border="1" cellpadding="6" cellspacing="0">
      <thead>
        <tr>
          <th>Request ID</th><th>Service</th><th>Status</th>
          <th>Level</th><th>Level Encoded</th><th>Events</th><th>Reason</th>
        </tr>
      </thead>
      <tbody>{rows_html}</tbody>
    </table>
    """

    r = requests.post(
        EMAIL_SERVICE_URL,
        json={"subject": subject, "text": text, "html": html},
        timeout=10
    )

    if r.status_code == 200:
        print("✅ Email sent automatically")
    else:
        print("❌ Email failed:", r.status_code, r.text)


def main(input_csv=DEFAULT_INPUT_CSV, model_path=DEFAULT_MODEL_PATH):
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    input_path = Path(input_csv)
    model_file = Path(model_path)

    if not input_path.exists():
        raise FileNotFoundError(f"Input CSV not found: {input_path}")
    if not model_file.exists():
        raise FileNotFoundError(f"Model file not found: {model_file}")

    df = pd.read_csv(input_path)
    df.columns = [c.strip() for c in df.columns]

    for c in FEATURES_NUMERIC:
        if c not in df.columns:
            df[c] = 0

    if FEATURE_LEVEL not in df.columns:
        df[FEATURE_LEVEL] = "info"

    df["level"] = df["level"].astype(str).str.strip().str.lower()
    df["level_encoded"] = df["level"].apply(encode_level)

    df["duration_ms"] = df["duration_ms"].apply(safe_float)
    df["cpu_percent"] = df["cpu_percent"].apply(safe_float)
    df["memory_mb"] = df["memory_mb"].apply(safe_float)
    df["db_query_time_ms"] = df["db_query_time_ms"].apply(safe_float)
    df["status_code"] = df["status_code"].apply(safe_int)

    X = df[FEATURES_NUMERIC].copy()
    X["level_encoded"] = df["level_encoded"]

    model = joblib.load(model_file)
    y_pred = model.predict(X)

    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)[:, 1]
    else:
        proba = y_pred.astype(float)

    df["pred_anomaly_label"] = y_pred
    df["pred_anomaly_score"] = pd.Series(proba).round(4)

    anomaly_count = int(df["pred_anomaly_label"].sum())
    total = len(df)

    print(f"✅ Loaded rows: {total}")
    print(f"🚨 Predicted anomalies: {anomaly_count}")
    print(f"🟢 Predicted normals  : {total - anomaly_count}")

    df.to_csv(OUT_PRED_CSV, index=False)
    print(f"📁 Saved predictions CSV: {OUT_PRED_CSV}")

    incidents = []
    if "request_id" not in df.columns:
        df["request_id"] = [f"row-{i}" for i in range(len(df))]

    grouped = defaultdict(list)
    for _, row in df.iterrows():
        grouped[str(row["request_id"])].append(row.to_dict())

    predicted_anomaly_requests = 0

    for request_id, rows in grouped.items():
        any_anom = any(int(r.get("pred_anomaly_label", 0)) == 1 for r in rows)
        if not any_anom:
            continue

        predicted_anomaly_requests += 1

        svc_counter = Counter()
        ev_counter = Counter()
        max_status = 0

        for r in rows:
            svc_counter[str(r.get("service", "unknown"))] += 1
            ev_counter[str(r.get("event", ""))] += 1
            max_status = max(max_status, safe_int(r.get("status_code", 0)))

        service = svc_counter.most_common(1)[0][0]
        events = [e for e, _ in ev_counter.most_common(10) if e and e != "nan"]

        lvl, lvl_enc = worst_level(rows)

        reason_parts = []
        mx_duration = max(float(r.get("duration_ms", 0)) for r in rows)
        mx_cpu = max(float(r.get("cpu_percent", 0)) for r in rows)
        mx_db = max(float(r.get("db_query_time_ms", 0)) for r in rows)
        if mx_duration >= 3000: reason_parts.append("duration_ms>=3000")
        if mx_cpu >= 80: reason_parts.append("cpu>=80")
        if mx_db >= 300: reason_parts.append("db_query_time_ms>=300")
        if max_status >= 500: reason_parts.append("status_code>=500")
        reason = ";".join(reason_parts)

        incidents.append({
            "request_id": request_id,
            "service": service,
            "status_code": max_status,
            "level": lvl,
            "level_encoded": lvl_enc,
            "events": events,
            "reason": reason,
            "row_count": len(rows),
        })

    incidents = sorted(incidents, key=lambda x: x["status_code"], reverse=True)

    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "input_csv": str(input_path),
        "model_path": str(model_file),
        "total_rows": total,
        "predicted_anomaly_count": anomaly_count,
        "predicted_normal_count": total - anomaly_count,
        "predicted_anomaly_request_count": predicted_anomaly_requests,
        "incident_story": build_story(incidents),
        "incidents": incidents[:200],
    }

    OUT_INCIDENTS_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"📁 Saved incidents JSON: {OUT_INCIDENTS_JSON}")

    # ✅ EMAIL TRIGGER MUST BE HERE (payload exists here)
    if SEND_EMAIL and len(payload.get("incidents", [])) >= MIN_INCIDENTS_TO_EMAIL:
        try:
            send_incident_email(payload)
        except Exception as e:
            # Do not fail anomaly pipeline if email service is unavailable.
            print(f"⚠️ Email send skipped due to error: {e}")
    else:
        print("ℹ️ No email sent (no incidents)")

    return payload


if __name__ == "__main__":
    import sys
    inp = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT_CSV
    mdl = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_MODEL_PATH
    main(inp, mdl)
