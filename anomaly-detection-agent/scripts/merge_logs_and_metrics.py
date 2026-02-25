#!/usr/bin/env python3
import re
import csv
from pathlib import Path

LOG_CSV = "data/csv/log-requests.csv"
METRICS_CSV = "data/metrics/request_samples.csv"   
OUT_DIR = Path("data/merged")
OUT_ALL = OUT_DIR / "logs_with_metrics.csv"
OUT_MATCHES = OUT_DIR / "logs_with_metrics_only_matches.csv"

UUID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)

def is_uuid(x):
    if x is None:
        return False
    x = str(x).strip()
    return bool(UUID_RE.match(x))

def read_csv_rows(path: str):
    with open(path, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        return list(reader), (reader.fieldnames or [])

def normalize_columns(columns):
    return [c.strip() for c in columns]

def normalize_row(row):
    return {str(k).strip(): (v if v is not None else "") for k, v in row.items()}

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    logs_rows, logs_cols = read_csv_rows(LOG_CSV)
    metrics_rows, metrics_cols = read_csv_rows(METRICS_CSV)

    logs_cols = normalize_columns(logs_cols)
    metrics_cols = normalize_columns(metrics_cols)
    logs_rows = [normalize_row(r) for r in logs_rows]
    metrics_rows = [normalize_row(r) for r in metrics_rows]

    # Make sure required keys exist
    for col in ["service", "request_id"]:
        if col not in logs_cols:
            raise SystemExit(f"❌ logs missing column: {col}")
        if col not in metrics_cols:
            raise SystemExit(f"❌ metrics missing column: {col}")

    # Normalize and filter logs to UUID request ids.
    logs_filtered = []
    for row in logs_rows:
        row["service"] = str(row.get("service", "")).strip()
        row["request_id"] = str(row.get("request_id", "")).strip()
        if is_uuid(row["request_id"]):
            logs_filtered.append(row)

    # Normalize metrics and keep one latest row per (service, request_id).
    metrics_index = {}
    for row in metrics_rows:
        row["service"] = str(row.get("service", "")).strip()
        row["request_id"] = str(row.get("request_id", "")).strip()
        if not is_uuid(row["request_id"]):
            continue

        key = (row["service"], row["request_id"])
        current = metrics_index.get(key)
        if current is None:
            metrics_index[key] = row
            continue

        # Prefer newer metric by generated_at when present; else last seen.
        old_ts = current.get("generated_at", "")
        new_ts = row.get("generated_at", "")
        try:
            old_ts_num = float(old_ts)
        except Exception:
            old_ts_num = float("-inf")
        try:
            new_ts_num = float(new_ts)
        except Exception:
            new_ts_num = float("-inf")
        if new_ts_num >= old_ts_num:
            metrics_index[key] = row

    log_non_keys = [c for c in logs_cols if c not in {"service", "request_id"}]
    metric_non_keys = [c for c in metrics_cols if c not in {"service", "request_id"}]
    overlap = set(log_non_keys).intersection(metric_non_keys)

    output_fields = ["service", "request_id"]
    for c in log_non_keys:
        output_fields.append(f"{c}_log" if c in overlap else c)
    for c in metric_non_keys:
        output_fields.append(f"{c}_metric" if c in overlap else c)

    merged_rows = []
    only_matches_rows = []
    metric_value_cols = [c for c in ["cpu_percent", "memory_mb", "db_query_time_ms"] if c in metrics_cols]

    for log_row in logs_filtered:
        key = (log_row["service"], log_row["request_id"])
        metric_row = metrics_index.get(key, {})

        out = {"service": log_row["service"], "request_id": log_row["request_id"]}
        for c in log_non_keys:
            out[f"{c}_log" if c in overlap else c] = log_row.get(c, "")
        for c in metric_non_keys:
            out[f"{c}_metric" if c in overlap else c] = metric_row.get(c, "")

        merged_rows.append(out)

        if metric_value_cols:
            if any(str(metric_row.get(c, "")).strip() != "" for c in metric_value_cols):
                only_matches_rows.append(out)

    with open(OUT_ALL, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=output_fields)
        writer.writeheader()
        writer.writerows(merged_rows)

    with open(OUT_MATCHES, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=output_fields)
        writer.writeheader()
        writer.writerows(only_matches_rows)

    print(f"✅ Merged (all): {OUT_ALL}  rows={len(merged_rows)}")
    print(f"✅ Merged (only matches): {OUT_MATCHES}  rows={len(only_matches_rows)}")
    print(f"ℹ️  logs rows (UUID only): {len(logs_filtered)}")
    print(f"ℹ️  metrics rows (UUID deduped): {len(metrics_index)}")

if __name__ == "__main__":
    main()
