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

# Fix encoding for Windows console
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


# Determine ROOT - handle both local dev and Docker environments
_script_path = Path(__file__).resolve()
if os.getenv("DOCKER_ENV") == "true" or Path("/app").exists():
    # In Docker, working directory is /app
    ROOT = Path("/app")
else:
    # Local development - use relative path from script
    ROOT = _script_path.parents[1]

# Use 'python' on Windows, 'python3' on Unix-like systems
PYTHON_CMD = "python" if sys.platform == "win32" else "python3"


def run_step(cmd: list[str]) -> None:
    print(f"▶ {' '.join(cmd)}")
    subprocess.run(cmd, cwd=ROOT, check=True)


def run_once(model_path: str, with_threshold_label: bool) -> None:
    run_step([PYTHON_CMD, "scripts/collect_logs_from_aggregation.py"])
    run_step([PYTHON_CMD, "scripts/collect_metrics_from_services.py"])
    run_step([PYTHON_CMD, "scripts/jsonl_to_csv_filtered.py"])
    run_step([PYTHON_CMD, "scripts/merge_logs_and_metrics.py"])
    run_step([PYTHON_CMD, "scripts/drop_log_duration.py"])

    if with_threshold_label:
        run_step([PYTHON_CMD, "scripts/threshold_label.py"])

    # Resolve paths to absolute if in Docker
    input_csv = "data/merged/logs_with_metrics_clean.csv"
    if os.getenv("DOCKER_ENV") == "true" or Path("/app").exists():
        input_csv = str(ROOT / input_csv)
        if not Path(model_path).is_absolute():
            model_path = str(ROOT / model_path)

    run_step([
        PYTHON_CMD,
        "scripts/rf_predict_incidents.py",
        input_csv,
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
    # Set default model path based on environment
    default_model = "model_experiments/models/random_forest/rf_model.pkl"
    if os.getenv("DOCKER_ENV") == "true" or Path("/app").exists():
        default_model = str(ROOT / default_model)
    
    parser.add_argument(
        "--model",
        default=default_model,
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
