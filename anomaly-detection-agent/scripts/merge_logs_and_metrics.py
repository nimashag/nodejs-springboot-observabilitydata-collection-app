#!/usr/bin/env python3
import re
import pandas as pd
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

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    logs = pd.read_csv(LOG_CSV)
    metrics = pd.read_csv(METRICS_CSV)

    # normalize column names if needed
    logs.columns = [c.strip() for c in logs.columns]
    metrics.columns = [c.strip() for c in metrics.columns]

    # Make sure required keys exist
    for col in ["service", "request_id"]:
        if col not in logs.columns:
            raise SystemExit(f"❌ logs missing column: {col}")
        if col not in metrics.columns:
            raise SystemExit(f"❌ metrics missing column: {col}")

    # Filter logs to only real request UUIDs (removes "system", blanks, etc.)
    logs["request_id"] = logs["request_id"].astype(str).str.strip()
    logs = logs[logs["request_id"].apply(is_uuid)].copy()

    # Merge on (service, request_id)
    merged = logs.merge(
        metrics,
        on=["service", "request_id"],
        how="left",
        suffixes=("_log", "_metric")
    )

    # Save "all logs with metrics when available"
    merged.to_csv(OUT_ALL, index=False)

    # Save only rows where metrics exist (cpu_percent present)
    metric_cols = [c for c in ["cpu_percent", "memory_mb", "db_query_time_ms"] if c in merged.columns]
    if metric_cols:
        only_matches = merged.dropna(subset=metric_cols, how="all")
    else:
        only_matches = merged.iloc[0:0]  # empty if metrics columns missing

    only_matches.to_csv(OUT_MATCHES, index=False)

    print(f"✅ Merged (all): {OUT_ALL}  rows={len(merged)}")
    print(f"✅ Merged (only matches): {OUT_MATCHES}  rows={len(only_matches)}")

if __name__ == "__main__":
    main()
