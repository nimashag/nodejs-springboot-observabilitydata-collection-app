#!/usr/bin/env python3
"""
Pre-flight check script for Anomaly Detection Agent
Verifies all requirements before running the service.
"""

import sys
import os
from pathlib import Path

# ANSI colors for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text:^60}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def check_pass(text):
    print(f"{GREEN}✓{RESET} {text}")
    return True

def check_fail(text, solution=""):
    print(f"{RED}✗{RESET} {text}")
    if solution:
        print(f"  {YELLOW}Solution:{RESET} {solution}")
    return False

def check_warn(text):
    print(f"{YELLOW}⚠{RESET} {text}")

def check_python_version():
    """Check Python version is 3.8+"""
    version = sys.version_info
    if version.major >= 3 and version.minor >= 8:
        return check_pass(f"Python version: {version.major}.{version.minor}.{version.micro}")
    else:
        return check_fail(
            f"Python version: {version.major}.{version.minor}.{version.micro}",
            "Python 3.8+ required. Please upgrade Python."
        )

def check_packages():
    """Check required Python packages are installed"""
    required = {
        'pandas': 'pip install pandas',
        'sklearn': 'pip install scikit-learn',
        'joblib': 'pip install joblib',
        'requests': 'pip install requests'
    }
    
    all_installed = True
    for package, install_cmd in required.items():
        try:
            __import__(package)
            check_pass(f"Package '{package}' installed")
        except ImportError:
            check_fail(f"Package '{package}' NOT installed", install_cmd)
            all_installed = False
    
    return all_installed

def check_model_exists():
    """Check if trained model exists"""
    model_paths = [
        Path("model_experiments/models/random_forest/rf_model.pkl"),
        Path("models/random_forest_anomaly_classifier.joblib"),
        Path("models/isolation_forest_model.joblib")
    ]
    
    found = False
    for model_path in model_paths:
        if model_path.exists():
            check_pass(f"Model found: {model_path}")
            found = True
    
    if not found:
        check_fail(
            "No trained model found",
            "Run: python scripts/model_training/train_random_forest_classifier.py"
        )
    
    return found

def check_directories():
    """Check required directories exist"""
    required_dirs = [
        "data/raw/logs",
        "data/raw/metrics",
        "data/processed",
        "data/merged",
        "data/metrics",
        "outputs",
        "scripts"
    ]
    
    all_exist = True
    for dir_path in required_dirs:
        p = Path(dir_path)
        if p.exists():
            check_pass(f"Directory exists: {dir_path}")
        else:
            check_warn(f"Directory missing: {dir_path} (will be created automatically)")
    
    return True  # Not critical, they'll be created

def check_data_sources():
    """Check if data sources are available"""
    root = Path(__file__).resolve().parents[1]
    
    # Check for log aggregation service
    log_agg_dir = root / "log-aggregation-service" / "aggregated-logs"
    if log_agg_dir.exists():
        log_files = list(log_agg_dir.glob("*.jsonl"))
        if log_files:
            check_pass(f"Log aggregation service found with {len(log_files)} log files")
        else:
            check_warn("Log aggregation service directory exists but no log files found")
    else:
        check_warn("Log aggregation service not found - logs won't be collected")
    
    # Check for microservices metrics
    services = ['orders-service', 'restaurants-service', 'delivery-service', 'users-service']
    services_found = 0
    for service in services:
        metrics_file = root / service / "metrics" / "metrics.jsonl"
        if metrics_file.exists():
            services_found += 1
    
    if services_found > 0:
        check_pass(f"Found {services_found}/{len(services)} microservices with metrics")
    else:
        check_warn("No microservice metrics found - ensure services are running and generating metrics")
    
    return True

def check_email_service():
    """Check if email service is running (optional)"""
    try:
        import requests
        response = requests.get("http://localhost:4000/health", timeout=2)
        if response.status_code == 200:
            check_pass("Email service is running (port 4000)")
        else:
            check_warn("Email service responded with non-200 status")
    except requests.exceptions.ConnectionError:
        check_warn("Email service not running (optional - set ANOMALY_SEND_EMAIL=0 to disable)")
    except Exception as e:
        check_warn(f"Could not check email service: {e}")
    
    return True

def main():
    print_header("Anomaly Detection Agent - Pre-flight Check")
    
    checks = [
        ("Python Version", check_python_version),
        ("Required Packages", check_packages),
        ("Trained Model", check_model_exists),
        ("Directory Structure", check_directories),
        ("Data Sources", check_data_sources),
        ("Email Service (Optional)", check_email_service),
    ]
    
    results = []
    for name, check_func in checks:
        print(f"\n{BLUE}Checking: {name}{RESET}")
        result = check_func()
        results.append((name, result))
    
    print_header("Summary")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    if passed == total:
        print(f"{GREEN}All checks passed! ✓{RESET}")
        print(f"\n{GREEN}You can now run the service:{RESET}")
        print(f"  npm run start:once     # Run once")
        print(f"  npm run start:watch    # Continuous monitoring")
        return 0
    else:
        print(f"{YELLOW}{passed}/{total} checks passed{RESET}")
        print(f"\n{YELLOW}Please resolve the issues above before running the service.{RESET}")
        print(f"\n{BLUE}Quick setup:{RESET}")
        print(f"  pip install -r requirements.txt")
        print(f"  python scripts/model_training/train_random_forest_classifier.py")
        return 1

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Check interrupted by user{RESET}")
        sys.exit(1)
    except Exception as e:
        print(f"\n{RED}Unexpected error: {e}{RESET}")
        sys.exit(1)
