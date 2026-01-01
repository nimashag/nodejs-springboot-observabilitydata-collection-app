# monitor-alert-data.ps1
# Real-time monitoring of alert data collection progress

param(
    [int]$IntervalSeconds = 30,
    [switch]$Continuous = $true
)

function Show-Status {
    Clear-Host
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  ALERT DATA COLLECTION MONITOR" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    $services = @(
        @{name="delivery-service"; file="delivery-service/logs/alert/delivery-service-alert-data.ndjson"},
        @{name="orders-service"; file="orders-service/logs/alert/orders-service-alert-data.ndjson"},
        @{name="restaurants-service"; file="restaurants-service/logs/alert/restaurants-service-alert-data.ndjson"},
        @{name="users-service"; file="users-service/logs/alert/users-service-alert-data.ndjson"}
    )
    
    $totalAlerts = 0
    $totalSize = 0
    
    foreach ($service in $services) {
        if (Test-Path $service.file) {
            $lines = (Get-Content $service.file | Measure-Object -Line).Lines
            $size = (Get-Item $service.file).Length / 1KB
            $lastModified = (Get-Item $service.file).LastWriteTime
            
            Write-Host "[OK] $($service.name)" -ForegroundColor Green
            Write-Host "     Alerts: $lines" -ForegroundColor White
            Write-Host "     Size: $([math]::Round($size, 2)) KB" -ForegroundColor Gray
            Write-Host "     Last Updated: $lastModified" -ForegroundColor Gray
            
            $totalAlerts += $lines
            $totalSize += $size
        } else {
            Write-Host "[  ] $($service.name)" -ForegroundColor Yellow
            Write-Host "     No alert data file yet" -ForegroundColor Gray
        }
        Write-Host ""
    }
    
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Total Alerts: $totalAlerts" -ForegroundColor Cyan
    Write-Host "Total Size: $([math]::Round($totalSize, 2)) KB" -ForegroundColor Cyan
    Write-Host "Last Updated: $(Get-Date)" -ForegroundColor Gray
    Write-Host "========================================" -ForegroundColor Cyan
    
    if ($Continuous) {
        Write-Host ""
        Write-Host "Refreshing in $IntervalSeconds seconds... (Press Ctrl+C to stop)" -ForegroundColor Yellow
    }
}

if ($Continuous) {
    while ($true) {
        Show-Status
        Start-Sleep -Seconds $IntervalSeconds
    }
} else {
    Show-Status
}

