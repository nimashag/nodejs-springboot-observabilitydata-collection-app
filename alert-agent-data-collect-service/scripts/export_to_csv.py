import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import json
import pandas as pd
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).parent
DATA_FILE = BASE_DIR.parent / 'output' / 'combined-alert-history.json'
OUTPUT_DIR = BASE_DIR.parent / 'output'
OUTPUT_DIR.mkdir(exist_ok=True)

print("=" * 80)
print("Exporting Alert Data to CSV")
print("=" * 80)

# Load JSON data
print(f"\nLoading data from: {DATA_FILE}")
with open(DATA_FILE, 'r') as f:
    alerts = json.load(f)

print(f"Loaded {len(alerts)} alert records")

# Convert to DataFrame
df = pd.DataFrame(alerts)

# Sort by timestamp
df['timestamp'] = pd.to_datetime(df['timestamp'])
df = df.sort_values('timestamp').reset_index(drop=True)

print(f"\nData Summary:")
print(f"   Total Records: {len(df)}")
print(f"   Date Range: {df['timestamp'].min()} to {df['timestamp'].max()}")
print(f"   Services: {df['service_name'].nunique()}")
print(f"   Alert Types: {df['alert_type'].nunique()}")
print(f"   Columns: {len(df.columns)}")

# Export to CSV
csv_file = OUTPUT_DIR / 'alert-data-collection.csv'
df.to_csv(csv_file, index=False, encoding='utf-8')
print(f"\nExported to: {csv_file}")

print("\n" + "=" * 80)
print("CSV Export Complete!")
print("=" * 80)
print(f"\nFiles created:")
print(f"   1. alert-data-collection.csv (all data)")
print(f"\nReady for analysis in Excel, Tableau, or any CSV tool!")


