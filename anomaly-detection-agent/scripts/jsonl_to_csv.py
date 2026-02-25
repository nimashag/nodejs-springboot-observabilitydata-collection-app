#!/usr/bin/env python3
import json
import csv
import os
import sys

IN_JSONL = "data/processed/logs.jsonl"
OUT_CSV  = "data/processed/logs.csv"

def main():
    print("🔎 Starting JSONL -> CSV conversion...")
    print("Input :", os.path.abspath(IN_JSONL))
    print("Output:", os.path.abspath(OUT_CSV))

    if not os.path.exists(IN_JSONL):
        print(f"❌ Input file not found: {IN_JSONL}")
        sys.exit(1)

    os.makedirs(os.path.dirname(OUT_CSV), exist_ok=True)

    fieldnames = set()
    rows = 0
    invalid = 0

    # First pass: find all columns
    with open(IN_JSONL, "r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if not isinstance(obj, dict):
                    obj = {"_raw": str(obj)}
                fieldnames.update(obj.keys())
                rows += 1
            except Exception as e:
                invalid += 1
                print(f"⚠️ Invalid JSON at line {line_no}: {e}")

    if rows == 0:
        print("❌ No valid rows found in JSONL.")
        sys.exit(1)

    fieldnames = sorted(fieldnames)
    print(f"✅ Detected rows={rows}, columns={len(fieldnames)}, invalid_lines={invalid}")

    # Second pass: write CSV
    with open(IN_JSONL, "r", encoding="utf-8") as f, open(OUT_CSV, "w", encoding="utf-8", newline="") as out:
        writer = csv.DictWriter(out, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()

        written = 0
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                obj = json.loads(line)
                if not isinstance(obj, dict):
                    obj = {"_raw": str(obj)}
                # Convert nested objects to JSON strings so CSV won’t break later
                for k, v in list(obj.items()):
                    if isinstance(v, (dict, list)):
                        obj[k] = json.dumps(v, ensure_ascii=False)
                writer.writerow({k: obj.get(k, None) for k in fieldnames})
                written += 1
            except:
                pass

    print(f"✅ CSV written successfully: {OUT_CSV}")
    print(f"✅ Rows written: {written}")

if __name__ == "__main__":
    main()
