#!/usr/bin/env python3
from __future__ import annotations

import json
import csv
import os
import sys
import argparse
from pathlib import Path

# Fix Windows console encoding for Unicode characters
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

RAW_LOGS_DIR = Path("data/raw/logs")
INPUT_FILE = None
OUTPUT_FILE = "data/csv/log-requests.csv"

FIELDS = [
    "request_id",
    "level",
    "service",
    "event",
    "status_code",
    "duration_ms"
]

def resolve_input_file(input_file: str | None) -> Path:
    if input_file:
        path = Path(input_file)
        if not path.exists():
            raise SystemExit(f"❌ Input file not found: {path}")
        return path

    if not RAW_LOGS_DIR.exists():
        raise SystemExit(f"❌ Raw logs directory not found: {RAW_LOGS_DIR}")

    candidates = sorted(RAW_LOGS_DIR.glob("aggregated-*.jsonl"))
    if not candidates:
        raise SystemExit(f"❌ No aggregated log files found in: {RAW_LOGS_DIR}")

    # Newest file by modified time (works for both dated and timestamped filenames).
    return max(candidates, key=lambda p: p.stat().st_mtime)

def main():
    parser = argparse.ArgumentParser(description="Convert latest aggregated JSONL logs into CSV.")
    parser.add_argument(
        "--input",
        default=INPUT_FILE,
        help="Optional input JSONL file. If omitted, newest data/raw/logs/aggregated-*.jsonl is used.",
    )
    parser.add_argument(
        "--output",
        default=OUTPUT_FILE,
        help=f"Output CSV path (default: {OUTPUT_FILE})",
    )
    args = parser.parse_args()

    input_file = resolve_input_file(args.input)
    output_file = Path(args.output)

    os.makedirs(output_file.parent, exist_ok=True)

    total = written = skipped = 0

    with open(input_file, "r", encoding="utf-8", errors="ignore") as fin, \
         open(output_file, "w", newline="", encoding="utf-8") as fout:

        writer = csv.DictWriter(fout, fieldnames=FIELDS)
        writer.writeheader()

        for line in fin:
            total += 1
            line = line.strip()
            if not line:
                continue

            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                skipped += 1
                continue

            metadata = obj.get("metadata", {}) if isinstance(obj.get("metadata"), dict) else {}

            row = {
                "request_id": obj.get("requestId") or obj.get("request_id"),
                "level": obj.get("level"),
                "service": obj.get("service"),
                "event": obj.get("event"),
                "status_code": metadata.get("status") or obj.get("status_code"),
                "duration_ms": (
                    metadata.get("durationMs")
                    or obj.get("duration_ms")
                    or obj.get("latency_ms")
                )
            }

            writer.writerow(row)
            written += 1

    print("✅ Source JSONL:", input_file)
    print("✅ CSV written:", output_file)
    print(f"Lines read={total} | written={written} | skipped={skipped}")

if __name__ == "__main__":
    main()
