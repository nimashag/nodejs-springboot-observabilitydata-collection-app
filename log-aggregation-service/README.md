# Log Aggregation Service

ML-based log aggregation and structuring service for enterprise microservices with advanced template mining capabilities.

## 🎯 Overview

This service provides intelligent log aggregation, structuring, and analysis for microservice architectures. It automatically collects logs from multiple services, structures unstructured logs using ML techniques, and provides template mining to identify common log patterns.

### Key Features

- **📥 Automatic Log Collection**: Watches and collects logs from all microservices in real-time
- **🤖 ML-Based Log Parsing**: Uses NLP and pattern recognition to structure unstructured logs
- **🔍 Template Mining**: Discovers common log patterns using K-means clustering and TF-IDF
- **🔗 Trace Correlation**: Extracts and correlates trace IDs across services
- **🐛 Root Cause Analysis**: Identifies root causes of errors using trace IDs
- **📊 Multi-Format Support**: Handles JSON, pipe-delimited, and Java/Spring Boot logs

---

## 📋 Prerequisites

- **Node.js**: v16 or higher
- **npm**: v7 or higher
- **TypeScript**: v5.0 or higher (installed as dev dependency)
- **Microservices**: Services with log files in the expected locations

---

## 🚀 Installation

### 1. Install Dependencies

```bash
cd log-aggregation-service
npm install
```

### 2. Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `log-aggregation-service` directory (optional):

```env
# Server Configuration
PORT=3005

# Log Paths (optional - defaults to ../{service-name}/logs)
DELIVERY_SERVICE_LOG_PATH=../delivery-service/logs
ORDERS_SERVICE_LOG_PATH=../orders-service/logs
RESTAURANTS_SERVICE_LOG_PATH=../restaurants-service/logs
USERS_SERVICE_LOG_PATH=../users-service/logs

# ML Model Training
MODEL_TRAINING_ENABLED=true
```

**Note**: If environment variables are not set, the service uses default paths relative to the project root.

### Service Log Structure

The service automatically discovers log files in:
```
project-root/
├── restaurants-service/
│   └── logs/
│       └── restaurants-service.log
├── orders-service/
│   └── logs/
│       └── orders-service.log
├── users-service/
│   └── logs/
│       └── users-service.log
└── delivery-service/
    └── logs/
        └── delivery-service.log
```

---

## 🏃 Running the Service

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Verify Service is Running

```bash
curl http://localhost:3005/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-29T14:00:00.000Z",
  "service": "log-aggregation-service"
}
```

---

## 📖 Workflow

### 1. Service Startup

```
┌─────────────────────────────────────────┐
│  1. Load Environment Variables          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  2. Initialize Template Miner           │
│     - Load existing templates from disk │
│     - Initialize ML components          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  3. Initialize Log Parser               │
│     - Connect to template miner         │
│     - Setup NLP models                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  4. Start Log Collection                │
│     - Discover service log files         │
│     - Watch for new log entries         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  5. Start Express Server                │
│     - Register API routes               │
│     - Listen on configured port          │
└─────────────────────────────────────────┘
```

### 2. Log Processing Pipeline

```
Raw Log Entry
     ↓
┌─────────────────────────────────────────┐
│  Step 1: Log Collection                 │
│  - Read from service log files          │
│  - Watch for new entries (chokidar)     │
└─────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────┐
│  Step 2: Template Matching (if enabled) │
│  - Match against existing templates     │
│  - Extract template metadata            │
└─────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────┐
│  Step 3: Log Parsing                    │
│  - Extract trace IDs, timestamps        │
│  - Identify log levels, events          │
│  - Parse metadata (JSON, key-value)     │
└─────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────┐
│  Step 4: Structure Log                  │
│  - Create StructuredLog object          │
│  - Add service, level, event info       │
└─────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────┐
│  Step 5: Store Aggregated Log            │
│  - Write to aggregated-logs/            │
│  - JSONL format (one log per line)      │
└─────────────────────────────────────────┘
```

### 3. Template Mining Workflow

