# quick-generate-alerts.ps1
# Fast script to quickly generate alerts in all 4 services

Write-Host "Quick Alert Generation - All Services" -ForegroundColor Cyan
Write-Host ""

$services = @(
    @{name="orders-service"; port=3002; invalid="/api/orders/123invalid"},
    @{name="restaurants-service"; port=3001; invalid="/api/restaurants/123invalid"},
    @{name="delivery-service"; port=3004; invalid="/api/delivery/123invalid"},
    @{name="users-service"; port=3003; invalid="/api/auth/invalid-endpoint"}
)

# Quick burst: 8 errors per service in rapid succession
Write-Host "Sending error bursts to all services..." -ForegroundColor Yellow
foreach ($service in $services) {
    Write-Host "  $($service.name)..." -ForegroundColor Gray -NoNewline
    1..8 | ForEach-Object {
        try {
            Invoke-WebRequest -Uri "http://localhost:$($service.port)$($service.invalid)" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop | Out-Null
        } catch {
            # Errors are expected
        }
        Start-Sleep -Milliseconds 500
    }
    Write-Host " Done" -ForegroundColor Green
}

Write-Host ""
Write-Host "Waiting 5 seconds for alert detection..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check results
Write-Host ""
Write-Host "Alert Status:" -ForegroundColor Cyan
$total = 0
foreach ($service in $services) {
    $file = "$($service.name)/logs/alert/$($service.name)-alert-data.ndjson"
    if (Test-Path $file) {
        $lines = (Get-Content $file | Measure-Object -Line).Lines
        Write-Host "  $($service.name): $lines alerts" -ForegroundColor Green
        $total += $lines
    } else {
        Write-Host "  $($service.name): No alerts yet" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Total: $total alerts across all services" -ForegroundColor Cyan

