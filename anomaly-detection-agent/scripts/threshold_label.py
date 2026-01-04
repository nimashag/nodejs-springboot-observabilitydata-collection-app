#threshold-based labeling of anomalies in merged log and metrics data for testing 1

#!/usr/bin/env python3
import csv
from pathlib import Path

INPUT_CSV = "data/merged/logs_with_metrics_clean.csv"
OUT_CSV = "data/merged/logs_with_metrics_only_matches_labeled.csv"

Path("data/merged").mkdir(parents=True, exist_ok=True)

# -----------------------------
# Thresholds (adjust for testing)
# -----------------------------
THRESHOLDS = {
    "duration_ms": 3000,        # slow request threshold (ms)
    "status_5xx": 500,          # >=500 is server error
    "cpu_percent": 80,          # high CPU %
    "memory_mb": 200,           # high memory MB
    "db_query_time_ms": 300,    # slow DB query ms
}

def to_float(x):
    try:
        if x is None:
            return None
        s = str(x).strip()
        if s == "" or s.lower() in {"na", "n/a", "null", "none"}:
            return None
        return float(s)
    except Exception:
        return None

def to_int(x):
    try:
        if x is None:
            return None
        s = str(x).strip()
        if s == "" or s.lower() in {"na", "n/a", "null", "none"}:
            return None
        # handle "Pending" or other text
        if not s.lstrip("-").isdigit():
            return None
        return int(s)
    except Exception:
        return None

def pick(row, *keys):
    """Return first non-empty value for provided keys."""
    for k in keys:
        v = row.get(k)
        if v is not None and str(v).strip() != "":
            return v
    return None

def main():
    with open(INPUT_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames or []

    # Detect column names (your merge uses metric_ prefix)
    col_request_id = "request_id" if "request_id" in fieldnames else "requestId"
    col_service = "service" if "service" in fieldnames else "svc"

    col_status = pick({k:k for k in fieldnames}, "status_code", "status", "metric_status_code") or "status_code"
    col_duration = pick({k:k for k in fieldnames}, "duration_ms", "durationMs", "metric_duration_ms") or "duration_ms"

    # metric columns
    col_cpu = pick({k:k for k in fieldnames}, "metric_cpu_percent", "cpu_percent") or "metric_cpu_percent"
    col_mem = pick({k:k for k in fieldnames}, "metric_memory_mb", "memory_mb") or "metric_memory_mb"
    col_db = pick({k:k for k in fieldnames}, "metric_db_query_time_ms", "db_query_time_ms") or "metric_db_query_time_ms"

    out_fields = fieldnames + ["anomaly_label", "anomaly_score", "anomaly_reasons"]

    total = 0
    anomalies = 0
    by_reason = {}
    by_service = {}

    labeled = []

    for row in rows:
        total += 1

        service = (row.get(col_service) or "unknown").strip()
        by_service.setdefault(service, {"total": 0, "anomalies": 0})
        by_service[service]["total"] += 1

        status = to_int(row.get(col_status))
        duration = to_float(row.get(col_duration))
        cpu = to_float(row.get(col_cpu))
        mem = to_float(row.get(col_mem))
        db = to_float(row.get(col_db))

        reasons = []

        # Rules
        if duration is not None and duration >= THRESHOLDS["duration_ms"]:
            reasons.append(f"duration_ms>={THRESHOLDS['duration_ms']}")

        if status is not None and status >= THRESHOLDS["status_5xx"]:
            reasons.append("status>=500")

        if cpu is not None and cpu >= THRESHOLDS["cpu_percent"]:
            reasons.append(f"cpu>={THRESHOLDS['cpu_percent']}")

        if mem is not None and mem >= THRESHOLDS["memory_mb"]:
            reasons.append(f"memory>={THRESHOLDS['memory_mb']}")

        if db is not None and db >= THRESHOLDS["db_query_time_ms"]:
            reasons.append(f"db_query_time_ms>={THRESHOLDS['db_query_time_ms']}")

        anomaly_score = len(reasons)
        anomaly_label = 1 if anomaly_score > 0 else 0

        if anomaly_label == 1:
            anomalies += 1
            by_service[service]["anomalies"] += 1
            for r in reasons:
                by_reason[r] = by_reason.get(r, 0) + 1

        row["anomaly_label"] = anomaly_label
        row["anomaly_score"] = anomaly_score
        row["anomaly_reasons"] = ";".join(reasons) if reasons else ""
        labeled.append(row)

    with open(OUT_CSV, "w", newline="", encoding="utf-8") as out:
        w = csv.DictWriter(out, fieldnames=out_fields)
        w.writeheader()
        w.writerows(labeled)

    print(f"✅ Labeled output written: {OUT_CSV}")
    print(f"Total rows: {total}")
    print(f"Anomalies: {anomalies} ({(anomalies/total*100 if total else 0):.2f}%)")

    print("\nTop reasons:")
    for r, c in sorted(by_reason.items(), key=lambda x: x[1], reverse=True)[:10]:
        print(f"  {r}: {c}")

    print("\nBy service:")
    for svc, stats in by_service.items():
        print(f"  {svc}: {stats['anomalies']}/{stats['total']} anomalies")

if __name__ == "__main__":
    main()
