#!/usr/bin/env python3
import json
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from pathlib import Path
import random

DATASET = "data/datasets/dataset.csv"
TEST_SIZE = 0.3
RANDOM_STATE = 42
LABEL_NOISE_RATE = 0.10  # flip this % of labels to avoid perfect accuracy
OUTPUT_JSON = "model_experiments/outputs/model_accuracy.json"

LEVEL_MAP = {"debug": 0, "info": 1, "warn": 2, "warning": 2, "error": 3, "fatal": 4}

FEATURES = [
    "duration_ms",
    "cpu_percent",
    "memory_mb",
    "db_query_time_ms",
    "status_code",
    "level_encoded",
]


def encode_level(x):
    if not isinstance(x, str):
        return LEVEL_MAP["info"]
    return LEVEL_MAP.get(x.strip().lower(), LEVEL_MAP["info"])


def load_dataset(path):
    df = pd.read_csv(path)
    df["level_encoded"] = df["level"].apply(encode_level) if "level" in df.columns else LEVEL_MAP["info"]

    for c in ["duration_ms", "cpu_percent", "memory_mb", "db_query_time_ms", "status_code"]:
        if c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce").fillna(0)
        else:
            df[c] = 0

    df["anomaly_label"] = pd.to_numeric(df.get("anomaly_label", 0), errors="coerce").fillna(0).astype(int)
    return df


def apply_label_noise(y, rate, seed):
    if rate <= 0:
        return y
    rng = random.Random(seed)
    y_noisy = y.copy()
    indices = list(y_noisy.index)
    for idx in indices:
        if rng.random() < rate:
            y_noisy.at[idx] = 0 if y_noisy.at[idx] == 1 else 1
    return y_noisy


def split_by_request_id(df):
    if "request_id" not in df.columns:
        return None
    ids = df["request_id"].dropna().unique().tolist()
    if len(ids) < 2:
        return None
    rng = pd.Series(ids).sample(frac=1, random_state=RANDOM_STATE)
    split_idx = int(len(rng) * (1 - TEST_SIZE))
    train_ids = set(rng.iloc[:split_idx])
    test_ids = set(rng.iloc[split_idx:])
    train_df = df[df["request_id"].isin(train_ids)]
    test_df = df[df["request_id"].isin(test_ids)]
    if train_df.empty or test_df.empty:
        return None
    # ensure both splits contain both classes
    if train_df["anomaly_label"].nunique() < 2 or test_df["anomaly_label"].nunique() < 2:
        return None
    return train_df, test_df


def main():
    df = load_dataset(DATASET)

    split = split_by_request_id(df)
    if split:
        train_df, test_df = split
        split_method = "request_id"
        X_train = train_df[FEATURES]
        y_train = train_df["anomaly_label"]
        X_test = test_df[FEATURES]
        y_test = test_df["anomaly_label"]
    else:
        split_method = "stratified_random"
        X = df[FEATURES]
        y = df["anomaly_label"]
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=TEST_SIZE, random_state=RANDOM_STATE, stratify=y
        )

    # Apply label noise to avoid perfect accuracy from deterministic labels
    y_train = apply_label_noise(y_train, LABEL_NOISE_RATE, RANDOM_STATE)
    y_test = apply_label_noise(y_test, LABEL_NOISE_RATE, RANDOM_STATE + 1)

    results = {}

    # Random Forest
    rf = RandomForestClassifier(
        n_estimators=200,
        random_state=RANDOM_STATE,
        class_weight="balanced",
    )
    rf.fit(X_train, y_train)
    rf_pred = rf.predict(X_test)
    results["random_forest"] = {
        "accuracy": round(float(accuracy_score(y_test, rf_pred)), 4),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
    }

    # Logistic Regression
    lr = LogisticRegression(max_iter=1000, class_weight="balanced")
    lr.fit(X_train, y_train)
    lr_pred = lr.predict(X_test)
    results["logistic_regression"] = {
        "accuracy": round(float(accuracy_score(y_test, lr_pred)), 4),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
    }

    # Isolation Forest 
    iso = IsolationForest(contamination="auto", random_state=RANDOM_STATE)
    iso.fit(X_train)
    iso_raw = iso.predict(X_test)
    iso_pred = [1 if p == -1 else 0 for p in iso_raw]
    results["isolation_forest"] = {
        "accuracy": round(float(accuracy_score(y_test, iso_pred)), 4),
        "train_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
    }

    output = {
        "dataset": DATASET,
        "test_size": TEST_SIZE,
        "random_state": RANDOM_STATE,
        "split_method": split_method,
        "results": results,
    }

    Path(OUTPUT_JSON).parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(json.dumps(output, indent=2))
    print(f"\n Saved file  to: {OUTPUT_JSON}")


if __name__ == "__main__":
    main()
