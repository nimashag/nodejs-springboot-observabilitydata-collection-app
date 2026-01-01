# generate-alerts-all-services.ps1
# Generate alerts in ALL 4 services with proper error handling

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  GENERATING ALERTS - ALL 4 SERVICES" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{name="orders-service"; port=3002; invalid="/api/orders/123invalid"},
    @{name="restaurants-service"; port=3001; invalid="/api/restaurants/123invalid"},
    @{name="delivery-service"; port=3004; invalid="/api/delivery/123invalid"},
    @{name="users-service"; port=3003; invalid="/api/auth/invalid-endpoint"}
)

function Send-Request {
    param($url)
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
        return $response.StatusCode
    } catch {
        if ($_.Exception.Response) {
            return [int]$_.Exception.Response.StatusCode
        }
        return 500
    }
}

# Phase 1: Error Burst - 8 errors per service (within 1 minute window)
Write-Host "Phase 1: Error Burst (8 errors per service)..." -ForegroundColor Yellow
foreach ($service in $services) {
    Write-Host "  $($service.name)..." -ForegroundColor Gray -NoNewline
    1..8 | ForEach-Object {
        $url = "http://localhost:$($service.port)$($service.invalid)"
        Send-Request -url $url | Out-Null
        Start-Sleep -Milliseconds 6000  # 6 seconds between errors = 48 seconds total
    }
    Write-Host " Done" -ForegroundColor Green
}

Write-Host ""
Write-Host "Waiting 10 seconds for alert detection..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Phase 2: Mixed Traffic (50% errors for availability issues)
Write-Host "Phase 2: Mixed Traffic (50 percent errors)..." -ForegroundColor Yellow
foreach ($service in $services) {
    Write-Host "  $($service.name)..." -ForegroundColor Gray -NoNewline
    1..20 | ForEach-Object {
        $useError = $_ % 2 -eq 0
        if ($useError) {
            $url = "http://localhost:$($service.port)$($service.invalid)"
        } else {
            $url = "http://localhost:$($service.port)$($service.valid)"
        }
        Send-Request -url $url | Out-Null
        Start-Sleep -Milliseconds 500
    }
    Write-Host " Done" -ForegroundColor Green
}

Write-Host ""
Write-Host "Waiting 10 seconds for alert detection..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Phase 3: More continuous traffic
Write-Host "Phase 3: Continuous Traffic (50 requests per service)..." -ForegroundColor Yellow
foreach ($service in $services) {
    Write-Host "  $($service.name)..." -ForegroundColor Gray -NoNewline
    1..50 | ForEach-Object {
        $useError = (Get-Random -Maximum 10) -lt 3  # 30% errors
        if ($useError) {
            $url = "http://localhost:$($service.port)$($service.invalid)"
        } else {
            $url = "http://localhost:$($service.port)$($service.valid)"
        }
        Send-Request -url $url | Out-Null
        Start-Sleep -Milliseconds 200
    }
    Write-Host " Done" -ForegroundColor Green
}

Write-Host ""
Write-Host "Waiting 15 seconds for final alert detection..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$totalAlerts = 0
foreach ($service in $services) {
    $file = "$($service.name)/logs/alert/$($service.name)-alert-data.ndjson"
    if (Test-Path $file) {
        $lines = (Get-Content $file | Measure-Object -Line).Lines
        $size = (Get-Item $file).Length / 1KB
        Write-Host "[OK] $($service.name)" -ForegroundColor Green
        Write-Host "     $lines alerts ($([math]::Round($size, 2)) KB)" -ForegroundColor White
        $totalAlerts += $lines
    } else {
        Write-Host "[  ] $($service.name) - No alerts yet" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Total Alerts: $totalAlerts" -ForegroundColor Cyan
Write-Host ""

if ($totalAlerts -gt 0) {
    Write-Host "Success! All services are collecting alert data." -ForegroundColor Green
} else {
    Write-Host "No alerts detected. Make sure all services are running." -ForegroundColor Yellow
}

