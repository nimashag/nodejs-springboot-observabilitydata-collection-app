import csv
import random
from pathlib import Path

SEED_FILE = Path("ml/data/routes_seed.csv")
OUT_FILE = Path("ml/data/routes_expanded.csv")

# realistic ID pools
IDS = [
    "000000000000000000000001",
    "111111111111111111111111",
    "abc123",
    "xyz789",
    "9f8a7b6c5d",
    "order_001",
    "order_002",
    "rest_001",
    "menu_001",
]

RESTAURANT_IDS = ["rest_001", "rest_002", "rest_003"]
DELIVERY_IDS = ["del_001", "del_002", "del_003"]
ITEM_IDS = ["item_001", "item_002", "item_003"]

EXPANSION_FACTOR = 25  # controls size (25 × ~25 routes ≈ 625 rows)

def expand_path(path):
    variants = [path]

    if ":id" in path:
        variants = [path.replace(":id", i) for i in IDS]

    if ":restaurantId" in path:
        variants = [path.replace(":restaurantId", i) for i in RESTAURANT_IDS]

    if ":deliveryId" in path:
        variants = [path.replace(":deliveryId", i) for i in DELIVERY_IDS]

    if ":itemId" in path:
        variants = [path.replace(":itemId", i) for i in ITEM_IDS]

    return variants


rows = []

with SEED_FILE.open() as f:
    reader = csv.DictReader(f)
    seed_rows = list(reader)

for _ in range(EXPANSION_FACTOR):
    for row in seed_rows:
        expanded_paths = expand_path(row["path"])
        for p in expanded_paths:
            rows.append({
                "service": row["service"],
                "method": row["method"],
                "path": p
            })

OUT_FILE.parent.mkdir(parents=True, exist_ok=True)

with OUT_FILE.open("w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["service", "method", "path"])
    writer.writeheader()
    writer.writerows(rows)

print(f"Saved {len(rows)} routes to {OUT_FILE}")
