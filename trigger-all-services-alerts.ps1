# trigger-all-services-alerts.ps1
# Generate real traffic to trigger alerts in ALL 4 services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  TRIGGERING ALERTS IN ALL SERVICES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{name="orders-service"; port=3002; valid="/api/orders"; invalid="/api/orders/invalid-endpoint"},
    @{name="restaurants-service"; port=3001; valid="/api/restaurants"; invalid="/api/restaurants/invalid-endpoint"},
    @{name="delivery-service"; port=3004; valid="/api/delivery"; invalid="/api/delivery/invalid-endpoint"},
    @{name="users-service"; port=3003; valid="/api/auth/login"; invalid="/api/auth/invalid-endpoint"}
)

function Invoke-SafeRequest {
    param($url, $serviceName)
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
        return @{success=$true; status=$response.StatusCode}
    } catch {
        $status = 0
        if ($_.Exception.Response) {
            $status = [int]$_.Exception.Response.StatusCode
        }
        return @{success=$false; status=$status}
    }
}

# Phase 1: Generate Error Burst (5+ errors in 1 minute)
Write-Host "Phase 1: Generating Error Burst (10 errors per service)..." -ForegroundColor Yellow
foreach ($service in $services) {
    Write-Host "  Targeting $($service.name)..." -ForegroundColor Gray
    1..10 | ForEach-Object {
        $url = "http://localhost:$($service.port)$($service.invalid)"
        $result = Invoke-SafeRequest -url $url -serviceName $service.name
        Start-Sleep -Milliseconds 2000
    }
    Write-Host "    Sent 10 error requests to $($service.name)" -ForegroundColor Green
}
Write-Host ""

# Wait a moment for alert detection
Write-Host "Waiting 5 seconds for alert detection..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Phase 2: Generate More Errors to Trigger Availability Issues
Write-Host "Phase 2: Generating Mixed Traffic..." -ForegroundColor Yellow
foreach ($service in $services) {
    Write-Host "  Targeting $($service.name)..." -ForegroundColor Gray
    1..20 | ForEach-Object {
        $useError = $_ % 2 -eq 0
        $endpoint = if ($useError) { $service.invalid } else { $service.valid }
        $url = "http://localhost:$($service.port)$endpoint"
        Invoke-SafeRequest -url $url -serviceName $service.name | Out-Null
        Start-Sleep -Milliseconds 500
    }
    Write-Host "    Sent 20 mixed requests to $($service.name)" -ForegroundColor Green
}
Write-Host ""

# Wait for alert detection
Write-Host "Waiting 5 seconds for alert detection..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Phase 3: Generate Continuous Traffic
Write-Host "Phase 3: Generating Continuous Traffic (60 requests per service)..." -ForegroundColor Yellow
foreach ($service in $services) {
    Write-Host "  Targeting $($service.name)..." -ForegroundColor Gray
    1..60 | ForEach-Object {
        $useError = (Get-Random -Maximum 10) -lt 3
        $endpoint = if ($useError) { $service.invalid } else { $service.valid }
        $url = "http://localhost:$($service.port)$endpoint"
        Invoke-SafeRequest -url $url -serviceName $service.name | Out-Null
        
        if ($_ % 20 -eq 0) {
            Write-Host "    [$($service.name)] Sent $_ requests..." -ForegroundColor Gray
        }
        Start-Sleep -Milliseconds 300
    }
    Write-Host "    Sent 60 requests to $($service.name)" -ForegroundColor Green
}
Write-Host ""

# Final wait for all alerts to be detected
Write-Host "Waiting 10 seconds for final alert detection..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ALERT TRIGGERING COMPLETE" -ForegroundColor Cyan
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

if ($totalAlerts -eq 0) {
    Write-Host "No alerts detected yet. Possible reasons:" -ForegroundColor Yellow
    Write-Host "   1. Services may not be running" -ForegroundColor Gray
    Write-Host "   2. Requests may not be reaching services" -ForegroundColor Gray
    Write-Host "   3. Alert thresholds may not be met yet" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Try running this script again after ensuring all services are running." -ForegroundColor Yellow
} else {
    Write-Host "Alert data collection successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "To view alert data:" -ForegroundColor Cyan
    foreach ($service in $services) {
        $file = "$($service.name)/logs/alert/$($service.name)-alert-data.ndjson"
        if (Test-Path $file) {
            Write-Host "  Get-Content $file" -ForegroundColor White
        }
    }
}
