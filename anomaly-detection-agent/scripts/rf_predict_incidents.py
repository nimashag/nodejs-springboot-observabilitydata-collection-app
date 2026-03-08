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
# Determine base path - handle both local dev and Docker environments
_script_path = Path(__file__).resolve()
if os.getenv("DOCKER_ENV") == "true" or Path("/app").exists():
    # In Docker, working directory is /app
    BASE_PATH = Path("/app")
    DEFAULT_INPUT_CSV = str(BASE_PATH / "data/merged/logs_with_metrics_clean.csv")
    DEFAULT_MODEL_PATH = str(BASE_PATH / "model_experiments/models/random_forest/rf_model.pkl")
    OUT_DIR = BASE_PATH / "outputs"
else:
    # Local development - use relative paths
    BASE_PATH = _script_path.parent.parent
    DEFAULT_INPUT_CSV = "data/merged/logs_with_metrics_clean.csv"
    DEFAULT_MODEL_PATH = "model_experiments/models/random_forest/rf_model.pkl"
    OUT_DIR = BASE_PATH / "outputs"

OUT_PRED_CSV = OUT_DIR / "predictions_latest.csv"
OUT_INCIDENTS_JSON = OUT_DIR / "incidents_latest.json"
OUT_INCIDENTS_HISTORY_DIR = OUT_DIR / "incidents"

FEATURES_NUMERIC = ["duration_ms", "cpu_percent", "memory_mb", "db_query_time_ms", "status_code"]
FEATURE_LEVEL = "level"

LEVEL_MAP = {"debug": 0, "info": 1, "warn": 2, "warning": 2, "error": 3, "fatal": 4}

EMAIL_SERVICE_URL = os.getenv("EMAIL_SERVICE_URL", "http://localhost:4000/v1/email/send")
SEND_EMAIL = os.getenv("ANOMALY_SEND_EMAIL", "1").strip().lower() not in {"0", "false", "no"}
MIN_INCIDENTS_TO_EMAIL = 1
EMAIL_COOLDOWN_SECONDS = int(os.getenv("ANOMALY_EMAIL_COOLDOWN_SECONDS", "1800"))
EMAIL_STATE_FILE = OUT_DIR / "email_state.json"
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


def save_incidents_with_history(payload):
    """
    Save incidents to both:
    1. incidents_latest.json (for dashboard quick access)
    2. incidents/incidents_TIMESTAMP.json (for historical tracking)
    
    Also performs cleanup to keep only the last 100 timestamped files.
    """
    timestamp = datetime.now().strftime("%Y-%m-%dT%H-%M-%S")
    
    # Create history directory if it doesn't exist
    OUT_INCIDENTS_HISTORY_DIR.mkdir(parents=True, exist_ok=True)
    
    # Save timestamped version (preserves history)
    timestamped_file = OUT_INCIDENTS_HISTORY_DIR / f"incidents_{timestamp}.json"
    timestamped_file.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"✅ Saved timestamped: {timestamped_file}")
    
    # Save latest version (for dashboard quick access - backward compatible)
    OUT_INCIDENTS_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"✅ Updated latest: {OUT_INCIDENTS_JSON}")
    
    # Cleanup old files (keep last 100)
    cleanup_old_incidents(keep=100)


def cleanup_old_incidents(keep=100):
    """
    Keep only the most recent N incident files to prevent disk space issues.
    """
    try:
        if not OUT_INCIDENTS_HISTORY_DIR.exists():
            return
        
        # Get all timestamped incident files
        files = sorted(
            [f for f in OUT_INCIDENTS_HISTORY_DIR.iterdir() 
             if f.name.startswith('incidents_') and f.name.endswith('.json')],
            key=lambda f: f.stat().st_mtime,
            reverse=True
        )
        
        # Remove old files beyond the keep limit
        for old_file in files[keep:]:
            old_file.unlink()
            print(f"🗑️  Cleaned up old file: {old_file.name}")
    except Exception as e:
        print(f"⚠️  Error during cleanup: {e}")


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

    print(f"📧 Sending incident email to: {EMAIL_SERVICE_URL}")
    r = requests.post(
        EMAIL_SERVICE_URL,
        json={"subject": subject, "text": text, "html": html},
        timeout=10
    )

    if r.status_code == 200:
        print("✅ Email sent automatically")
    else:
        print("❌ Email failed:", r.status_code, r.text)


