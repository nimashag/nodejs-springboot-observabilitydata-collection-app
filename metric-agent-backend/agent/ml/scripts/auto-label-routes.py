import os
import pandas as pd

IN_PATH = os.path.join("ml", "data", "routes_augmented.csv")
OUT_PATH = os.path.join("ml", "data", "routes_labeled.csv")

def label_row(service: str, method: str, path: str) -> str:
    service = str(service)
    method = str(method).upper()
    path = str(path)

    # special cases first
    if "/error" in path:
        return "generic_error"
    if "/debug/fail" in path:
        return "debug_failure"

    # domain by service
    if service == "orders-service":
        base = "orders"
    elif service == "restaurants-service":
        base = "restaurants"
    elif service == "delivery-service":
        base = "delivery"
    elif service == "users-service":
        base = "users"
    else:
        base = "unknown"

    # intent by method
    if method == "GET":
        return f"{base}_read"
    else:
        return f"{base}_write"

def main():
    if not os.path.exists(IN_PATH):
        raise FileNotFoundError(f"Missing input file: {IN_PATH}")

    df = pd.read_csv(IN_PATH)

    required = {"service", "method", "path"}
    if not required.issubset(df.columns):
        raise ValueError(f"CSV must contain columns: {sorted(required)}")

    df["label"] = df.apply(lambda r: label_row(r["service"], r["method"], r["path"]), axis=1)

    # Save
    df.to_csv(OUT_PATH, index=False)

    # quick summary
    print(f"Saved: {OUT_PATH}")
    print("\nLabel counts:")
    print(df["label"].value_counts().to_string())

if __name__ == "__main__":
    main()
