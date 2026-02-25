#!/usr/bin/env python3
"""
Run anomaly pipeline continuously:
1) Sync logs
2) Collect metrics
3) Build log CSV from latest aggregated JSONL
4) Merge logs + metrics
5) Clean merged file
6) Optional threshold labeling
7) Predict incidents with RF model
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def run_step(cmd: list[str]) -> None:
    print(f"▶ {' '.join(cmd)}")
    subprocess.run(cmd, cwd=ROOT, check=True)


def run_once(model_path: str, with_threshold_label: bool) -> None:
    run_step(["python", "scripts/collect_logs_from_aggregation.py"])
    run_step(["python", "scripts/collect_metrics_from_services.py"])
    run_step(["python", "scripts/jsonl_to_csv_filtered.py"])
    run_step(["python", "scripts/merge_logs_and_metrics.py"])
    run_step(["python", "scripts/drop_log_duration.py"])

    if with_threshold_label:
        run_step(["python", "scripts/threshold_label.py"])

    run_step([
        "python",
        "scripts/rf_predict_incidents.py",
        "data/merged/logs_with_metrics_clean.csv",
        model_path,
    ])


def main() -> None:
    parser = argparse.ArgumentParser(description="Continuously run log+metrics anomaly pipeline.")
    parser.add_argument(
        "--interval",
        type=int,
        default=2,
        help="Loop interval in seconds (default: 2)",
    )
    parser.add_argument(
        "--model",
        default="model_experiments/models/random_forest/rf_model.pkl",
        help="Path to trained RF model",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Run pipeline once and exit",
    )
    parser.add_argument(
        "--no-threshold-label",
        action="store_true",
        help="Skip threshold_label.py step",
    )
    args = parser.parse_args()

    interval = max(1, args.interval)
    with_threshold_label = not args.no_threshold_label

    print("🚀 Starting anomaly pipeline")
    print(f"   root={ROOT}")
    print(f"   interval={interval}s")
    print(f"   model={args.model}")
    print(f"   threshold_label={'on' if with_threshold_label else 'off'}")
    print(f"   email_enabled={os.getenv('ANOMALY_SEND_EMAIL', '1')}")

    while True:
        started = time.time()
        try:
            run_once(model_path=args.model, with_threshold_label=with_threshold_label)
            print("✅ Pipeline cycle complete")
        except subprocess.CalledProcessError as e:
            print(f"❌ Pipeline step failed: {e}", file=sys.stderr)
        except Exception as e:
            print(f"❌ Unexpected pipeline error: {e}", file=sys.stderr)

        if args.once:
            break

        elapsed = time.time() - started
        sleep_for = max(0.0, interval - elapsed)
        print(f"⏱️ sleeping {sleep_for:.2f}s\n")
        time.sleep(sleep_for)


if __name__ == "__main__":
    main()
