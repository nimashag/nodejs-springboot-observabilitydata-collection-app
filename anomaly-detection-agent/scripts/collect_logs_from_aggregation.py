#!/usr/bin/env python3
"""
Sync aggregated logs from log-aggregation-service into anomaly-detection-agent/data/raw/logs.

Usage:
  python3 scripts/collect_logs_from_aggregation.py
  python3 scripts/collect_logs_from_aggregation.py --watch --interval 5
"""

from __future__ import annotations

import argparse
import shutil
import sys
import time
from pathlib import Path

# Fix encoding for Windows console
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = PROJECT_ROOT / "log-aggregation-service" / "aggregated-logs"
DEST_DIR = PROJECT_ROOT / "anomaly-detection-agent" / "data" / "raw" / "logs"


def should_copy(src: Path, dst: Path) -> bool:
    if not dst.exists():
        return True
    src_stat = src.stat()
    dst_stat = dst.stat()
    return (src_stat.st_size != dst_stat.st_size) or (int(src_stat.st_mtime) > int(dst_stat.st_mtime))


def sync_once() -> tuple[int, int, int]:
    DEST_DIR.mkdir(parents=True, exist_ok=True)

    if not SOURCE_DIR.exists():
        raise SystemExit(f"❌ Source directory not found: {SOURCE_DIR}")

    copied = 0
    skipped = 0
    total = 0

    for src in sorted(SOURCE_DIR.glob("*.jsonl")):
        total += 1
        dst = DEST_DIR / src.name
        if should_copy(src, dst):
            shutil.copy2(src, dst)
            copied += 1
        else:
            skipped += 1

    return total, copied, skipped


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync aggregated logs into anomaly raw logs directory.")
    parser.add_argument("--watch", action="store_true", help="Keep syncing in a loop.")
    parser.add_argument("--interval", type=int, default=10, help="Watch interval in seconds (default: 10).")
    args = parser.parse_args()

    while True:
        total, copied, skipped = sync_once()
        print(f"✅ Synced logs: total={total} copied={copied} up_to_date={skipped}")
        print(f"   from: {SOURCE_DIR}")
        print(f"   to:   {DEST_DIR}")

        if not args.watch:
            break
        time.sleep(max(1, args.interval))


if __name__ == "__main__":
    main()
