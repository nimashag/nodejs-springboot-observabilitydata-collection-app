# extended-data-collection.ps1
# Extended data collection with multiple scenarios over time

param(
    [int]$TotalHours = 24,
    [switch]$RunContinuously = $false
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  EXTENDED DATA COLLECTION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Duration: $TotalHours hours" -ForegroundColor Yellow
Write-Host "Start Time: $(Get-Date)" -ForegroundColor Yellow
Write-Host ""

$scenarios = @(
    @{name="Normal Traffic"; duration=60; rps=5; script="normal"},
    @{name="Medium Load"; duration=120; rps=15; script="mixed"},
    @{name="High Load"; duration=30; rps=30; script="mixed"},
    @{name="Error Burst"; duration=10; rps=20; script="error"},
    @{name="Slow Requests"; duration=20; rps=10; script="latency"},
    @{name="Availability Issues"; duration=15; rps=25; script="availability"}
)

$endTime = (Get-Date).AddHours($TotalHours)
$scenarioCount = 0

while ((Get-Date) -lt $endTime -or $RunContinuously) {
    foreach ($scenario in $scenarios) {
        if ((Get-Date) -ge $endTime -and -not $RunContinuously) {
            break
        }
        
        $scenarioCount++
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Magenta
        Write-Host "  Scenario $scenarioCount : $($scenario.name)" -ForegroundColor Magenta
        Write-Host "========================================" -ForegroundColor Magenta
        Write-Host "Duration: $($scenario.duration) minutes" -ForegroundColor Yellow
        Write-Host "Target RPS: $($scenario.rps)" -ForegroundColor Yellow
        Write-Host "Start: $(Get-Date)" -ForegroundColor Gray
        
        # Run the scenario using the load generation script
        $startTime = Get-Date
        $endScenarioTime = $startTime.AddMinutes($scenario.duration)
        $requestCount = 0
        
        while ((Get-Date) -lt $endScenarioTime) {
            # Generate requests based on RPS
            $delay = 1000 / $scenario.rps
            
            # Mix of services
            $servicePorts = @(3002, 3001, 3004, 3003)
            $port = $servicePorts[Get-Random -Maximum $servicePorts.Length]
            
            # Determine request type based on scenario
            $useError = $false
            if ($scenario.script -eq "error") {
                $useError = (Get-Random -Maximum 10) -lt 5  # 50% errors
            } elseif ($scenario.script -eq "availability") {
                $useError = (Get-Random -Maximum 10) -lt 6  # 60% errors
            } elseif ($scenario.script -eq "mixed") {
                $useError = (Get-Random -Maximum 10) -lt 3  # 30% errors
            }
            
            $endpoint = if ($useError) { "/api/invalid" } else { "/api/orders" }
            $url = "http://localhost:$port$endpoint"
            
            try {
                Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop | Out-Null
            } catch {
                # Errors are expected
            }
            
            # Add delay for slow requests scenario
            if ($scenario.script -eq "latency") {
                Start-Sleep -Milliseconds (Get-Random -Minimum 3000 -Maximum 6000)
            }
            
            $requestCount++
            Start-Sleep -Milliseconds $delay
        }
        
        Write-Host "End: $(Get-Date)" -ForegroundColor Gray
        Write-Host "Requests Generated: $requestCount" -ForegroundColor Green
        
        # Show current alert data status
        Write-Host ""
        Write-Host "Current Alert Data Status:" -ForegroundColor Cyan
        $services = @("delivery-service", "orders-service", "restaurants-service", "users-service")
        foreach ($service in $services) {
            $file = "$service/logs/alert/$service-alert-data.ndjson"
            if (Test-Path $file) {
                $lines = (Get-Content $file | Measure-Object -Line).Lines
                Write-Host "  $service : $lines alerts" -ForegroundColor Green
            }
        }
        
        Write-Host ""
        Write-Host "Pausing 30 seconds before next scenario..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
    }
    
    if ($RunContinuously) {
        Write-Host ""
        Write-Host "Completed one full cycle. Starting again..." -ForegroundColor Magenta
        Start-Sleep -Seconds 60
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DATA COLLECTION COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "End Time: $(Get-Date)" -ForegroundColor Yellow
Write-Host ""

# Final status
Write-Host "Final Alert Data Summary:" -ForegroundColor Cyan
$services = @("delivery-service", "orders-service", "restaurants-service", "users-service")
$totalAlerts = 0
foreach ($service in $services) {
    $file = "$service/logs/alert/$service-alert-data.ndjson"
    if (Test-Path $file) {
        $lines = (Get-Content $file | Measure-Object -Line).Lines
        $size = (Get-Item $file).Length / 1KB
        Write-Host "  $service : $lines alerts ($([math]::Round($size, 2)) KB)" -ForegroundColor Green
        $totalAlerts += $lines
    }
}
Write-Host ""
Write-Host "Total Alerts Collected: $totalAlerts" -ForegroundColor Cyan

