"""
ML Prediction Microservice
Flask-based REST API for serving ML predictions to the Node.js Alert Agent
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
from pathlib import Path
import traceback
from datetime import datetime

# Add module to path
sys.path.insert(0, str(Path(__file__).parent))

from phase1_orchestrator import Phase1Orchestrator

app = Flask(__name__)
CORS(app)  # Enable CORS for Node.js integration

# Initialize ML orchestrator
print("[*] Initializing ML Prediction Service...")
try:
    orchestrator = Phase1Orchestrator(model_dir='models')
    print("[OK] ML models loaded successfully")
except Exception as e:
    print(f"[X] Failed to load ML models: {e}")
    orchestrator = None

# Service statistics
stats = {
    'requests_processed': 0,
    'errors': 0,
    'start_time': datetime.now().isoformat()
}


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy' if orchestrator else 'unhealthy',
        'service': 'ML Prediction Service',
        'timestamp': datetime.now().isoformat(),
        'models_loaded': orchestrator is not None,
        'stats': stats
    })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Main prediction endpoint
    
    Request Body:
    {
        "service_name": "orders-service",
        "alert_name": "High Error Rate",
        "severity": "high",
        "error_count": 50,
        "response_time": 250,
        ... (other alert fields)
    }
    
    Response:
    {
        "success": true,
        "predictions": {
            "priority": {...},
            "ttr": {...},
            "suppressed": false
        }
    }
    """
    stats['requests_processed'] += 1
    
    try:
        if not orchestrator:
            return jsonify({
                'success': False,
                'error': 'ML models not loaded'
            }), 503
        
        alert_data = request.json
        
        if not alert_data:
            return jsonify({
                'success': False,
                'error': 'No alert data provided'
            }), 400
        
        # Process alert through ML pipeline (without sending email)
        result = orchestrator.process_alert(alert_data, send_email=False)
        
        return jsonify({
            'success': True,
            'predictions': result,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        stats['errors'] += 1
        print(f"[X] Prediction error: {e}")
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@app.route('/predict/priority', methods=['POST'])
def predict_priority():
    """Priority prediction only"""
    try:
        if not orchestrator:
            return jsonify({'success': False, 'error': 'ML models not loaded'}), 503
        
        alert_data = request.json
        priority_prediction = orchestrator.priority_engine.predict(alert_data)
        
        return jsonify({
            'success': True,
            'priority': priority_prediction,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/predict/ttr', methods=['POST'])
def predict_ttr():
    """TTR prediction only"""
    try:
        if not orchestrator:
            return jsonify({'success': False, 'error': 'ML models not loaded'}), 503
        
        alert_data = request.json
        priority_level = alert_data.get('priority_level', 'P2')
        
        ttr_prediction = orchestrator.ttr_engine.predict(alert_data, priority_level=priority_level)
        
        return jsonify({
            'success': True,
            'ttr': ttr_prediction,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/stats', methods=['GET'])
def get_stats():
    """Get service statistics"""
    return jsonify({
        'service_stats': stats,
        'orchestrator_stats': orchestrator.stats if orchestrator else None,
        'timestamp': datetime.now().isoformat()
    })


@app.route('/models/info', methods=['GET'])
def models_info():
    """Get information about loaded models"""
    try:
        if not orchestrator:
            return jsonify({'success': False, 'error': 'ML models not loaded'}), 503
        
        import json
        
        # Read training reports
        training_report_path = Path('models/training_report_enhanced.json')
        phase1_results_path = Path('models/phase1_training_results.json')
        
        info = {
            'models_loaded': True,
            'model_directory': str(orchestrator.model_dir)
        }
        
        if training_report_path.exists():
            with open(training_report_path, 'r') as f:
                info['training_report'] = json.load(f)
        
        if phase1_results_path.exists():
            with open(phase1_results_path, 'r') as f:
                info['phase1_results'] = json.load(f)
        
        return jsonify({
            'success': True,
            'info': info,
            'timestamp': datetime.now().isoformat()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    print("\n" + "=" * 80)
    print("ML PREDICTION MICROSERVICE")
    print("=" * 80)
    print("\nEndpoints:")
    print("  GET  /health              - Health check")
    print("  POST /predict             - Full ML prediction")
    print("  POST /predict/priority    - Priority prediction only")
    print("  POST /predict/ttr         - TTR prediction only")
    print("  GET  /stats               - Service statistics")
    print("  GET  /models/info         - Model information")
    print("\nStarting server on http://localhost:5001")
    print("=" * 80 + "\n")
    
    app.run(host='0.0.0.0', port=5001, debug=False)

