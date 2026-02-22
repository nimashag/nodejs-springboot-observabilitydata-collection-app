#!/usr/bin/env python3
import json
import csv
from pathlib import Path

# Correct input path 
INPUT_JSON = "data/raw/metrics/service_request_metrics.json"

# Outputs
OUT_DIR = Path("data/metrics")
OUT_SNAPSHOT = OUT_DIR / "service_snapshot.csv"
OUT_ROUTES = OUT_DIR / "service_routes.csv"

OUT_DIR.mkdir(parents=True, exist_ok=True)

def safe_get(d, key, default=None):
    return d.get(key, default) if isinstance(d, dict) else default

def main():
    # Load JSON
    with open(INPUT_JSON, "r", encoding="utf-8") as f:
        data = json.load(f)

    generated_at = data.get("generated_at")
    services = data.get("services", [])

    # --- CSV 1: service snapshot ---
    with open(OUT_SNAPSHOT, "w", newline="", encoding="utf-8") as out1:
        w1 = csv.writer(out1)
        w1.writerow([
            "generated_at",
            "service",
            "total_requests",
            "total_errors",
            "avg_latency_ms",
            "rss_mb",
            "heap_used_mb",
            "heap_used_mb_java",
            "has_error"
        ])

        for s in services:
            service_name = s.get("service")
            snap = s.get("snapshot") or {}
            err = s.get("error")

            w1.writerow([
                generated_at,
                service_name,
                snap.get("total_requests"),
                snap.get("total_errors"),
                snap.get("avg_latency_ms"),
                snap.get("rss_mb"),
                snap.get("heap_used_mb"),
                snap.get("heap_used_mb_java"),
                1 if err else 0
            ])

    # --- CSV 2: routes ---
    with open(OUT_ROUTES, "w", newline="", encoding="utf-8") as out2:
        w2 = csv.writer(out2)
        w2.writerow([
            "generated_at",
            "service",
            "route_type",      # top_routes / slow_routes / error_routes
            "route",
            "count",
            "errors",
            "avg_latency_ms"
        ])

        for s in services:
            service_name = s.get("service")
            discovered = s.get("discovered") or {}

            for route_type in ["top_routes", "slow_routes", "error_routes"]:
                routes = discovered.get(route_type) or []
                for r in routes:
                    w2.writerow([
                        generated_at,
                        service_name,
                        route_type,
                        r.get("route"),
                        r.get("count"),
                        r.get("errors"),
                        r.get("avg_latency_ms")
                    ])

    print(f"✅ Snapshot CSV written: {OUT_SNAPSHOT}")
    print(f"✅ Routes CSV written: {OUT_ROUTES}")

if __name__ == "__main__":
    main()
