#!/usr/bin/env python3
import csv
import random
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATASET_PATH = (
    ROOT
    / "model_experiments"
    / "data"
    / "logs_with_metrics_only_matches_labeled_custom.csv.csv"
)
NEW_ROWS_TO_ADD = 1200


def to_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def to_int(value, default=0):
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return default


def generate_row(base_row):
    duration_ms = max(0.0, to_float(base_row.get("duration_ms")) + random.gauss(0, 1000))
    cpu_percent = min(200.0, max(0.0, to_float(base_row.get("cpu_percent")) + random.gauss(0, 10)))
    memory_mb = max(0.0, to_float(base_row.get("memory_mb")) + random.gauss(0, 50))
    db_query_time_ms = max(
        0.0, to_float(base_row.get("db_query_time_ms")) + random.gauss(0, 100)
    )
    status_code = random.choice([200, 304, 500, 502, 503, 504])

    anomaly_label = 0
    reasons = []
    if duration_ms >= 3000:
        reasons.append("duration_ms>=3000")
        anomaly_label = 1
    if cpu_percent >= 80:
        reasons.append("cpu>=80")
        anomaly_label = 1
    if db_query_time_ms >= 300:
        reasons.append("db_query_time_ms>=300")
        anomaly_label = 1
    if status_code >= 500:
        reasons.append("status_code>=500")
        anomaly_label = 1

    return {
        "request_id": str(uuid.uuid4()),
        "level": base_row.get("level", "info"),
        "service": base_row.get("service", "unknown"),
        "event": base_row.get("event", "unknown"),
        "generated_at": base_row.get("generated_at", ""),
        "duration_ms": f"{duration_ms:.2f}",
        "cpu_percent": f"{cpu_percent:.2f}",
        "memory_mb": f"{memory_mb:.2f}",
        "db_query_time_ms": f"{db_query_time_ms:.2f}",
        "status_code": str(status_code),
        "anomaly_label": str(anomaly_label),
        "anomaly_score": str(len(reasons)),
        "anomaly_reasons": ";".join(reasons) if reasons else "",
    }


def main():
    if not DATASET_PATH.exists():
        raise FileNotFoundError(f"Dataset file not found: {DATASET_PATH}")

    with DATASET_PATH.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        fieldnames = reader.fieldnames

    if not rows or not fieldnames:
        raise ValueError(f"Dataset file has no rows/headers: {DATASET_PATH}")

    new_rows = [generate_row(random.choice(rows)) for _ in range(NEW_ROWS_TO_ADD)]
    updated_rows = rows + new_rows

    with DATASET_PATH.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(updated_rows)

    print(f"Updated dataset with {NEW_ROWS_TO_ADD} additional rows.")
    print(f"Total rows now: {len(updated_rows)}")
    print(f"File: {DATASET_PATH}")


if __name__ == "__main__":
    main()