def incident_email_signature(incident):
    events = incident.get("events", [])[:5] if isinstance(incident.get("events", []), list) else []
    return "::".join([
        str(incident.get("request_id", "")),
        str(incident.get("service", "")),
        str(incident.get("status_code", "")),
        str(incident.get("reason", "")),
        "|".join(events),
    ])


def load_email_state():
    if not EMAIL_STATE_FILE.exists():
        return {"last_sent_by_signature": {}}
    try:
        data = json.loads(EMAIL_STATE_FILE.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return {"last_sent_by_signature": {}}
        if not isinstance(data.get("last_sent_by_signature"), dict):
            data["last_sent_by_signature"] = {}
        return data
    except Exception:
        return {"last_sent_by_signature": {}}


def save_email_state(state):
    try:
        EMAIL_STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"⚠️  Failed to save email state: {e}")


def select_email_candidates(incidents):
    state = load_email_state()
    sent_map = state.setdefault("last_sent_by_signature", {})
    now_ts = int(datetime.now(timezone.utc).timestamp())
    sendable = []
    sendable_signatures = []
    suppressed = 0

    for incident in incidents:
        sig = incident_email_signature(incident)
        last_sent_ts = int(sent_map.get(sig, 0) or 0)
        if now_ts - last_sent_ts >= EMAIL_COOLDOWN_SECONDS:
            sendable.append(incident)
            sendable_signatures.append(sig)
        else:
            suppressed += 1

    return sendable, suppressed, sendable_signatures, state, now_ts


def mark_email_sent(state, sent_signatures, sent_ts):
    sent_map = state.setdefault("last_sent_by_signature", {})
    for sig in sent_signatures:
        sent_map[sig] = sent_ts

    # Keep state compact by pruning stale entries.
    prune_older_than = sent_ts - max(EMAIL_COOLDOWN_SECONDS * 48, 86400)
    stale_keys = [k for k, ts in sent_map.items() if int(ts or 0) < prune_older_than]
    for k in stale_keys:
        del sent_map[k]

    save_email_state(state)


