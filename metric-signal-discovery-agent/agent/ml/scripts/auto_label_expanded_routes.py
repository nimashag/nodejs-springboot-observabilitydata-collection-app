import pandas as pd
from pathlib import Path

IN_FILE = Path("ml/data/routes_expanded.csv")
OUT_FILE = Path("ml/data/routes_labeled.csv")

df = pd.read_csv(IN_FILE)

# Your target labels (as in your screenshot)
LABELS = {
    "generic_api",
    "payments",
    "external_callback",
    "state_transition",
    "dispatch_workflow",
    "catalog_ops",
    "availability_ops",
    "identity_profile",
}

def label_route(row):
    service = str(row["service"])
    method = str(row["method"]).upper()
    path = str(row["path"])

    p = path.lower()

    # ---- Global patterns first (strong signals) ----
    # external callback hooks / webhooks
    if "/webhook" in p or "/callback" in p:
        return "external_callback"

    # payments-related endpoints
    if "payment" in p or "stripe" in p:
        return "payments"

    # state transition endpoints (status changes, mark-paid, etc.)
    # (PATCH is common here)
    if "/status" in p or "mark-paid" in p:
        return "state_transition"

    # ---- Service/domain-aware rules ----
    # Delivery workflow actions
    if service == "delivery-service":
        if "/assign" in p or "/respond" in p or "/assigned-orders" in p or "/my-deliveries" in p:
            return "dispatch_workflow"
        if "/delivery/" in p and "/status" in p:
            return "state_transition"
        # fallback
        return "generic_api"

    # Restaurants catalog ops (menu items, create/update/delete)
    if service == "restaurants-service":
        if "/menu-items" in p:
            # menu ops are catalog operations
            if method in ["POST", "PUT", "PATCH", "DELETE"]:
                return "catalog_ops"
            return "generic_api"
        if "/availability" in p:
            return "availability_ops"
        # create/update/delete restaurant resource => catalog-ish ops
        if method in ["POST", "PUT", "PATCH", "DELETE"]:
            return "catalog_ops"
        return "generic_api"

    # Orders service
    if service == "orders-service":
        if "/create-payment-intent" in p:
            return "payments"
        if "/status" in p:
            return "state_transition"
        # order create/update/delete are operational flows; keep generic unless state transition/payment
        return "generic_api"

    # Users service (you'll add real user routes later; for now classify user-ish paths)
    if service == "users-service":
        if "/me" in p or "/register" in p or "/login" in p or "/profile" in p or "/users" in p:
            return "identity_profile"
        if "/error" in p:
            return "generic_api"
        return "generic_api"

    return "generic_api"


df["label"] = df.apply(label_route, axis=1)

# sanity check: ensure only allowed labels
bad = set(df["label"].unique()) - LABELS
if bad:
    raise RuntimeError(f"Found unexpected labels: {bad}")

OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(OUT_FILE, index=False)

print(f"Saved labeled dataset to {OUT_FILE}")
print("\nLabel distribution:")
print(df["label"].value_counts())
