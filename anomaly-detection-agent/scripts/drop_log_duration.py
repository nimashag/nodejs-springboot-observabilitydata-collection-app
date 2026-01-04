#!/usr/bin/env python3
import pandas as pd
from pathlib import Path

IN_CSV = "data/merged/logs_with_metrics_only_matches.csv"   # change if your input is different
OUT_CSV = "data/merged/logs_with_metrics_clean.csv"

Path("data/merged").mkdir(parents=True, exist_ok=True)

def main():
    df = pd.read_csv(IN_CSV)

    # Drop log duration column (actual name in your csv)
    if "duration_ms_log" in df.columns:
        df = df.drop(columns=["duration_ms_log"])
        print("✅ duration_ms_log dropped")
    else:
        print("⚠️ duration_ms_log column not found")

    # Rename metric duration -> duration_ms
    if "duration_ms_metric" in df.columns:
        df = df.rename(columns={"duration_ms_metric": "duration_ms"})
        print("✅ duration_ms_metric renamed to duration_ms")
    else:
        print("⚠️ duration_ms_metric column not found")

    # (Optional) clean status_code if you want ONLY ONE status_code column:
    # keep metric status if available else log status
    if "status_code_metric" in df.columns and "status_code_log" in df.columns:
        df["status_code"] = df["status_code_metric"].fillna(df["status_code_log"])
        df = df.drop(columns=["status_code_metric", "status_code_log"])
        print("✅ merged status_code_metric + status_code_log into status_code")

    df.to_csv(OUT_CSV, index=False)
    print(f"📁 Clean file saved to: {OUT_CSV}")
    print("Columns now:", list(df.columns))

if __name__ == "__main__":
    main()