```
Collection of Raw Logs
     ↓
┌─────────────────────────────────────────┐
│  Step 1: Parameterization              │
│  - Replace UUIDs → <UUID>               │
│  - Replace IPs → <IP>                   │
│  - Replace timestamps → <TIMESTAMP>     │
│  - Replace IDs → <OBJECTID>             │
└─────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────┐
│  Step 2: Tokenization                   │
│  - Break logs into words                │
│  - Remove stop words                    │
└─────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────┐
│  Step 3: TF-IDF Vectorization            │
│  - Convert text to numerical vectors      │
│  - Calculate word importance            │
└─────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────┐
│  Step 4: K-Means Clustering             │
│  - Group similar logs together          │
│  - Create clusters based on similarity │
└─────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────┐
│  Step 5: Template Extraction            │
│  - Find most common pattern in cluster  │
│  - Create regex pattern                │
│  - Extract metadata                    │
└─────────────────────────────────────────┘
     ↓
┌─────────────────────────────────────────┐
│  Step 6: Save Templates                 │
│  - Persist to templates/templates.json  │
│  - Load on next startup                │
└─────────────────────────────────────────┘
```

---

## 🔬 Template Mining Guide

### What is Template Mining?

Template mining automatically discovers common patterns in your logs. For example:

**Before Mining:**
```
GET /api/orders/123
GET /api/orders/456
GET /api/orders/789
POST /api/users/abc
POST /api/users/xyz
```

**After Mining:**
```
Template 1: GET /api/orders/<ID> (frequency: 3)
Template 2: POST /api/users/<ID> (frequency: 2)
```

### Running Template Mining

#### Option 1: Using Test Script (Recommended for First Time)

```bash
npm run test:templates
```

This script:
- Mines templates from all service logs
- Shows statistics and coverage
- Saves templates to disk
- Tests template matching

**Example Output:**
```
=== Template Mining Test ===

📊 Processing restaurants-service...
  Found 260 log lines
  ✓ Mining completed in 421ms
  ✓ Found 20 templates
  ✓ Coverage: 94.62%
  ✓ Most common template: svc=restaurants-service | level=INFO | ts=<DATE>T<IPV6> | event=http.request.received
```

#### Option 2: Using API Endpoint

**Mine from Aggregated Logs:**
```bash
curl -X POST http://localhost:3005/api/templates/mine \
  -H "Content-Type: application/json" \
  -d '{
    "source": "aggregated",
    "minClusterSize": 3,
    "maxClusters": 50
  }'
```

**Mine from Specific Service:**
```bash
curl -X POST http://localhost:3005/api/templates/mine \
  -H "Content-Type: application/json" \
  -d '{
    "source": "service",
    "service": "restaurants-service",
    "minClusterSize": 3,
    "maxClusters": 30
  }'
```

**Mine from Custom Logs:**
```bash
curl -X POST http://localhost:3005/api/templates/mine \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      "GET /api/orders/123",
      "GET /api/orders/456",
      "POST /api/users/789"
    ],
    "minClusterSize": 2,
    "maxClusters": 10
  }'
```

### Template Mining Parameters

| Parameter | Description | Default | Example |
|-----------|-------------|---------|---------|
| `source` | Source of logs: `"aggregated"`, `"service"`, or provide `logs` array | - | `"aggregated"` |
| `service` | Service name (required if `source` is `"service"`) | - | `"restaurants-service"` |
| `logs` | Array of log strings (if not using `source`) | - | `["log1", "log2"]` |
| `minClusterSize` | Minimum logs in a cluster to create template | `3` | `5` |
| `maxClusters` | Maximum number of clusters (K for K-means) | `50` | `30` |

### Viewing Mined Templates

**Get All Templates:**
```bash
curl http://localhost:3005/api/templates
```

**Get Templates by Service:**
```bash
curl http://localhost:3005/api/templates?service=restaurants-service
```

**Get Specific Template:**
```bash
curl http://localhost:3005/api/templates/{template-id}
```

