#!/usr/bin/env python3
import csv
import sys
from pathlib import Path

# Fix Windows console encoding for Unicode characters
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

IN_CSV = "data/merged/logs_with_metrics_only_matches.csv"   
OUT_CSV = "data/merged/logs_with_metrics_clean.csv"

Path("data/merged").mkdir(parents=True, exist_ok=True)

def main():
    with open(IN_CSV, "r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        columns = reader.fieldnames or []

    has_duration_log = "duration_ms_log" in columns
    has_duration_metric = "duration_ms_metric" in columns
    has_status_pair = "status_code_metric" in columns and "status_code_log" in columns

    cleaned_rows = []
    for row in rows:
        row = dict(row)

        if has_status_pair:
            metric_status = str(row.get("status_code_metric", "")).strip()
            log_status = str(row.get("status_code_log", "")).strip()
            row["status_code"] = metric_status if metric_status else log_status

        if has_duration_metric:
            row["duration_ms"] = row.get("duration_ms_metric", "")

        if has_duration_log:
            row.pop("duration_ms_log", None)
        if has_duration_metric:
            row.pop("duration_ms_metric", None)
        if has_status_pair:
            row.pop("status_code_metric", None)
            row.pop("status_code_log", None)

        cleaned_rows.append(row)

    output_columns = []
    for c in columns:
        if c == "duration_ms_log":
            continue
        if c == "duration_ms_metric":
            if "duration_ms" not in output_columns:
                output_columns.append("duration_ms")
            continue
        if c in {"status_code_metric", "status_code_log"}:
            if has_status_pair and "status_code" not in output_columns:
                output_columns.append("status_code")
            elif not has_status_pair:
                output_columns.append(c)
            continue
        if c not in output_columns:
            output_columns.append(c)

    with open(OUT_CSV, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=output_columns)
        writer.writeheader()
        writer.writerows(cleaned_rows)

    print("✅ duration_ms_log dropped" if has_duration_log else "⚠️ duration_ms_log column not found")
    print("✅ duration_ms_metric renamed to duration_ms" if has_duration_metric else "⚠️ duration_ms_metric column not found")
    if has_status_pair:
        print("✅ merged status_code_metric + status_code_log into status_code")
    print(f"📁 Clean file saved to: {OUT_CSV}")
    print("Columns now:", output_columns)

if __name__ == "__main__":
    main()
