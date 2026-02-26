# ml/scripts/generate_routes_unlabeled.py
# Generates ml/data/routes_unlabeled.csv with 500+ rows

import os
import csv
import random
import re

OUT_FILE = os.path.join("ml", "data", "routes_unlabeled.csv")

# --- seeds / fake ids (for expanding templates) ---
MONGO_IDS = [
    "000000000000000000000001",
    "111111111111111111111111",
    "6956e136502d3f4b674e4341",
    "694103c1eb5047e453c93212",
]
TOKENS = ["abc123", "xyz789", "test123", "id123"]

def expand_path(path: str):
    """
    Expand :id, :restaurantId, :deliveryId, :itemId into multiple variants.
    """
    variants = [path]
    # replace any :param with ids/tokens
    if ":" in path:
        new_vars = []
        for v in variants:
            # replace all params one by one
            params = re.findall(r":[A-Za-z_]\w*", v)
            if not params:
                new_vars.append(v)
                continue
            # replace each param with a few options
            pool = MONGO_IDS + TOKENS
            for _ in range(6):
                vv = v
                for p in params:
                    vv = vv.replace(p, random.choice(pool))
                new_vars.append(vv)
        variants = list(dict.fromkeys(new_vars))  # unique, preserve order
    return variants

def add_rows(rows, service, methods, base_path):
    for m in methods:
        for p in expand_path(base_path):
            rows.append((service, m, p))

def main():
    rows = []

    # --- ORDERS ---
    add_rows(rows, "orders-service", ["GET"], "/api/orders")
    add_rows(rows, "orders-service", ["POST"], "/api/orders")
    add_rows(rows, "orders-service", ["GET"], "/api/orders/:id")
    add_rows(rows, "orders-service", ["PUT"], "/api/orders/:id")
    add_rows(rows, "orders-service", ["PATCH"], "/api/orders/:id/delivery-address")
    add_rows(rows, "orders-service", ["PATCH"], "/api/orders/:id/special-instructions")
    add_rows(rows, "orders-service", ["PATCH"], "/api/orders/:id/status")
    add_rows(rows, "orders-service", ["PATCH"], "/api/orders/:id/mark-paid")
    add_rows(rows, "orders-service", ["GET"], "/api/orders/restaurant/:restaurantId")
    add_rows(rows, "orders-service", ["POST"], "/api/orders/create-payment-intent")
    add_rows(rows, "orders-service", ["POST"], "/api/orders/webhook")

    # --- RESTAURANTS ---
    add_rows(rows, "restaurants-service", ["GET"], "/api/restaurants")
    add_rows(rows, "restaurants-service", ["POST"], "/api/restaurants")
    add_rows(rows, "restaurants-service", ["GET"], "/api/restaurants/my")
    add_rows(rows, "restaurants-service", ["GET"], "/api/restaurants/:id")
    add_rows(rows, "restaurants-service", ["PUT"], "/api/restaurants/:id")
    add_rows(rows, "restaurants-service", ["DELETE"], "/api/restaurants/:id")
    add_rows(rows, "restaurants-service", ["PATCH"], "/api/restaurants/:id/availability")
    add_rows(rows, "restaurants-service", ["POST"], "/api/restaurants/:id/menu-items")
    add_rows(rows, "restaurants-service", ["GET"], "/api/restaurants/my/menu-items")
    add_rows(rows, "restaurants-service", ["GET"], "/api/restaurants/:id/menu-items")
    add_rows(rows, "restaurants-service", ["GET"], "/api/restaurants/:id/menu-items/:itemId")
    add_rows(rows, "restaurants-service", ["PUT"], "/api/restaurants/:id/menu-items/:itemId")
    add_rows(rows, "restaurants-service", ["DELETE"], "/api/restaurants/:id/menu-items/:itemId")
    add_rows(rows, "restaurants-service", ["GET"], "/api/restaurants/debug/fail")

    # --- DELIVERY ---
    add_rows(rows, "delivery-service", ["POST"], "/api/delivery/assign")
    add_rows(rows, "delivery-service", ["POST"], "/api/delivery/respond")
    add_rows(rows, "delivery-service", ["GET"], "/api/delivery/assigned-orders")
    add_rows(rows, "delivery-service", ["GET"], "/api/delivery/my-deliveries")
    add_rows(rows, "delivery-service", ["PATCH"], "/api/delivery/delivery/:deliveryId/status")

    # --- USERS (minimal, add more if you have more endpoints) ---
    add_rows(rows, "users-service", ["GET"], "/telemetry")
    add_rows(rows, "users-service", ["GET"], "/api/users")
    add_rows(rows, "users-service", ["POST"], "/api/users")
    add_rows(rows, "users-service", ["GET"], "/api/users/:id")
    add_rows(rows, "users-service", ["PUT"], "/api/users/:id")

    # ---- ensure 500+ by duplicating + shuffling + minor variations ----
    random.shuffle(rows)
    while len(rows) < 600:
        rows.extend(rows[:200])
        random.shuffle(rows)

    rows = rows[:600]

    os.makedirs(os.path.dirname(OUT_FILE), exist_ok=True)
    with open(OUT_FILE, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["service", "method", "path"])
        w.writerows(rows)

    print(f"Saved: {OUT_FILE} ({len(rows)} rows)")

if __name__ == "__main__":
    main()