**Match Log Against Templates:**
```bash
curl -X POST http://localhost:3005/api/templates/match \
  -H "Content-Type: application/json" \
  -d '{
    "log": "svc=restaurants-service | level=INFO | event=http.request.received | data={\"method\":\"GET\",\"path\":\"/api/restaurants\"}"
  }'
```

### Template Storage

Templates are automatically saved to:
```
log-aggregation-service/templates/templates.json
```

Templates are loaded automatically when the service starts.

---

## 📡 API Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-12-29T14:00:00.000Z",
  "service": "log-aggregation-service"
}
```

### Template Mining

#### Mine Templates
```http
POST /api/templates/mine
Content-Type: application/json

{
  "source": "aggregated",
  "minClusterSize": 3,
  "maxClusters": 50
}
```

#### Get All Templates
```http
GET /api/templates
GET /api/templates?service=restaurants-service
```

#### Get Template by ID
```http
GET /api/templates/:id
```

#### Delete Template
```http
DELETE /api/templates/:id
```

#### Match Log Against Templates
```http
POST /api/templates/match
Content-Type: application/json

{
  "log": "your log string here"
}
```

### Trace Correlation

#### Get Logs by Trace ID
```http
GET /api/traces/:traceId
```

#### Get Root Cause Analysis
```http
GET /api/traces/:traceId/root-cause
```

### Log Querying

#### Query Structured Logs
```http
GET /api/logs?service=restaurants-service&level=ERROR&limit=10
```

**Query Parameters:**
- `traceId`: Filter by trace ID
- `service`: Filter by service name
- `level`: Filter by log level (INFO, ERROR, WARN, etc.)
- `startTime`: Start timestamp (ISO format)
- `endTime`: End timestamp (ISO format)
- `event`: Filter by event name
- `limit`: Maximum number of results
- `offset`: Pagination offset

### Model Training

#### Train ML Model
```http
POST /api/train
Content-Type: application/json

{
  "sampleLogs": [
    {
      "raw": "log string",
      "structured": { /* StructuredLog object */ }
    }
  ]
}
```

---

## 🏗️ Architecture

### Directory Structure

```
log-aggregation-service/
├── src/
│   ├── services/
│   │   ├── logCollector.ts      # Collects logs from services
│   │   ├── logParser.ts          # ML-based log parser
│   │   ├── templateMiner.ts      # Template mining engine
│   │   └── traceCorrelator.ts   # Trace correlation & analysis
│   ├── controllers/
│   │   ├── template.controller.ts
│   │   ├── trace.controller.ts
│   │   ├── log.controller.ts
│   │   └── training.controller.ts
│   ├── routes/
│   │   ├── template.routes.ts
│   │   ├── trace.routes.ts
│   │   ├── log.routes.ts
│   │   └── training.routes.ts
│   ├── models/
│   │   └── templateModel.ts      # Template persistence
│   ├── types/
│   │   ├── log.types.ts
│   │   └── ml-kmeans.d.ts
│   ├── scripts/
│   │   ├── testTemplateMining.ts # Template mining test script
│   │   └── trainModel.ts         # ML model training script
│   ├── app.ts                    # Express app setup
│   └── server.ts                 # Server entry point
├── templates/
│   └── templates.json            # Persisted templates
├── aggregated-logs/               # Aggregated structured logs
├── package.json
├── tsconfig.json
└── README.md
```

### Key Components

#### 1. LogCollector
- Watches log files using `chokidar`
- Reads new log entries in real-time
- Processes logs through the parser

#### 2. MLBasedLogParser
- Extracts trace IDs, timestamps, levels
- Uses NLP for semantic understanding
- Integrates with template miner for enhanced parsing

#### 3. LogTemplateMiner
- **Parameterization**: Replaces variables with placeholders
- **TF-IDF**: Converts logs to numerical vectors
- **K-Means Clustering**: Groups similar logs
- **Template Extraction**: Finds common patterns

#### 4. TemplateModel
- Persists templates to disk
- Loads templates on startup
- Provides query interface

#### 5. TraceCorrelator
- Correlates logs by trace ID
- Performs root cause analysis
- Builds trace timelines

---

## 💡 Examples

### Example 1: Mine Templates from Service Logs

```bash
# Using curl
curl -X POST http://localhost:3005/api/templates/mine \
  -H "Content-Type: application/json" \
  -d '{
    "source": "service",
    "service": "restaurants-service",
    "minClusterSize": 3,
    "maxClusters": 30
  }'
