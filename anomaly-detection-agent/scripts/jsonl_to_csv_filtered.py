#!/usr/bin/env python3
import json
import csv
import os

INPUT_FILE = "data/raw/logs/aggregated-2026-01-02.jsonl"
OUTPUT_FILE = "data/csv/log-requests.csv"

FIELDS = [
    "request_id",
    "level",
    "service",
    "event",
    "status_code",
    "duration_ms"
]

def main():
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    total = written = skipped = 0

    with open(INPUT_FILE, "r", encoding="utf-8", errors="ignore") as fin, \
         open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as fout:

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

    print("✅ CSV written:", OUTPUT_FILE)
    print(f"Lines read={total} | written={written} | skipped={skipped}")

if __name__ == "__main__":
    main()
