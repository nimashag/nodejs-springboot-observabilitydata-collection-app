import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import subprocess
import json
from datetime import datetime
from pathlib import Path
import argparse

BASE_DIR = Path(__file__).parent
TRAIN_SCRIPT = BASE_DIR / 'train_enhanced.py'
DRIFT_SCRIPT = BASE_DIR / 'drift_detection.py'
RETRAIN_LOG = BASE_DIR / 'models' / 'retrain_log.json'

def load_retrain_log():
    """Load retraining history"""
    if RETRAIN_LOG.exists():
        with open(RETRAIN_LOG, 'r') as f:
            return json.load(f)
    return {'retrains': []}

def save_retrain_log(log):
    """Save retraining log"""
    RETRAIN_LOG.parent.mkdir(exist_ok=True)
    with open(RETRAIN_LOG, 'w') as f:
        json.dump(log, f, indent=2)

def check_if_retraining_needed(days_since_last_train=30, min_accuracy_drop=0.05):
    """
    Check if retraining is needed based on:
    - Time since last training
    - Drift detection results
    """
    print("=" * 80)
    print("PERIODIC RETRAINING CHECK")
    print("=" * 80)
    
    retrain_log = load_retrain_log()
    
    # Check last training date
    if len(retrain_log['retrains']) > 0:
        last_train = retrain_log['retrains'][-1]
        last_train_date = datetime.fromisoformat(last_train['timestamp'])
        days_ago = (datetime.now() - last_train_date).days
        
        print(f"\nLast training: {last_train_date.strftime('%Y-%m-%d %H:%M:%S')} ({days_ago} days ago)")
        
        if days_ago < days_since_last_train:
            print(f"   Skipping retraining (last training was {days_ago} days ago, threshold: {days_since_last_train} days)")
            return False, "Too recent"
    else:
        print("\nNo previous training found - retraining needed")
    
    # Check drift detection
    try:
        print("\nChecking drift detection...")
        result = subprocess.run(
            [sys.executable, str(DRIFT_SCRIPT)],
            capture_output=True,
            text=True,
            cwd=str(BASE_DIR)
        )
        
        if result.returncode == 0:
            # Try to load drift results
            drift_log_path = BASE_DIR / 'models' / 'drift_detection_log.json'
            if drift_log_path.exists():
                with open(drift_log_path, 'r') as f:
                    drift_log = json.load(f)
                
                if len(drift_log.get('detections', [])) > 0:
                    latest_drift = drift_log['detections'][-1]
                    
                    # Check performance drift
                    if latest_drift.get('performance_drifted', False):
                        print("   Warning: Performance drift detected - retraining recommended")
                        return True, "Performance drift detected"
                    
                    # Check statistical drift
                    drifted_count = latest_drift.get('drifted_features_count', 0)
                    if drifted_count > 3:  # Threshold: more than 3 features drifted
                        print(f"   Warning: Statistical drift detected ({drifted_count} features) - retraining recommended")
                        return True, f"Statistical drift ({drifted_count} features)"
                    else:
                        print(f"   Drift check passed ({drifted_count} features drifted)")
    except Exception as e:
        print(f"   Warning: Error checking drift: {e}")
        # Continue anyway if drift check fails
    
    # Time-based retraining
    if len(retrain_log['retrains']) == 0 or days_ago >= days_since_last_train:
        print(f"   Time-based retraining triggered (threshold: {days_since_last_train} days)")
        return True, "Time-based retraining"
    
    return False, "No retraining needed"

def run_training():
    """Execute the training script"""
    print("\n" + "=" * 80)
    print("STARTING MODEL RETRAINING")
    print("=" * 80)
    
    try:
        result = subprocess.run(
            [sys.executable, str(TRAIN_SCRIPT)],
            cwd=str(BASE_DIR),
            check=True
        )
        
        print("\nTraining completed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"\nTraining failed with exit code {e.returncode}")
        return False
    except Exception as e:
        print(f"\nError during training: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Periodic model retraining')
    parser.add_argument('--force', action='store_true', help='Force retraining regardless of checks')
    parser.add_argument('--check-only', action='store_true', help='Only check if retraining is needed, do not train')
    parser.add_argument('--days-threshold', type=int, default=30, help='Days since last training to trigger retraining')
    parser.add_argument('--min-accuracy-drop', type=float, default=0.05, help='Minimum accuracy drop to trigger retraining')
    
    args = parser.parse_args()
    
    if args.force:
        print("Force retraining enabled - skipping checks")
        should_retrain = True
        reason = "Force retraining"
    else:
        should_retrain, reason = check_if_retraining_needed(
            days_since_last_train=args.days_threshold,
            min_accuracy_drop=args.min_accuracy_drop
        )
    
    if not should_retrain:
        print("\n" + "=" * 80)
        print("RETRAINING SKIPPED")
        print("=" * 80)
        print(f"Reason: {reason}")
        return 0
    
    if args.check_only:
        print("\n" + "=" * 80)
        print("RETRAINING RECOMMENDED")
        print("=" * 80)
        print(f"Reason: {reason}")
        print("Run without --check-only to perform retraining")
        return 0
    
    # Perform retraining
    success = run_training()
    
    # Log retraining attempt
    retrain_log = load_retrain_log()
    retrain_entry = {
        'timestamp': datetime.now().isoformat(),
        'reason': reason,
        'success': success
    }
    retrain_log['retrains'].append(retrain_entry)
    retrain_log['last_updated'] = datetime.now().isoformat()
    
    # Keep only last 50 retraining entries
    if len(retrain_log['retrains']) > 50:
        retrain_log['retrains'] = retrain_log['retrains'][-50:]
    
    save_retrain_log(retrain_log)
    
    print("\n" + "=" * 80)
    if success:
        print("RETRAINING COMPLETE")
        print("=" * 80)
        return 0
    else:
        print("RETRAINING FAILED")
        print("=" * 80)
        return 1

if __name__ == '__main__':
    exit(main())

