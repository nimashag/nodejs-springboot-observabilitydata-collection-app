#!/usr/bin/env python3
import os, json
from datetime import datetime, timezone
from collections import defaultdict
import csv
import math

IN_JSONL = "data/processed/logs.jsonl"
OUT_DIR = "data/features"

def parse_ts(s):
    if not s:
        return None
    s = str(s).strip()
    # handle Z
    if s.endswith("Z"):
        s = s.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(s)
    except Exception:
        return None

def floor_bucket(dt: datetime, minutes: int):
    # dt is timezone-aware or naive; keep consistent
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    epoch = int(dt.timestamp())
    bucket = (epoch // (minutes * 60)) * (minutes * 60)
    return datetime.fromtimestamp(bucket, tz=timezone.utc)

def percentile(values, p):
    if not values:
        return 0.0
    values = sorted(values)
    k = (len(values) - 1) * p
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return float(values[int(k)])
    d0 = values[f] * (c - k)
    d1 = values[c] * (k - f)
    return float(d0 + d1)

def build_features(bucket_minutes: int):
    # (service, bucket) -> stats
    groups = defaultdict(lambda: {
        "total_logs": 0,
        "events": set(),
        "error_level_count": 0,

        "http_received": 0,
        "http_completed": 0,

        "status_present": 0,
        "duration_present": 0,

        "http_4xx": 0,
        "http_5xx": 0,

        "durations": [],
        "weak_label_anomaly": 0
    })

    total_rows = 0
    by_service = defaultdict(int)

    with open(IN_JSONL, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)

            total_rows += 1
            service = obj.get("service") or "unknown"
            by_service[service] += 1

            dt = parse_ts(obj.get("timestamp"))
            if not dt:
                continue
            b = floor_bucket(dt, bucket_minutes)

            key = (service, b)
            g = groups[key]

            g["total_logs"] += 1
            ev = obj.get("event")
            if ev:
                g["events"].add(ev)

            lvl = (obj.get("level") or "").upper()
            if lvl == "ERROR":
                g["error_level_count"] += 1

            event = obj.get("event") or ""
            if event == "http.request.received":
                g["http_received"] += 1
            if event == "http.request.completed":
                g["http_completed"] += 1

            status = obj.get("status_code")
            duration = obj.get("duration_ms")

            if status is not None:
                g["status_present"] += 1
                try:
                    s = int(status)
                    if 400 <= s <= 499:
                        g["http_4xx"] += 1
                    if 500 <= s <= 599:
                        g["http_5xx"] += 1
                except Exception:
                    pass

            if duration is not None:
                try:
                    d = float(duration)
                    g["duration_present"] += 1
                    g["durations"].append(d)
                except Exception:
                    pass

            # Weak label heuristic:
            # mark anomaly if we see 5xx OR ERROR level OR duration > 10s in that bucket
            if g["http_5xx"] > 0 or g["error_level_count"] > 0:
                g["weak_label_anomaly"] = 1
            if duration is not None:
                try:
                    if float(duration) >= 10000:
                        g["weak_label_anomaly"] = 1
                except:
                    pass

    # write CSV
    os.makedirs(OUT_DIR, exist_ok=True)
    out_path = os.path.join(OUT_DIR, f"features_{bucket_minutes}m.csv")

    headers = [
        "service", "bucket",
        "total_logs", "unique_events", "error_level_count",
        "http_received", "http_completed",
        "status_present", "duration_present",
        "http_4xx", "http_5xx",
        "duration_mean", "duration_p95", "duration_max",
        "error_rate", "http_4xx_rate", "http_5xx_rate",
        "weak_label_anomaly"
    ]

    rows = []
    for (service, bucket), g in sorted(groups.items(), key=lambda x: (x[0][0], x[0][1])):
        durations = g["durations"]
        dur_mean = (sum(durations) / len(durations)) if durations else 0.0
        dur_p95 = percentile(durations, 0.95) if durations else 0.0
        dur_max = max(durations) if durations else 0.0

        total = g["total_logs"] or 1  # avoid div/0
        http_completed = g["http_completed"] or 0

        error_rate = g["error_level_count"] / total
        http_4xx_rate = (g["http_4xx"] / http_completed) if http_completed else 0.0
        http_5xx_rate = (g["http_5xx"] / http_completed) if http_completed else 0.0

        rows.append({
            "service": service,
            "bucket": bucket.isoformat(),
            "total_logs": g["total_logs"],
            "unique_events": len(g["events"]),
            "error_level_count": g["error_level_count"],
            "http_received": g["http_received"],
            "http_completed": g["http_completed"],
            "status_present": g["status_present"],
            "duration_present": g["duration_present"],
            "http_4xx": g["http_4xx"],
            "http_5xx": g["http_5xx"],
            "duration_mean": round(dur_mean, 6),
            "duration_p95": round(dur_p95, 6),
            "duration_max": round(dur_max, 6),
            "error_rate": round(error_rate, 6),
            "http_4xx_rate": round(http_4xx_rate, 6),
            "http_5xx_rate": round(http_5xx_rate, 6),
            "weak_label_anomaly": g["weak_label_anomaly"]
        })

    with open(out_path, "w", newline="", encoding="utf-8") as csvfile:
        w = csv.DictWriter(csvfile, fieldnames=headers)
        w.writeheader()
        w.writerows(rows)

    print(f"Loaded rows: {total_rows}")
    print("Services:", dict(by_service))
    print(f"✅ Wrote {bucket_minutes}min features: {out_path}  (rows={len(rows)})")

def main():
    build_features(1)
    build_features(5)
    print("Done.")

if __name__ == "__main__":
    main()

