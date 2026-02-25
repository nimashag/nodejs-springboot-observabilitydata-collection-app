# Quick Start - Anomaly Detection Agent

This guide will help you get the anomaly detection agent running quickly.

## Prerequisites Check

```bash
# Check Python
python --version    # Should be 3.8+

# Check Node.js
node --version      # Should be 14+
npm --version
```

## Installation Steps

### 1. Navigate to directory

```bash
cd anomaly-detection-agent
```

### 2. Setup Python virtual environment

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1

# Windows CMD:
.venv\Scripts\activate.bat

# Linux/Mac:
source .venv/bin/activate
```

### 3. Install all dependencies

```bash
# Install Python packages
pip install -r requirements.txt

# Install Node.js packages
npm install
```

### 4. Verify setup

```bash
npm run preflight
```

## Running the Service

### Option 1: API Server Only (Serves Existing Data)

```bash
npm run api
```

The API will be available at: http://localhost:3007

**Endpoints:**

- http://localhost:3007/api/incidents
- http://localhost:3007/api/status
- http://localhost:3007/health

### Option 2: Detection Pipeline Only (Generates Data)

```bash
# Run once
npm start

# Run continuously
npm run start:watch

# Run without email
npm run start:no-email
```

### Option 3: Both API + Detection (Recommended)

**Terminal 1 - Start API Server:**

```bash
cd anomaly-detection-agent
npm run api
```

**Terminal 2 - Run Detection Pipeline:**

```bash
cd anomaly-detection-agent
# Activate virtual environment first!
.\.venv\Scripts\Activate.ps1
npm run start:watch
```

## Integration with Frontend

The observability dashboard reads from the API:

**Terminal 1 - Anomaly Agent API:**

```bash
cd anomaly-detection-agent
npm run api
```

**Terminal 2 - Observability Dashboard:**

```bash
cd observability-dashboard-frontend
npm run dev
```

The dashboard will fetch incidents from: http://localhost:3007/api/incidents

## Testing the API

### Using curl (Git Bash/Linux/Mac)

```bash
# Get incidents
curl http://localhost:3007/api/incidents

# Get status
curl http://localhost:3007/api/status

# Health check
curl http://localhost:3007/health
```

### Using PowerShell

```powershell
# Get incidents
Invoke-RestMethod -Uri http://localhost:3007/api/incidents

# Get status
Invoke-RestMethod -Uri http://localhost:3007/api/status
```

### Using Browser

Open in browser:

- http://localhost:3007/api/incidents
- http://localhost:3007/api/status

## Common Issues

### Virtual environment not activated

**Symptom:** Python packages not found

**Solution:**

```bash
# Always activate before running Python commands
.\.venv\Scripts\Activate.ps1   # Windows
source .venv/bin/activate        # Linux/Mac
```

### Node modules not installed

**Symptom:** `Cannot find module 'express'`

**Solution:**

```bash
npm install
```

### Port 3007 already in use

**Symptom:** `Error: listen EADDRINUSE: address already in use :::3007`

**Solution:**

```bash
# Windows - Find and kill process
netstat -ano | findstr :3007
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3007 | xargs kill -9

# Or use different port
set PORT=3008 && npm run api
```

### No incidents file

**Symptom:** API returns empty incidents array

**Solution:** Run the detection pipeline first:

```bash
npm run start:once
```

## Next Steps

1. ✅ API Server running on port 3007
2. ✅ Detection pipeline running (continuous mode)
3. ✅ Frontend dashboard connected
4. 📧 (Optional) Configure email service

See [README.md](README.md) for detailed documentation.
