# ml/scripts/predict_route_labels.py
# Reads:  ml/data/routes_unlabeled.csv
# Writes: ml/outputs/routes_predicted.csv

import os
import re
import json
import pandas as pd
from joblib import load

ARTIFACT = os.path.join("ml", "artifacts", "route_classifier.joblib")
IN_FILE  = os.path.join("ml", "data", "routes_unlabeled.csv")
OUT_DIR  = os.path.join("ml", "outputs")
OUT_FILE = os.path.join(OUT_DIR, "routes_predicted.csv")

# ---- Path normalization (same idea as training) ----
ID_PATTERNS = [
    (re.compile(r"/\d+"), "/:num"),
    (re.compile(r"/[0-9a-fA-F]{24}"), "/:id"),     # mongo ObjectId
    (re.compile(r"/[0-9a-fA-F-]{36}"), "/:uuid"),  # uuid
]

KEYWORD_MASK = [
    # IMPORTANT: keep these broad so model generalizes
    (re.compile(r"menu-items"), ":kw"),
    (re.compile(r"availability"), ":kw"),
    (re.compile(r"status"), ":kw"),
    (re.compile(r"assign"), ":kw"),
    (re.compile(r"respond"), ":kw"),
    (re.compile(r"webhook"), ":kw"),
    (re.compile(r"payment"), ":kw"),
    (re.compile(r"restaurant"), ":kw"),
    (re.compile(r"delivery"), ":kw"),
]

def normalize_path(path: str) -> str:
    p = str(path).strip()
    p = p.split("?")[0]  # drop query
    # apply id patterns
    for rx, rep in ID_PATTERNS:
        p = rx.sub(rep, p)
    # mask keywords
    for rx, rep in KEYWORD_MASK:
        p = rx.sub(rep, p)
    return p

def main():
    if not os.path.exists(ARTIFACT):
        raise SystemExit(f"Missing model artifact: {ARTIFACT}")

    if not os.path.exists(IN_FILE):
        raise SystemExit(f"Missing input CSV: {IN_FILE}")

    os.makedirs(OUT_DIR, exist_ok=True)

    model = load(ARTIFACT)  # pipeline: vectorizer + classifier

    df = pd.read_csv(IN_FILE)

    required = {"service", "method", "path"}
    if not required.issubset(df.columns):
        raise SystemExit(f"{IN_FILE} must contain columns: service,method,path")

    df["path_norm"] = df["path"].apply(normalize_path)
    df["text"] = df["method"].astype(str).str.upper() + " " + df["path_norm"].astype(str)

    # predictions
    preds = model.predict(df["text"])

    # confidence (if classifier supports predict_proba)
    conf = None
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(df["text"])
        conf = proba.max(axis=1)

    out = df[["service", "method", "path", "path_norm"]].copy()
    out["predicted_label"] = preds
    if conf is not None:
        out["confidence"] = (conf * 100).round(2)

    out.to_csv(OUT_FILE, index=False)
    print(f"Saved: {OUT_FILE}")
    print(out.head(10).to_string(index=False))

if __name__ == "__main__":
    main()
