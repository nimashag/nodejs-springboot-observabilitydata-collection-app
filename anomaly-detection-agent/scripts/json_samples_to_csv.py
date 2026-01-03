#!/usr/bin/env python3
import json
import csv
from pathlib import Path

INPUT_JSON = "data/raw/metrics/service_request_metrics_with_samples.json"
OUT_CSV = "data/metrics/request_samples.csv"

Path("data/metrics").mkdir(parents=True, exist_ok=True)

def main():
    with open(INPUT_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    generated_at = data.get("generated_at")
    services = data.get("services", [])

    rows_written = 0

    with open(OUT_CSV, "w", newline="", encoding="utf-8") as out:
        writer = csv.writer(out)

        # Header (column names)
        writer.writerow([
            "generated_at",
            "service",
            "request_id",
            "status_code",
            "duration_ms",
            "cpu_percent",
            "memory_mb",
            "db_query_time_ms"
        ])

        for s in services:
            service_name = s.get("service")
            samples = s.get("request_samples") or []

            for sample in samples:
                metrics = sample.get("metrics") or {}

                writer.writerow([
                    generated_at,
                    service_name,
                    sample.get("request_id"),
                    sample.get("status_code"),
                    sample.get("duration_ms"),
                    metrics.get("cpu_percent"),
                    metrics.get("memory_mb"),
                    metrics.get("db_query_time_ms"),
                ])
                rows_written += 1

    print(f"✅ CSV written: {OUT_CSV}")
    print(f"Rows written: {rows_written}")

if __name__ == "__main__":
    main()
