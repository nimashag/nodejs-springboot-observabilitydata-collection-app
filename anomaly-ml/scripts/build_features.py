#!/usr/bin/env python3
import os
import json
import hashlib
from datetime import timezone

import numpy as np
import pandas as pd


BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PROCESSED_LOGS = os.path.join(BASE_DIR, "data", "processed", "logs.jsonl")
OUT_DIR = os.path.join(BASE_DIR, "data", "features")
os.makedirs(OUT_DIR, exist_ok=True)


def read_jsonl(path: str) -> pd.DataFrame:
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception:
                # skip invalid JSON lines
                continue
    df = pd.DataFrame(rows)

    # Ensure columns exist (safe defaults)
    for c in [
        "timestamp","service","level","event","request_id","session_id",
        "method","path","status_code","duration_ms",
        "error_message","error_type","stacktrace_hash"
    ]:
        if c not in df.columns:
            df[c] = None

    # Parse timestamp to UTC-aware datetime
    # Handles: "2025-12-30T14:06:37.790+05:30", "2025-12-30T08:35:21.459Z", "2025-12-27 12:03:41.029"
    df["timestamp_dt"] = pd.to_datetime(df["timestamp"], errors="coerce", utc=True)

    # Basic cleaning
    df["service"] = df["service"].fillna("unknown-service")
    df["level"] = df["level"].fillna("UNKNOWN").astype(str).str.upper()
    df["event"] = df["event"].fillna("unknown.event")

    # Numerics
    df["status_code"] = pd.to_numeric(df["status_code"], errors="coerce")
    df["duration_ms"] = pd.to_numeric(df["duration_ms"], errors="coerce")

    # Flags
    df["is_error_level"] = (df["level"] == "ERROR").astype(int)
    df["is_http_completed"] = (df["event"] == "http.request.completed").astype(int)
    df["is_http_received"] = (df["event"] == "http.request.received").astype(int)
    df["is_5xx"] = ((df["status_code"] >= 500) & (df["status_code"] < 600)).fillna(False).astype(int)
    df["is_4xx"] = ((df["status_code"] >= 400) & (df["status_code"] < 500)).fillna(False).astype(int)

    # Keep only rows with valid timestamps
    df = df[df["timestamp_dt"].notna()].copy()
    return df


def build_window_features(df: pd.DataFrame, window: str = "1min") -> pd.DataFrame:
    """
    Converts raw logs into time-window aggregated numeric features per service.
    window examples: '1min', '5min'
    """
    # Create a time bucket
    df["bucket"] = df["timestamp_dt"].dt.floor(window)

    # Useful derived columns
    df["has_duration"] = df["duration_ms"].notna().astype(int)
    df["has_status"] = df["status_code"].notna().astype(int)
    df["event_name"] = df["event"].astype(str)

    # Group per service + time bucket
    g = df.groupby(["service", "bucket"], as_index=False)

    # Aggregate metrics (core)
    features = g.agg(
        total_logs=("event_name", "count"),
        unique_events=("event_name", pd.Series.nunique),

        error_level_count=("is_error_level", "sum"),

        http_received=("is_http_received", "sum"),
        http_completed=("is_http_completed", "sum"),

        status_present=("has_status", "sum"),
        duration_present=("has_duration", "sum"),

        http_4xx=("is_4xx", "sum"),
        http_5xx=("is_5xx", "sum"),

        duration_mean=("duration_ms", "mean"),
        duration_p95=("duration_ms", lambda x: np.nanpercentile(x.dropna(), 95) if x.notna().any() else np.nan),
        duration_max=("duration_ms", "max"),
    )

    # Fill NaNs for durations where missing
    for c in ["duration_mean", "duration_p95", "duration_max"]:
        features[c] = features[c].fillna(0.0)

    # Ratios (safe)
    features["error_rate"] = features["error_level_count"] / features["total_logs"].replace(0, np.nan)
    features["http_4xx_rate"] = features["http_4xx"] / features["http_completed"].replace(0, np.nan)
    features["http_5xx_rate"] = features["http_5xx"] / features["http_completed"].replace(0, np.nan)
    features = features.fillna(0.0)

    # Optional: simple label for evaluation (NOT real ground truth)
    # If a window has any 5xx or ERROR logs => label=1 (anomalous-ish), else 0
    features["weak_label_anomaly"] = ((features["http_5xx"] > 0) | (features["error_level_count"] > 0)).astype(int)

    # Sort
    features = features.sort_values(["service", "bucket"]).reset_index(drop=True)
    return features


def main():
    if not os.path.exists(PROCESSED_LOGS):
        raise FileNotFoundError(f"Missing processed logs file: {PROCESSED_LOGS}")

    df = read_jsonl(PROCESSED_LOGS)
    print(f"Loaded rows: {len(df)}")
    print("Services:", df["service"].value_counts().to_dict())

    # Build 1-min and 5-min window features (good for demos)
    for window, out_name in [("1min", "features_1m.csv"), ("5min", "features_5m.csv")]:
        feats = build_window_features(df, window=window)
        out_path = os.path.join(OUT_DIR, out_name)
        feats.to_csv(out_path, index=False)
        print(f"✅ Wrote {window} features: {out_path}  (rows={len(feats)})")

    print("Done.")


if __name__ == "__main__":
    main()
