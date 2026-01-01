# generate-real-alerts-all-services.ps1
# Generate real traffic to trigger alerts in ALL 4 services with proper error handling

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GENERATING REAL ALERTS - ALL SERVICES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{name="orders-service"; port=3002; valid="/api/orders"; invalid="/api/orders/invalid123"; invalidId="/api/orders/123invalid456"},
    @{name="restaurants-service"; port=3001; valid="/api/restaurants"; invalid="/api/restaurants/invalid123"; invalidId="/api/restaurants/123invalid456"},
    @{name="delivery-service"; port=3004; valid="/api/delivery"; invalid="/api/delivery/invalid123"; invalidId="/api/delivery/123invalid456"},
    @{name="users-service"; port=3003; valid="/api/auth/login"; invalid="/api/auth/invalid123"; invalidId="/api/auth/123invalid456"}
)

function Invoke-SafeRequest {
    param($url, $serviceName)
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        return @{success=$true; status=$response.StatusCode; isError=($response.StatusCode -ge 400)}
    } catch {
        $status = 0
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        } elseif ($_.Exception -match "404") {
            $status = 404
        } elseif ($_.Exception -match "400") {
            $status = 400
        } else {
            $status = 500
        }
        return @{success=$false; status=$status; isError=$true}
    }
}

# Phase 1: Generate Error Burst - Send 10 errors quickly (within 1 minute)
Write-Host "Phase 1: Generating Error Burst (10 errors per service in 1 minute)..." -ForegroundColor Yellow
foreach ($service in $services) {
    Write-Host "  Targeting $($service.name)..." -ForegroundColor Gray
    $errorCount = 0
    1..10 | ForEach-Object {
        # Alternate between invalid endpoint and invalid ID format
        $endpoint = if ($_ % 2 -eq 0) { $service.invalid } else { $service.invalidId }
        $url = "http://localhost:$($service.port)$endpoint"
        $result = Invoke-SafeRequest -url $url -serviceName $service.name
        if ($result.isError) { $errorCount++ }
        Start-Sleep -Milliseconds 5000  # 5 seconds between errors (10 errors in 50 seconds = within 1 minute)
    }
    Write-Host "    Sent 10 error requests to $($service.name) ($errorCount detected as errors)" -ForegroundColor Green
}
Write-Host ""

# Wait for alert detection
Write-Host "Waiting 10 seconds for alert detection..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Phase 2: Generate Mixed Traffic (50% error rate for availability issues)
Write-Host "Phase 2: Generating Mixed Traffic (50 percent error rate)..." -ForegroundColor Yellow
foreach ($service in $services) {
    Write-Host "  Targeting $($service.name)..." -ForegroundColor Gray
    $errorCount = 0
    $totalCount = 0
    1..20 | ForEach-Object {
        $useError = $_ % 2 -eq 0  # Alternate between error and success
        if ($useError) {
            $endpoint = if ($_ % 4 -eq 0) { $service.invalid } else { $service.invalidId }
        } else {
            $endpoint = $service.valid
        }
        $url = "http://localhost:$($service.port)$endpoint"
        $result = Invoke-SafeRequest -url $url -serviceName $service.name
        $totalCount++
        if ($result.isError) { $errorCount++ }
        Start-Sleep -Milliseconds 1000
    }
    Write-Host "    Sent 20 requests to $($service.name) ($errorCount errors, $([math]::Round($errorCount/$totalCount*100, 1)) percent error rate)" -ForegroundColor Green
}
Write-Host ""

# Wait for alert detection
Write-Host "Waiting 10 seconds for alert detection..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Phase 3: Generate Continuous Traffic with varied patterns
Write-Host "Phase 3: Generating Continuous Traffic (100 requests per service)..." -ForegroundColor Yellow
foreach ($service in $services) {
    Write-Host "  Targeting $($service.name)..." -ForegroundColor Gray
    $errorCount = 0
    1..100 | ForEach-Object {
        # 30% error rate for realistic pattern
        $useError = (Get-Random -Maximum 10) -lt 3
        if ($useError) {
            $endpoint = if ((Get-Random -Maximum 2) -eq 0) { $service.invalid } else { $service.invalidId }
        } else {
            $endpoint = $service.valid
        }
        $url = "http://localhost:$($service.port)$endpoint"
        $result = Invoke-SafeRequest -url $url -serviceName $service.name
        if ($result.isError) { $errorCount++ }
        
        if ($_ % 25 -eq 0) {
            Write-Host "    [$($service.name)] Sent $_ requests ($errorCount errors)..." -ForegroundColor Gray
        }
        Start-Sleep -Milliseconds 200
    }
    Write-Host "    Completed $($service.name): 100 requests ($errorCount errors)" -ForegroundColor Green
}
Write-Host ""

# Final wait for all alerts to be detected
Write-Host "Waiting 15 seconds for final alert detection..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ALERT GENERATION COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check alert data files
Write-Host "Checking Alert Data Files:" -ForegroundColor Cyan
Write-Host ""

$totalAlerts = 0
foreach ($service in $services) {
    $file = "$($service.name)/logs/alert/$($service.name)-alert-data.ndjson"
    if (Test-Path $file) {
        $lines = (Get-Content $file | Measure-Object -Line).Lines
        $size = (Get-Item $file).Length / 1KB
        Write-Host "[OK] $($service.name)" -ForegroundColor Green
        Write-Host "     Alerts: $lines" -ForegroundColor White
        Write-Host "     Size: $([math]::Round($size, 2)) KB" -ForegroundColor Gray
        Write-Host "     File: $file" -ForegroundColor Gray
        $totalAlerts += $lines
    } else {
        Write-Host "[  ] $($service.name)" -ForegroundColor Yellow
        Write-Host "     No alert data file yet" -ForegroundColor Gray
        Write-Host "     Expected: $file" -ForegroundColor Gray
    }
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Alerts Collected: $totalAlerts" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($totalAlerts -gt 0) {
    Write-Host "Success! Alert data collection is working." -ForegroundColor Green
    Write-Host ""
    Write-Host "To view alert data:" -ForegroundColor Cyan
    foreach ($service in $services) {
        $file = "$($service.name)/logs/alert/$($service.name)-alert-data.ndjson"
        if (Test-Path $file) {
            Write-Host "  Get-Content $file" -ForegroundColor White
        }
    }
} else {
    Write-Host "No alerts detected yet. Make sure:" -ForegroundColor Yellow
    Write-Host "  1. All services are running" -ForegroundColor Gray
    Write-Host "  2. Alert collectors are initialized (check service logs)" -ForegroundColor Gray
    Write-Host "  3. Services are accessible on the correct ports" -ForegroundColor Gray
}

