#!/usr/bin/env python3
import os
import glob
import json
import hashlib
from datetime import datetime

RAW_GLOB = "data/raw/logs/*.jsonl"
OUT_JSONL = "data/processed/logs.jsonl"
REPORT_JSON = "outputs/convert_report.json"

# Standard schema (keep stable)
SCHEMA_KEYS = [
    "timestamp", "service", "level", "event",
    "request_id", "session_id",
    "method", "path",
    "status_code", "duration_ms",
    "error_message", "error_type", "stacktrace_hash"
]

def to_iso(ts):
    """
    Try best-effort to normalize timestamp into ISO string.
    If it's already ISO-like, keep it.
    """
    if ts is None:
        return None
    s = str(ts).strip()

    # If already looks ISO, return
    if "T" in s:
        return s

    # Handle "YYYY-MM-DD HH:MM:SS.mmm" (spring style)
    # Example: 2025-12-27 12:03:41.029
    try:
        dt = datetime.strptime(s, "%Y-%m-%d %H:%M:%S.%f")
        return dt.isoformat()
    except Exception:
        pass

    # Handle "YYYY-MM-DD HH:MM:SS"
    try:
        dt = datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
        return dt.isoformat()
    except Exception:
        pass

    return s  # fallback

def safe_int(x):
    if x is None:
        return None
    try:
        return int(x)
    except Exception:
        return None

def safe_float(x):
    if x is None:
        return None
    try:
        return float(x)
    except Exception:
        return None

def hash_stack(stack):
    if not stack:
        return None
    h = hashlib.sha256(stack.encode("utf-8", errors="ignore")).hexdigest()
    return h[:12]

def normalize_log(obj, fallback_service=None):
    """
    Accepts a dict (parsed JSON from aggregated log).
    Returns normalized dict with fixed schema.
    """

    # Try common field names from different services/loggers
    ts = obj.get("timestamp") or obj.get("ts") or obj.get("@timestamp") or obj.get("time")
    service = obj.get("service") or obj.get("svc") or obj.get("app") or fallback_service
    level = obj.get("level") or obj.get("lvl") or obj.get("severity")
    event = obj.get("event") or obj.get("ev") or obj.get("message_type") or obj.get("msgType")

    # context can hold request/session ids etc.
    ctx = obj.get("ctx") if isinstance(obj.get("ctx"), dict) else {}
    request_id = obj.get("request_id") or obj.get("requestId") or ctx.get("requestId") or ctx.get("request_id")
    session_id = obj.get("session_id") or obj.get("sessionId") or ctx.get("sessionId") or ctx.get("session_id")

    method = obj.get("method") or ctx.get("method")
    path = obj.get("path") or obj.get("route") or ctx.get("path")

    status_code = obj.get("status_code") or obj.get("status") or ctx.get("status_code") or ctx.get("status")
    duration_ms = obj.get("duration_ms") or obj.get("durationMs") or obj.get("latency_ms") or ctx.get("durationMs")

    # error info
    error_message = obj.get("error_message") or obj.get("errorMessage") or obj.get("err") or obj.get("message")
    error_type = obj.get("error_type") or obj.get("errorType") or obj.get("exception") or obj.get("name")

    # stack or trace
    stack = obj.get("stack") or obj.get("stacktrace") or obj.get("trace")
    stacktrace_hash = obj.get("stacktrace_hash") or hash_stack(stack)

    norm = {
        "timestamp": to_iso(ts),
        "service": service,
        "level": (str(level).upper() if level else None),
        "event": event,
        "request_id": request_id,
        "session_id": session_id,
        "method": method,
        "path": path,
        "status_code": safe_int(status_code),
        "duration_ms": safe_float(duration_ms),
        "error_message": error_message if error_message not in [None, ""] else None,
        "error_type": error_type if error_type not in [None, ""] else None,
        "stacktrace_hash": stacktrace_hash
    }

    # Guarantee all schema keys exist
    for k in SCHEMA_KEYS:
        if k not in norm:
            norm[k] = None

    return norm

def main():
    files = sorted(glob.glob(RAW_GLOB))
    if not files:
        raise SystemExit(f"❌ No raw files found: {RAW_GLOB}")

    os.makedirs(os.path.dirname(OUT_JSONL), exist_ok=True)
    os.makedirs(os.path.dirname(REPORT_JSON), exist_ok=True)

    report = {
        "raw_glob": RAW_GLOB,
        "files": files,
        "total_lines": 0,
        "written": 0,
        "skipped_invalid_json": 0,
        "skipped_not_object": 0,
        "by_service_written": {},
        "by_service_skipped": {},
    }

    with open(OUT_JSONL, "w", encoding="utf-8") as out:
        for fp in files:
            # try infer fallback service name from filename
            base = os.path.basename(fp)
            fallback_service = None
            if base.startswith("aggregated-"):
                fallback_service = None

            with open(fp, "r", encoding="utf-8", errors="ignore") as f:
                for line in f:
                    report["total_lines"] += 1
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        obj = json.loads(line)
                    except Exception:
                        report["skipped_invalid_json"] += 1
                        continue

                    if not isinstance(obj, dict):
                        report["skipped_not_object"] += 1
                        continue

                    norm = normalize_log(obj, fallback_service=fallback_service)

                    svc = norm.get("service") or "unknown"
                    report["written"] += 1
                    report["by_service_written"][svc] = report["by_service_written"].get(svc, 0) + 1

                    out.write(json.dumps(norm, ensure_ascii=False) + "\n")

    # write report
    with open(REPORT_JSON, "w", encoding="utf-8") as r:
        json.dump(report, r, indent=2)

    print(f"✅ Processed JSONL written: {OUT_JSONL}")
    print(f"✅ Report written: {REPORT_JSON}")
    print(f"Lines total={report['total_lines']} | written={report['written']} | invalid_json={report['skipped_invalid_json']} | not_object={report['skipped_not_object']}")
    print("By service written:", report["by_service_written"])

if __name__ == "__main__":
    main()