def main(input_csv=DEFAULT_INPUT_CSV, model_path=DEFAULT_MODEL_PATH):
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Convert to Path objects for resolution
    input_path = Path(input_csv)
    model_file = Path(model_path)
    
    # Determine if we're in Docker or local environment
    is_docker = os.getenv("DOCKER_ENV") == "true" or Path("/app").exists()
    project_root = Path("/app") if is_docker else _script_path.parent.parent
    
    # Resolve paths to absolute for file operations
    if not input_path.is_absolute():
        input_path = project_root / input_path
    else:
        # If absolute path was provided, use it as-is
        pass
    
    if not model_file.is_absolute():
        model_file = project_root / model_file
    else:
        # If absolute path was provided, use it as-is
        pass
    
    # Convert absolute paths to relative paths for JSON output
    # This ensures the JSON always contains relative paths regardless of how the script was called
    try:
        if is_docker:
            # In Docker, convert /app/... to relative path
            if str(input_path).startswith("/app/"):
                input_csv_relative = str(input_path)[5:]  # Remove "/app/"
            elif str(input_path).startswith("/app"):
                input_csv_relative = str(input_path)[4:]  # Remove "/app"
            else:
                input_csv_relative = str(input_path.relative_to(project_root))
            
            if str(model_file).startswith("/app/"):
                model_path_relative = str(model_file)[5:]  # Remove "/app/"
            elif str(model_file).startswith("/app"):
                model_path_relative = str(model_file)[4:]  # Remove "/app"
            else:
                model_path_relative = str(model_file.relative_to(project_root))
        else:
            # In local dev, convert absolute path to relative from project root
            input_csv_relative = str(input_path.relative_to(project_root))
            model_path_relative = str(model_file.relative_to(project_root))
    except (ValueError, AttributeError):
        # Fallback: if we can't make it relative, use the original input
        # but normalize separators
        input_csv_relative = input_csv.replace("\\", "/")
        model_path_relative = model_path.replace("\\", "/")
        # Remove leading slashes and /app/ prefix if present
        if input_csv_relative.startswith("/app/"):
            input_csv_relative = input_csv_relative[5:]
        elif input_csv_relative.startswith("/"):
            input_csv_relative = input_csv_relative[1:]
        if model_path_relative.startswith("/app/"):
            model_path_relative = model_path_relative[5:]
        elif model_path_relative.startswith("/"):
            model_path_relative = model_path_relative[1:]

    # Normalize path separators
    input_csv_relative = input_csv_relative.replace("\\", "/")
    model_path_relative = model_path_relative.replace("\\", "/")

    # Debug logging for path resolution (helpful for troubleshooting)
    print(f"[DEBUG] Environment: {'Docker' if is_docker else 'Local'}")
    print(f"[DEBUG] Project root: {project_root}")
    print(f"[DEBUG] Input CSV - Original: {input_csv}, Absolute: {input_path}, Relative (for JSON): {input_csv_relative}")
    print(f"[DEBUG] Model path - Original: {model_path}, Absolute: {model_file}, Relative (for JSON): {model_path_relative}")

    if not input_path.exists():
        raise FileNotFoundError(f"Input CSV not found: {input_path}")
    if not model_file.exists():
        raise FileNotFoundError(f"Model file not found: {model_file}. Resolved from: {model_path}")

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

    # Ensure CSV column order matches expected output format:
    # service,request_id,level,event,status_code,generated_at,duration_ms,cpu_percent,memory_mb,db_query_time_ms,level_encoded,pred_anomaly_label,pred_anomaly_score
    # Get base columns in expected order, then add computed columns
    base_columns = ["service", "request_id", "level", "event", "status_code", "generated_at", 
                    "duration_ms", "cpu_percent", "memory_mb", "db_query_time_ms"]
    computed_columns = ["level_encoded", "pred_anomaly_label", "pred_anomaly_score"]
    
    # Build final column order: base columns (that exist) + any other columns + computed columns
    final_columns = []
    for col in base_columns:
        if col in df.columns:
            final_columns.append(col)
    
    # Add any other columns that aren't in base or computed lists
    for col in df.columns:
        if col not in base_columns and col not in computed_columns:
            final_columns.append(col)
    
    # Add computed columns at the end
    for col in computed_columns:
        if col in df.columns:
            final_columns.append(col)
    
    # Reorder dataframe to match expected column order
    df_output = df[final_columns] if final_columns else df
    
    df_output.to_csv(OUT_PRED_CSV, index=False)
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
        "input_csv": input_csv_relative,  # Use relative path for JSON output
        "model_path": model_path_relative,  # Use relative path for JSON output
        "total_rows": total,
        "predicted_anomaly_count": anomaly_count,
        "predicted_normal_count": total - anomaly_count,
        "predicted_anomaly_request_count": predicted_anomaly_requests,
        "incident_story": build_story(incidents),
        "incidents": incidents[:200],
    }

    # Save with history tracking (timestamp + cleanup)
    save_incidents_with_history(payload)

    # Email trigger with cooldown per incident signature.
    incidents_for_email = payload.get("incidents", [])
    if SEND_EMAIL and len(incidents_for_email) >= MIN_INCIDENTS_TO_EMAIL:
        sendable, suppressed, sendable_signatures, email_state, sent_ts = select_email_candidates(incidents_for_email)
        if sendable:
            email_payload = {
                **payload,
                "incidents": sendable,
                "incident_story": build_story(sendable),
            }
            try:
                send_incident_email(email_payload)
                mark_email_sent(email_state, sendable_signatures, sent_ts)
                if suppressed:
                    print(f"ℹ️ Email cooldown suppressed {suppressed} repeating incident(s)")
            except Exception as e:
                # Do not fail anomaly pipeline if email service is unavailable.
                print(f"⚠️ Email send skipped due to error: {e}")
        else:
            print(f"ℹ️ Email cooldown active: suppressed {suppressed} repeating incident(s)")
    elif not SEND_EMAIL:
        print("ℹ️ No email sent (ANOMALY_SEND_EMAIL disabled)")
    else:
        print("ℹ️ No email sent (no incidents)")

    return payload


if __name__ == "__main__":
    import sys
    inp = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT_CSV
    mdl = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_MODEL_PATH
    main(inp, mdl)
