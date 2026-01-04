import json
import re
from pathlib import Path

import joblib
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, f1_score, confusion_matrix
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import Pipeline

DATA_FILE = Path("ml/data/routes_labeled.csv")
MODEL_OUT = Path("ml/artifacts/route_classifier.joblib")
REPORT_OUT = Path("ml/artifacts/training_report.json")

df = pd.read_csv(DATA_FILE)

# --------- Normalize IDs so patterns don't leak ----------
UUID = re.compile(r"/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.IGNORECASE)
HEX_24 = re.compile(r"/[a-f0-9]{24}\b", re.IGNORECASE)       # mongodb objectId
HEX_ANY = re.compile(r"/[a-f0-9]{8,}\b", re.IGNORECASE)      # generic hex-ish
NUM = re.compile(r"/\d+\b")                                  # numeric ids

def normalize_path(p: str) -> str:
    p = str(p).lower()
    p = UUID.sub("/:uuid", p)
    p = HEX_24.sub("/:id", p)
    p = HEX_ANY.sub("/:hex", p)
    p = NUM.sub("/:num", p)
    return p

df["template"] = df["path"].apply(normalize_path)

# --------- Mask "giveaway" keywords (reduces leakage) ----------
# These are the terms that currently make labels trivial.
GIVEAWAY = [
    "menu-items", "menuitems", "availability",
    "webhook", "callback", "create-payment-intent", "payment", "payments",
    "assign", "respond", "assigned-orders", "my-deliveries", "delivery",
    "status", "mark-paid",
    "uploads", "image",
    "auth", "login", "register", "token", "profile", "me",
    "debug", "fail",
]

# Compile regex that replaces whole path segments containing these tokens
# e.g., /menu-items -> /:kw, /create-payment-intent -> /:kw
GIVEAWAY_RE = re.compile(r"(?:^|/)(?:" + "|".join(map(re.escape, GIVEAWAY)) + r")(?:/|$)")

def mask_giveaway_tokens(path_template: str) -> str:
    # Replace any segment matching giveaway words with /:kw
    # Keep slashes stable
    p = path_template
    # Repeat until no more matches (handles multiple occurrences)
    while True:
        m = GIVEAWAY_RE.search(p)
        if not m:
            break
        start, end = m.span()
        # Preserve leading "/" if present in match
        seg = p[start:end]
        # seg could be "/menu-items/" or "/menu-items" or "menu-items/"
        # We replace the inner token segment with "/:kw/"
        # Normalize to single "/:kw" segment
        replacement = "/:kw/"
        # Avoid double slashes
        p = (p[:start] + replacement + p[end:]).replace("//", "/")
    # Remove trailing slash for stability
    if p.endswith("/") and p != "/":
        p = p[:-1]
    return p

df["masked_template"] = df["template"].apply(mask_giveaway_tokens)

# ✅ Features: method + masked route (NO service name)
df["text"] = df["method"].astype(str).str.upper() + " " + df["masked_template"].astype(str)

X = df["text"]
y = df["label"]
groups = df["template"]  # group by original template so variants stay together

# --------- Group split (prevents train/test template leakage) ----------
gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
train_idx, test_idx = next(gss.split(X, y, groups=groups))

X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]

pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(
        ngram_range=(1, 2),
        max_features=12000,
        lowercase=True
    )),
    ("clf", LogisticRegression(
        max_iter=3000,
        class_weight="balanced"
    ))
])

pipeline.fit(X_train, y_train)
y_pred = pipeline.predict(X_test)

acc = accuracy_score(y_test, y_pred)
macro_f1 = f1_score(y_test, y_pred, average="macro")
weighted_f1 = f1_score(y_test, y_pred, average="weighted")

labels_sorted = sorted(df["label"].unique().tolist())
cm = confusion_matrix(y_test, y_pred, labels=labels_sorted)

MODEL_OUT.parent.mkdir(parents=True, exist_ok=True)
joblib.dump(pipeline, MODEL_OUT)

REPORT_OUT.parent.mkdir(parents=True, exist_ok=True)
with open(REPORT_OUT, "w", encoding="utf-8") as f:
    json.dump({
        "samples": int(len(df)),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "unique_templates_total": int(df["template"].nunique()),
        "unique_templates_train": int(df.iloc[train_idx]["template"].nunique()),
        "unique_templates_test": int(df.iloc[test_idx]["template"].nunique()),
        "accuracy": float(acc),
        "macro_f1": float(macro_f1),
        "weighted_f1": float(weighted_f1),
        "notes": (
            "Evaluation uses group split by route templates (prevents leakage). "
            "Training text masks common 'giveaway' keywords (webhook/menu-items/status/etc.) "
            "so classifier must generalize beyond obvious tokens."
        ),
        "giveaway_tokens_masked": GIVEAWAY,
        "classification_report": classification_report(y_test, y_pred, output_dict=True, zero_division=0),
        "confusion_matrix": {"labels": labels_sorted, "matrix": cm.tolist()},
    }, f, indent=2)

print("\n Route Classifier Trained (Masked Keywords + Group Split)")
print(f"Samples: {len(df)}")
print(f"Train: {len(X_train)} | Test: {len(X_test)}")
print(f"Templates total: {df['template'].nunique()} | Train: {df.iloc[train_idx]['template'].nunique()} | Test: {df.iloc[test_idx]['template'].nunique()}")
print(f"Accuracy: {acc:.4f}")
print(f"Macro F1: {macro_f1:.4f}")
print(f"Weighted F1: {weighted_f1:.4f}")
print("\nClassification Report:")
print(classification_report(y_test, y_pred, zero_division=0))
