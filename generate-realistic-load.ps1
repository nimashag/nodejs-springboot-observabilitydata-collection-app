# generate-realistic-load.ps1
# Comprehensive load testing script for collecting real alert data

param(
    [int]$DurationMinutes = 60,
    [int]$RequestsPerSecond = 10,
    [switch]$IncludeErrors = $true,
    [switch]$IncludeSlowRequests = $true
)

$services = @(
    @{name="orders-service"; port=3002; endpoints=@("/api/orders", "/api/orders/invalid")},
    @{name="restaurants-service"; port=3001; endpoints=@("/api/restaurants", "/api/restaurants/invalid")},
    @{name="delivery-service"; port=3004; endpoints=@("/api/delivery", "/api/delivery/invalid")},
    @{name="users-service"; port=3003; endpoints=@("/api/auth/login", "/api/auth/invalid")}
)

$endTime = (Get-Date).AddMinutes($DurationMinutes)
$requestCount = 0
$errorCount = 0
$startTime = Get-Date

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  REALISTIC LOAD TESTING" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Duration: $DurationMinutes minutes" -ForegroundColor Yellow
Write-Host "Target RPS: $RequestsPerSecond" -ForegroundColor Yellow
Write-Host "Start Time: $startTime" -ForegroundColor Yellow
Write-Host "End Time: $endTime" -ForegroundColor Yellow
Write-Host ""

$delay = 1000 / $RequestsPerSecond
$lastProgressUpdate = Get-Date

while ((Get-Date) -lt $endTime) {
    foreach ($service in $services) {
        # Mix of successful and error requests
        $useError = $IncludeErrors -and (Get-Random -Maximum 10) -lt 3  # 30% errors
        $useSlow = $IncludeSlowRequests -and (Get-Random -Maximum 10) -lt 2  # 20% slow
        
        $endpoint = if ($useError) { 
            $service.endpoints[1] 
        } else { 
            $service.endpoints[0] 
        }
        
        $url = "http://localhost:$($service.port)$endpoint"
        
        try {
            $reqStartTime = Get-Date
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop
            $reqDuration = ((Get-Date) - $reqStartTime).TotalMilliseconds
            
            # Simulate slow requests
            if ($useSlow -and $reqDuration -lt 3000) {
                Start-Sleep -Milliseconds (Get-Random -Minimum 3000 -Maximum 6000)
            }
            
            $requestCount++
            if ($response.StatusCode -ge 400) { $errorCount++ }
        } catch {
            $requestCount++
            $errorCount++
        }
        
        Start-Sleep -Milliseconds $delay
    }
    
    # Progress update every minute
    $elapsed = ((Get-Date) - $startTime).TotalMinutes
    if (((Get-Date) - $lastProgressUpdate).TotalSeconds -ge 60) {
        Write-Host "[$([math]::Round($elapsed, 1)) min] Requests: $requestCount | Errors: $errorCount | Rate: $([math]::Round($errorCount/$requestCount*100, 1))%" -ForegroundColor Gray
        $lastProgressUpdate = Get-Date
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LOAD TEST COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Total Requests: $requestCount" -ForegroundColor Green
Write-Host "Total Errors: $errorCount" -ForegroundColor $(if($errorCount -gt 0){'Yellow'}else{'Green'})
Write-Host "Error Rate: $([math]::Round(($errorCount/$requestCount)*100, 2))%" -ForegroundColor White
Write-Host "Duration: $([math]::Round(((Get-Date) - $startTime).TotalMinutes, 2)) minutes" -ForegroundColor White
Write-Host ""
Write-Host "Check alert data files:" -ForegroundColor Cyan
foreach ($service in $services) {
    $alertFile = "$($service.name)/logs/alert/$($service.name)-alert-data.ndjson"
    if (Test-Path $alertFile) {
        $lines = (Get-Content $alertFile | Measure-Object -Line).Lines
        Write-Host "  $($service.name): $lines alerts" -ForegroundColor Green
    }
}

