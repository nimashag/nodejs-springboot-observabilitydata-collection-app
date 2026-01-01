# Quick Data Collection Reference

## 🚀 Quick Start Commands

### Start All Services First

```powershell
# Terminal 1 - Delivery Service
cd delivery-service && npm run dev

# Terminal 2 - Orders Service  
cd orders-service && npm run dev

# Terminal 3 - Restaurants Service
cd restaurants-service && npm run dev

# Terminal 4 - Users Service
cd users-service && mvn spring-boot:run
```

### Option 1: Quick Test (30 minutes)
```powershell
.\generate-realistic-load.ps1 -DurationMinutes 30 -RequestsPerSecond 10
```

### Option 2: Medium Collection (2 hours)
```powershell
.\scenario-load-tests.ps1 -Scenario all
```

### Option 3: Large Dataset (24 hours)
```powershell
.\extended-data-collection.ps1 -TotalHours 24
```

### Option 4: Professional Load Test (k6)
```bash
k6 run load-test.js
```

## 📊 Monitor Progress

```powershell
# Real-time monitoring
.\monitor-alert-data.ps1
```

## 📁 Check Results

```powershell
# Count alerts per service
Get-ChildItem -Path "*/logs/alert/*-alert-data.ndjson" -Recurse | ForEach-Object {
    $lines = (Get-Content $_.FullName | Measure-Object -Line).Lines
    Write-Host "$($_.Name): $lines alerts"
}
```

## 🔄 Aggregate Data

```bash
cd alert-agent-data-collect-service
npm start
```

## 📚 Full Documentation

See `DATA_COLLECTION_GUIDE.md` for complete details.

