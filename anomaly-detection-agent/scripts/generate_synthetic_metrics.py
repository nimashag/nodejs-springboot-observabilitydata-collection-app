#!/usr/bin/env python3
import csv
import json
import random
from pathlib import Path

LOG_CSV = "data/csv/log-requests.csv"
OUT_METRICS = "data/metrics/request_metrics.csv"

Path("data/metrics").mkdir(parents=True, exist_ok=True)

def generate_metrics(duration, status):
    """
    Generate realistic synthetic metrics based on request behavior
    """
    cpu = random.uniform(5, 30)
    mem = random.uniform(50, 150)
    db_time = random.uniform(10, 200)
    io_wait = random.uniform(1, 20)
    threads = random.randint(10, 60)
    gc_pause = random.uniform(0, 10)

    # Inject anomaly patterns
    if duration and duration > 1000:
        cpu += random.uniform(30, 60)
        db_time += random.uniform(200, 500)
        io_wait += random.uniform(20, 60)

    if status and status >= 500:
        cpu += random.uniform(40, 80)
        mem += random.uniform(100, 300)
        gc_pause += random.uniform(50, 200)

    return {
        "cpu_percent": round(cpu, 2),
        "memory_mb": round(mem, 2),
        "db_query_time_ms": round(db_time, 2),
        "io_wait_ms": round(io_wait, 2),
        "thread_count": threads,
        "gc_pause_ms": round(gc_pause, 2)
    }

written = 0

with open(LOG_CSV, "r", encoding="utf-8") as f, \
     open(OUT_METRICS, "w", newline="", encoding="utf-8") as out:

    reader = csv.DictReader(f)
    writer = csv.writer(out)

    writer.writerow([
        "request_id",
        "cpu_percent",
        "memory_mb",
        "db_query_time_ms",
        "io_wait_ms",
        "thread_count",
        "gc_pause_ms"
    ])

    for row in reader:
        req_id = row.get("request_id")
        duration = float(row["duration_ms"]) if row.get("duration_ms") else None
        status = int(row["status_code"]) if row.get("status_code") else None

        metrics = generate_metrics(duration, status)

        writer.writerow([
            req_id,
            metrics["cpu_percent"],
            metrics["memory_mb"],
            metrics["db_query_time_ms"],
            metrics["io_wait_ms"],
            metrics["thread_count"],
            metrics["gc_pause_ms"]
        ])

        written += 1

print(f"✅ Synthetic metrics generated: {written} rows")
print(f"📁 Output: {OUT_METRICS}")
