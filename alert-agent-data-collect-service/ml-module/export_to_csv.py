"""
Export finalized alert data collection to CSV format
"""

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
print("📊 Exporting Alert Data to CSV")
print("=" * 80)

# Load JSON data
print(f"\n📂 Loading data from: {DATA_FILE}")
with open(DATA_FILE, 'r') as f:
    alerts = json.load(f)

print(f"✓ Loaded {len(alerts)} alert records")

# Convert to DataFrame
df = pd.DataFrame(alerts)

# Sort by timestamp
df['timestamp'] = pd.to_datetime(df['timestamp'])
df = df.sort_values('timestamp').reset_index(drop=True)

print(f"\n📋 Data Summary:")
print(f"   Total Records: {len(df)}")
print(f"   Date Range: {df['timestamp'].min()} to {df['timestamp'].max()}")
print(f"   Services: {df['service_name'].nunique()}")
print(f"   Alert Types: {df['alert_type'].nunique()}")
print(f"   Columns: {len(df.columns)}")

# Export to CSV
csv_file = OUTPUT_DIR / 'alert-data-collection.csv'
df.to_csv(csv_file, index=False, encoding='utf-8')
print(f"\n✅ Exported to: {csv_file}")

# Create summary statistics CSV
print("\n📊 Creating summary statistics...")

summary_data = []

# Overall statistics
summary_data.append({
    'Metric': 'Total Alerts',
    'Value': len(df),
    'Category': 'Overall'
})

summary_data.append({
    'Metric': 'Date Range Start',
    'Value': df['timestamp'].min().strftime('%Y-%m-%d %H:%M:%S'),
    'Category': 'Overall'
})

summary_data.append({
    'Metric': 'Date Range End',
    'Value': df['timestamp'].max().strftime('%Y-%m-%d %H:%M:%S'),
    'Category': 'Overall'
})

summary_data.append({
    'Metric': 'Collection Duration (days)',
    'Value': (df['timestamp'].max() - df['timestamp'].min()).days,
    'Category': 'Overall'
})

# Service breakdown
for service in df['service_name'].unique():
    count = len(df[df['service_name'] == service])
    summary_data.append({
        'Metric': f'{service} Alerts',
        'Value': count,
        'Category': 'By Service'
    })

# Alert type breakdown
for alert_type in df['alert_type'].unique():
    count = len(df[df['alert_type'] == alert_type])
    summary_data.append({
        'Metric': f'{alert_type} Alerts',
        'Value': count,
        'Category': 'By Alert Type'
    })

# Severity breakdown
for severity in df['severity'].unique():
    count = len(df[df['severity'] == severity])
    summary_data.append({
        'Metric': f'{severity} Severity',
        'Value': count,
        'Category': 'By Severity'
    })

# Alert state breakdown
for state in df['alert_state'].unique():
    count = len(df[df['alert_state'] == state])
    summary_data.append({
        'Metric': f'{state} State',
        'Value': count,
        'Category': 'By State'
    })

summary_df = pd.DataFrame(summary_data)
summary_csv = OUTPUT_DIR / 'alert-data-summary.csv'
summary_df.to_csv(summary_csv, index=False, encoding='utf-8')
print(f"✅ Summary exported to: {summary_csv}")

# Create service-specific CSVs
print("\n📁 Creating service-specific CSV files...")
for service in df['service_name'].unique():
    service_df = df[df['service_name'] == service]
    service_file = OUTPUT_DIR / f'alert-data-{service}.csv'
    service_df.to_csv(service_file, index=False, encoding='utf-8')
    print(f"   ✓ {service}: {len(service_df)} records → {service_file.name}")

print("\n" + "=" * 80)
print("🎉 CSV Export Complete!")
print("=" * 80)
print(f"\n📁 Files created:")
print(f"   1. alert-data-collection.csv (all data)")
print(f"   2. alert-data-summary.csv (statistics)")
print(f"   3. alert-data-<service>.csv (per service)")
print(f"\n✨ Ready for analysis in Excel, Tableau, or any CSV tool!")

