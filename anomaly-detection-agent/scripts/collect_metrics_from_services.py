#!/usr/bin/env python3
"""
Collect metrics.jsonl from each service into anomaly-detection-agent/data/raw/metrics/
"""

import json
import csv
import os
import time
from pathlib import Path

# Determine project root - handle both local dev and Docker environments
_script_path = Path(__file__).resolve()
if os.getenv("DOCKER_ENV") == "true" or Path("/app").exists():
    # In Docker, working directory is /app
    PROJECT_ROOT = Path("/app")
    OUTPUT_DIR_RAW = Path("/app/data/raw/metrics")
    OUTPUT_JSONL = OUTPUT_DIR_RAW / 'combined_metrics.jsonl'
    OUTPUT_CSV = Path("/app/data/metrics/request_samples.csv")
else:
    # Local development - use relative path from script
    PROJECT_ROOT = _script_path.parent.parent.parent
    OUTPUT_DIR_RAW = PROJECT_ROOT / 'anomaly-detection-agent' / 'data' / 'raw' / 'metrics'
    OUTPUT_JSONL = OUTPUT_DIR_RAW / 'combined_metrics.jsonl'
    OUTPUT_CSV = PROJECT_ROOT / 'anomaly-detection-agent' / 'data' / 'metrics' / 'request_samples.csv'

SERVICES = [
    'orders-service',
    'restaurants-service',
    'delivery-service',
    'users-service',
]


def collect_metrics():
    """Collect metrics from all services into one place."""
    OUTPUT_DIR_RAW.mkdir(parents=True, exist_ok=True)
    OUTPUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    generated_at = int(time.time() * 1000)
    all_metrics = []

    for service_name in SERVICES:
        metrics_file = PROJECT_ROOT / service_name / 'metrics' / 'metrics.jsonl'

        if not metrics_file.exists():
            continue

        try:
            with open(metrics_file, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        all_metrics.append(data)
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            print(f"⚠️  Error reading {metrics_file}: {e}")

    # Write combined JSONL
    with open(OUTPUT_JSONL, 'w', encoding='utf-8') as f:
        for m in all_metrics:
            f.write(json.dumps(m) + '\n')

    # Write CSV (request_samples format)
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=[
            'generated_at', 'service', 'request_id', 'status_code',
            'duration_ms', 'cpu_percent', 'memory_mb', 'db_query_time_ms'
        ])
        writer.writeheader()
        for m in all_metrics:
            http = m.get('http', {})
            timing = m.get('timing', {})
            metrics = m.get('metrics', {})
            writer.writerow({
                'generated_at': generated_at,
                'service': m.get('service', ''),
                'request_id': m.get('request_id', ''),
                'status_code': http.get('status_code', 0),
                'duration_ms': timing.get('duration_ms', 0.0),
                'cpu_percent': metrics.get('cpu_percent', 0.0),
                'memory_mb': metrics.get('rss_mb', 0.0),
                'db_query_time_ms': metrics.get('db_query_time_ms', 0.0),
            })

    print(f"✅ Collected {len(all_metrics)} metrics")
    print(f"   JSONL: {OUTPUT_JSONL}")
    print(f"   CSV:   {OUTPUT_CSV}")


if __name__ == '__main__':
    collect_metrics()
