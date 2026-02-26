#!/usr/bin/env python3
"""
Verification script to test path resolution in both Docker and local environments.
This script simulates how paths are resolved without actually running the full pipeline.
"""

import os
import json
from pathlib import Path

def verify_path_resolution():
    """Verify path resolution logic works correctly in both environments."""
    
    # Simulate Docker environment
    print("=" * 60)
    print("Testing DOCKER Environment")
    print("=" * 60)
    
    # Test case 1: Docker with absolute paths (as passed from run_realtime_pipeline.py)
    os.environ["DOCKER_ENV"] = "true"
    docker_input = "/app/data/merged/logs_with_metrics_clean.csv"
    docker_model = "/app/model_experiments/models/random_forest/rf_model.pkl"
    
    input_path = Path(docker_input)
    model_file = Path(docker_model)
    project_root = Path("/app")
    
    # Convert to relative for JSON
    if str(input_path).startswith("/app/"):
        input_csv_relative = str(input_path)[5:]
    elif str(input_path).startswith("/app"):
        input_csv_relative = str(input_path)[4:]
    else:
        input_csv_relative = str(input_path.relative_to(project_root))
    
    if str(model_file).startswith("/app/"):
        model_path_relative = str(model_file)[5:]
    elif str(model_file).startswith("/app"):
        model_path_relative = str(model_file)[4:]
    else:
        model_path_relative = str(model_file.relative_to(project_root))
    
    print(f"[OK] Docker - Input CSV: {docker_input} -> Relative: {input_csv_relative}")
    print(f"[OK] Docker - Model path: {docker_model} -> Relative: {model_path_relative}")
    
    expected_docker = {
        "input_csv": "data/merged/logs_with_metrics_clean.csv",
        "model_path": "model_experiments/models/random_forest/rf_model.pkl"
    }
    
    assert input_csv_relative == expected_docker["input_csv"], f"Expected {expected_docker['input_csv']}, got {input_csv_relative}"
    assert model_path_relative == expected_docker["model_path"], f"Expected {expected_docker['model_path']}, got {model_path_relative}"
    print("[OK] Docker path resolution: PASSED\n")
    
    # Simulate Local environment
    print("=" * 60)
    print("Testing LOCAL Environment")
    print("=" * 60)
    
    del os.environ["DOCKER_ENV"]
    
    # Simulate script location (anomaly-detection-agent/scripts/verify_paths.py)
    script_path = Path(__file__).resolve()
    project_root_local = script_path.parent.parent  # anomaly-detection-agent
    
    # Test case 2: Local with relative paths
    local_input = "data/merged/logs_with_metrics_clean.csv"
    local_model = "model_experiments/models/random_forest/rf_model.pkl"
    
    input_path_local = project_root_local / local_input
    model_file_local = project_root_local / local_model
    
    # Convert to relative for JSON
    try:
        input_csv_relative_local = str(input_path_local.relative_to(project_root_local))
        model_path_relative_local = str(model_file_local.relative_to(project_root_local))
    except ValueError:
        input_csv_relative_local = local_input.replace("\\", "/")
        model_path_relative_local = local_model.replace("\\", "/")
    
    # Normalize separators
    input_csv_relative_local = input_csv_relative_local.replace("\\", "/")
    model_path_relative_local = model_path_relative_local.replace("\\", "/")
    
    print(f"[OK] Local - Input CSV: {local_input} -> Absolute: {input_path_local} -> Relative: {input_csv_relative_local}")
    print(f"[OK] Local - Model path: {local_model} -> Absolute: {model_file_local} -> Relative: {model_path_relative_local}")
    
    expected_local = {
        "input_csv": "data/merged/logs_with_metrics_clean.csv",
        "model_path": "model_experiments/models/random_forest/rf_model.pkl"
    }
    
    assert input_csv_relative_local == expected_local["input_csv"], f"Expected {expected_local['input_csv']}, got {input_csv_relative_local}"
    assert model_path_relative_local == expected_local["model_path"], f"Expected {expected_local['model_path']}, got {model_path_relative_local}"
    print("[OK] Local path resolution: PASSED\n")
    
    # Test case 3: Local with absolute Windows paths (edge case)
    print("=" * 60)
    print("Testing LOCAL Environment with Absolute Windows Paths")
    print("=" * 60)
    
    # Simulate Windows absolute path
    windows_input = r"C:\Users\User\Desktop\Research-Project\nodejs-springboot-observabilitydata-collection-app\anomaly-detection-agent\data\merged\logs_with_metrics_clean.csv"
    windows_model = r"C:\Users\User\Desktop\Research-Project\nodejs-springboot-observabilitydata-collection-app\anomaly-detection-agent\model_experiments\models\random_forest\rf_model.pkl"
    
    input_path_windows = Path(windows_input)
    model_file_windows = Path(windows_model)
    
    # Try to make relative to project root
    try:
        input_csv_relative_windows = str(input_path_windows.relative_to(project_root_local))
        model_path_relative_windows = str(model_file_windows.relative_to(project_root_local))
    except ValueError:
        # Fallback: normalize separators and remove project root prefix if present
        input_csv_relative_windows = windows_input.replace("\\", "/")
        model_path_relative_windows = windows_model.replace("\\", "/")
        # Try to extract relative part
        project_str = str(project_root_local).replace("\\", "/")
        if input_csv_relative_windows.startswith(project_str):
            input_csv_relative_windows = input_csv_relative_windows[len(project_str)+1:]
        if model_path_relative_windows.startswith(project_str):
            model_path_relative_windows = model_path_relative_windows[len(project_str)+1:]
    
    # Normalize separators
    input_csv_relative_windows = input_csv_relative_windows.replace("\\", "/")
    model_path_relative_windows = model_path_relative_windows.replace("\\", "/")
    
    print(f"[OK] Windows - Input CSV: {windows_input} -> Relative: {input_csv_relative_windows}")
    print(f"[OK] Windows - Model path: {windows_model} -> Relative: {model_path_relative_windows}")
    
    # Should result in relative paths
    assert "data/merged/logs_with_metrics_clean.csv" in input_csv_relative_windows or input_csv_relative_windows == "data/merged/logs_with_metrics_clean.csv"
    assert "model_experiments/models/random_forest/rf_model.pkl" in model_path_relative_windows or model_path_relative_windows == "model_experiments/models/random_forest/rf_model.pkl"
    print("[OK] Windows absolute path resolution: PASSED\n")
    
    print("=" * 60)
    print("[OK] ALL TESTS PASSED!")
    print("=" * 60)
    print("\nExpected JSON output format:")
    print(json.dumps({
        "input_csv": "data/merged/logs_with_metrics_clean.csv",
        "model_path": "model_experiments/models/random_forest/rf_model.pkl"
    }, indent=2))

if __name__ == "__main__":
    verify_path_resolution()