```

**Response:**
```json
{
  "success": true,
  "result": {
    "templates": [
      {
        "id": "template-10-1767019098832",
        "template": "svc=restaurants-service | level=INFO | ts=<DATE>T<IPV6> | event=http.request.received",
        "frequency": 36,
        "service": "restaurants-service",
        "eventType": "http_request",
        "metadata": {
          "avgLength": 243,
          "parameterCount": 2
        }
      }
    ],
    "totalLogs": 260,
    "coverage": 94.62,
    "miningTime": 421,
    "statistics": {
      "totalTemplates": 20,
      "avgTemplateFrequency": 12.30
    }
  }
}
```

### Example 2: Query Logs by Service

```bash
curl "http://localhost:3005/api/logs?service=restaurants-service&level=ERROR&limit=5"
```

### Example 3: Get Trace Analysis

```bash
curl "http://localhost:3005/api/traces/4fa0c7de-f1da-4ae6-9684-fa1b6d4e178a/root-cause"
```

### Example 4: Match Log Against Templates

```bash
curl -X POST http://localhost:3005/api/templates/match \
  -H "Content-Type: application/json" \
  -d '{
    "log": "svc=restaurants-service | level=INFO | ts=2025-12-29T16:54:02.639+05:30 | event=http.request.received | data={\"method\":\"GET\",\"path\":\"/api/restaurants\"}"
  }'
```

**Response:**
```json
{
  "matched": true,
  "template": {
    "id": "template-10-1767019098832",
    "template": "svc=restaurants-service | level=INFO | ts=<DATE>T<IPV6> | event=http.request.received",
    "frequency": 36
  }
}
```

---

## 🔧 Troubleshooting

### Service Not Starting

1. **Check Port Availability:**
   ```bash
   # Windows
   netstat -ano | findstr :3005
   
   # Linux/Mac
   lsof -i :3005
   ```

2. **Check Log Paths:**
   - Verify service log directories exist
   - Check file permissions

3. **Check Dependencies:**
   ```bash
   npm install
   ```

### Template Mining Not Working

1. **Check Log Files:**
   - Ensure log files exist and have content
   - Verify log file paths are correct

2. **Check Template Storage:**
   - Verify `templates/` directory exists
   - Check write permissions

3. **Review Error Logs:**
   - Check console output for errors
   - Verify ML libraries are installed correctly

### Low Template Coverage

- **Increase `minClusterSize`**: Lower threshold for creating templates
- **Increase `maxClusters`**: Allow more clusters to be created
- **Check Log Diversity**: Ensure logs have common patterns

---

## 📚 Technologies Used

- **Node.js**: Runtime environment
- **TypeScript**: Type-safe JavaScript
- **Express**: Web framework
- **chokidar**: File system watcher
- **natural**: NLP library (TF-IDF, tokenization)
- **ml-kmeans**: K-means clustering algorithm
- **node-nlp**: Natural language processing

---

## 📝 Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Development | `npm run dev` | Start with auto-reload |
| Production | `npm start` | Start compiled version |
| Build | `npm run build` | Compile TypeScript |
| Train Model | `npm run train` | Train ML model |
| Test Templates | `npm run test:templates` | Test template mining |

---

## 🤝 Contributing

1. Follow TypeScript best practices
2. Add tests for new features
3. Update documentation
4. Ensure code compiles without errors

---

## 📄 License

This project is part of a research project for log structuring and enrichment in microservice architectures.

---

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Review API endpoint documentation
3. Check service logs for errors

---

**Last Updated**: December 2025
