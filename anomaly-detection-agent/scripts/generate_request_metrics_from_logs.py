#create request-level metrics based on log data

#!/usr/bin/env python3
import csv
import random
from pathlib import Path

LOG_CSV = "data/csv/log-requests.csv"
OUT_METRICS = "data/metrics/request_metrics.csv"

Path("data/metrics").mkdir(parents=True, exist_ok=True)

def safe_float(x):
    try:
        if x is None:
            return None
        x = str(x).strip()
        if x == "" or x.lower() in {"na", "n/a", "null", "none"}:
            return None
        return float(x)
    except Exception:
        return None

def safe_int(x):
    try:
        if x is None:
            return None
        x = str(x).strip()
        if x == "" or x.lower() in {"na", "n/a", "null", "none"}:
            return None
        # handle "Pending" or other non-numeric
        if not x.isdigit():
            return None
        return int(x)
    except Exception:
        return None

def generate_metrics(duration_ms, status_code):
    # baseline normal values
    cpu = random.uniform(5, 35)
    mem = random.uniform(60, 180)
    db = random.uniform(5, 120)

    # anomaly patterns
    if duration_ms is not None and duration_ms > 1000:
        cpu += random.uniform(20, 60)
        db += random.uniform(80, 250)

    if status_code is not None and status_code >= 500:
        cpu += random.uniform(40, 80)
        mem += random.uniform(80, 250)
        db += random.uniform(100, 300)

    return round(cpu, 2), round(mem, 2), round(db, 2)

def main():
    rows = []

    with open(LOG_CSV, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            req_id = (r.get("request_id") or "").strip()
            service = (r.get("service") or "").strip()

            if not req_id or req_id.lower() == "system":
                continue

            duration = safe_float(r.get("duration_ms"))
            status = safe_int(r.get("status_code"))

            rows.append({
                "request_id": req_id,
                "service": service,
                "status_code": status,
                "duration_ms": duration
            })

    # OPTIONAL: choose only a subset per service for testing
    # comment this out if you want metrics for ALL requests
    per_service_limit = 200
    grouped = {}
    for r in rows:
        grouped.setdefault(r["service"], []).append(r)

    selected = []
    for svc, items in grouped.items():
        random.shuffle(items)
        selected.extend(items[:per_service_limit])

    with open(OUT_METRICS, "w", newline="", encoding="utf-8") as out:
        w = csv.writer(out)
        w.writerow([
            "request_id", "service", "status_code", "duration_ms",
            "cpu_percent", "memory_mb", "db_query_time_ms"
        ])

        for r in selected:
            cpu, mem, db = generate_metrics(r["duration_ms"], r["status_code"])
            w.writerow([
                r["request_id"], r["service"], r["status_code"], r["duration_ms"],
                cpu, mem, db
            ])

    print(f"✅ request-level metrics written: {OUT_METRICS}")
    print(f"Rows: {len(selected)} (limit per service={per_service_limit})")

if __name__ == "__main__":
    main()
