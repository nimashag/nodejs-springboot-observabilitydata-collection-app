#!/usr/bin/env python3
import json
import joblib
import pandas as pd
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime

# ---------------- CONFIG ----------------
# Input testing dataset (you can change this when running)
DEFAULT_INPUT_CSV = "data/test/logs_test.csv"

# Your trained Random Forest model path (adjust if your file name differs)
# Example: model_experiments/models/random_forest/rf_model.pkl
DEFAULT_MODEL_PATH = "model_experiments/models/random_forest/rf_model.pkl"

# Outputs
OUT_DIR = Path("outputs")
OUT_PRED_CSV = OUT_DIR / "predictions_latest.csv"
OUT_INCIDENTS_JSON = OUT_DIR / "incidents_latest.json"

# Features we use for RF (numeric + simple encoding)
FEATURES_NUMERIC = ["duration_ms", "cpu_percent", "memory_mb", "db_query_time_ms", "status_code"]
FEATURE_LEVEL = "level"

LEVEL_MAP = {
    "debug": 0,
    "info": 1,
    "warn": 2,
    "warning": 2,
    "error": 3,
    "fatal": 4
}

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
        return 1
    return LEVEL_MAP.get(level_str.strip().lower(), 1)


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


def main(input_csv=DEFAULT_INPUT_CSV, model_path=DEFAULT_MODEL_PATH):
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    input_path = Path(input_csv)
    model_file = Path(model_path)

    if not input_path.exists():
        raise FileNotFoundError(f"Input CSV not found: {input_path}")

    if not model_file.exists():
        raise FileNotFoundError(f"Model file not found: {model_file}")

    # Load data
    df = pd.read_csv(input_path)
    df.columns = [c.strip() for c in df.columns]

    # Ensure required columns exist (fill if missing)
    for c in FEATURES_NUMERIC:
        if c not in df.columns:
            df[c] = 0
    if FEATURE_LEVEL not in df.columns:
        df[FEATURE_LEVEL] = "info"

    # Clean / convert
    df["level_encoded"] = df["level"].apply(encode_level)

    df["duration_ms"] = df["duration_ms"].apply(safe_float)
    df["cpu_percent"] = df["cpu_percent"].apply(safe_float)
    df["memory_mb"] = df["memory_mb"].apply(safe_float)
    df["db_query_time_ms"] = df["db_query_time_ms"].apply(safe_float)
    df["status_code"] = df["status_code"].apply(safe_int)

    X = df[FEATURES_NUMERIC].copy()
    X["level_encoded"] = df["level_encoded"]

    # Load model
    model = joblib.load(model_file)

    # Predict
    # anomaly_label: 1 = anomaly, 0 = normal
    y_pred = model.predict(X)

    # Probability of class 1 if available
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)[:, 1]
    else:
        # fallback (no proba): treat predicted label as score
        proba = y_pred.astype(float)

    df["pred_anomaly_label"] = y_pred
    df["pred_anomaly_score"] = proba.round(4)

    # Terminal stats
    anomaly_count = int(df["pred_anomaly_label"].sum())
    total = len(df)
    print(f"✅ Loaded rows: {total}")
    print(f"🚨 Predicted anomalies: {anomaly_count}")
    print(f"🟢 Predicted normals  : {total - anomaly_count}")

    # Save prediction CSV
    df.to_csv(OUT_PRED_CSV, index=False)
    print(f"📁 Saved predictions CSV: {OUT_PRED_CSV}")

    # -------- Build incidents grouped by request_id --------
    incidents = []
    if "request_id" not in df.columns:
        # If request_id missing, treat each row as separate incident id
        df["request_id"] = [f"row-{i}" for i in range(len(df))]

    # group events by request_id
    grouped = defaultdict(list)
    for _, row in df.iterrows():
        grouped[str(row["request_id"])].append(row)

    for request_id, rows in grouped.items():
        # Decide anomaly for the request: if any row is anomalous
        max_score = max(float(r["pred_anomaly_score"]) for r in rows)
        any_anom = any(int(r["pred_anomaly_label"]) == 1 for r in rows)

        if not any_anom:
            continue

        # Most common service/event; choose first non-empty
        service = ""
        events = []
        status_code = 0

        svc_counter = Counter()
        ev_counter = Counter()

        for r in rows:
            svc_counter[str(r.get("service", ""))] += 1
            ev_counter[str(r.get("event", ""))] += 1
            status_code = max(status_code, safe_int(r.get("status_code", 0)))

        service = svc_counter.most_common(1)[0][0] if svc_counter else "unknown"
        events = [e for e, _ in ev_counter.most_common(10) if e and e != "nan"]

        # Simple “reasons” text (optional)
        # If your dataset already has anomaly_reasons column, pick the most common
        reason = ""
        if "anomaly_reasons" in df.columns:
            rc = Counter([str(r.get("anomaly_reasons", "")).strip() for r in rows if str(r.get("anomaly_reasons", "")).strip()])
            reason = rc.most_common(1)[0][0] if rc else ""
        else:
            # fallback heuristic
            reason_parts = []
            # pick max row values for context
            mx_duration = max(float(r.get("duration_ms", 0)) for r in rows)
            mx_cpu = max(float(r.get("cpu_percent", 0)) for r in rows)
            mx_db = max(float(r.get("db_query_time_ms", 0)) for r in rows)
            if mx_duration >= 3000: reason_parts.append("duration_ms>=3000")
            if mx_cpu >= 80: reason_parts.append("cpu>=80")
            if mx_db >= 300: reason_parts.append("db_query_time_ms>=300")
            if status_code >= 500: reason_parts.append("status_code>=500")
            reason = ";".join(reason_parts)

        incidents.append({
            "request_id": request_id,
            "service": service,
            "status_code": status_code,
            "max_anomaly_score": round(max_score, 4),
            "events": events,
            "reason": reason,
            "row_count": len(rows),
        })

    # Sort incidents by score descending
    incidents = sorted(incidents, key=lambda x: x["max_anomaly_score"], reverse=True)

    story = build_story(incidents)

    payload = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "input_csv": str(input_path),
        "model_path": str(model_file),
        "total_rows": total,
        "predicted_anomaly_count": anomaly_count,
        "predicted_normal_count": total - anomaly_count,
        "incident_story": story,
        "incidents": incidents[:200],  # keep top 200
    }

    OUT_INCIDENTS_JSON.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"📁 Saved incidents JSON: {OUT_INCIDENTS_JSON}")


if __name__ == "__main__":
    # Optional: allow running with custom paths
    # python3 scripts/rf_predict_incidents.py data/test/logs_test.csv model_experiments/models/random_forest/rf_model.pkl
    import sys
    inp = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_INPUT_CSV
    mdl = sys.argv[2] if len(sys.argv) > 2 else DEFAULT_MODEL_PATH
    main(inp, mdl)
