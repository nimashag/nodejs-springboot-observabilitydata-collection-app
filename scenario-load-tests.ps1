# scenario-load-tests.ps1
# Different scenarios to generate diverse alert data

param(
    [string]$Scenario = "all"
)

function Invoke-SafeRequest {
    param($url)
    try {
        Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 30 -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Run-Scenario {
    param($name, $scriptBlock)
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Scenario: $name" -ForegroundColor Cyan
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "Start Time: $(Get-Date)" -ForegroundColor Yellow
    & $scriptBlock
    Write-Host "End Time: $(Get-Date)" -ForegroundColor Yellow
    Write-Host "Scenario Complete!" -ForegroundColor Green
}

# Scenario 1: Normal Traffic (baseline)
function Scenario-NormalTraffic {
    Write-Host "Running normal traffic for 30 minutes..." -ForegroundColor Yellow
    $endTime = (Get-Date).AddMinutes(30)
    $count = 0
    
    while ((Get-Date) -lt $endTime) {
        Invoke-SafeRequest "http://localhost:3002/api/orders" | Out-Null
        Invoke-SafeRequest "http://localhost:3001/api/restaurants" | Out-Null
        Invoke-SafeRequest "http://localhost:3004/api/delivery" | Out-Null
        Invoke-SafeRequest "http://localhost:3003/api/auth/login" | Out-Null
        $count++
        if ($count % 60 -eq 0) {
            Write-Host "  [$count requests] $(Get-Date)" -ForegroundColor Gray
        }
        Start-Sleep -Seconds 1
    }
}

# Scenario 2: Error Burst (trigger error_burst alerts)
function Scenario-ErrorBurst {
    Write-Host "Generating error burst (100 errors over 5 minutes)..." -ForegroundColor Yellow
    1..100 | ForEach-Object {
        Invoke-SafeRequest "http://localhost:3002/api/orders/invalid-$_" | Out-Null
        Invoke-SafeRequest "http://localhost:3001/api/restaurants/invalid-$_" | Out-Null
        Invoke-SafeRequest "http://localhost:3004/api/delivery/invalid-$_" | Out-Null
        Invoke-SafeRequest "http://localhost:3003/api/auth/invalid-$_" | Out-Null
        
        if ($_ % 20 -eq 0) {
            Write-Host "  [$_ errors sent]" -ForegroundColor Gray
        }
        Start-Sleep -Milliseconds 3000  # 3 seconds between errors
    }
}

# Scenario 3: High Latency (trigger high_latency alerts)
function Scenario-HighLatency {
    Write-Host "Simulating high latency (slow requests)..." -ForegroundColor Yellow
    1..50 | ForEach-Object {
        $start = Get-Date
        Invoke-SafeRequest "http://localhost:3002/api/orders" | Out-Null
        $duration = ((Get-Date) - $start).TotalMilliseconds
        
        # Add delay to simulate slow processing
        if ($duration -lt 3000) {
            Start-Sleep -Seconds 4  # Simulate slow processing
        }
        
        if ($_ % 10 -eq 0) {
            Write-Host "  [$_ slow requests]" -ForegroundColor Gray
        }
    }
}

# Scenario 4: Mixed Load (realistic production-like)
function Scenario-MixedLoad {
    Write-Host "Running mixed load for 60 minutes..." -ForegroundColor Yellow
    $endTime = (Get-Date).AddMinutes(60)
    $count = 0
    
    while ((Get-Date) -lt $endTime) {
        $rand = Get-Random -Maximum 100
        
        if ($rand -lt 70) {
            # Normal request (70%)
            Invoke-SafeRequest "http://localhost:3002/api/orders" | Out-Null
        } elseif ($rand -lt 90) {
            # Error request (20%)
            Invoke-SafeRequest "http://localhost:3002/api/orders/invalid" | Out-Null
        } else {
            # Slow request (10%)
            Invoke-SafeRequest "http://localhost:3002/api/orders" | Out-Null
            Start-Sleep -Seconds 4
        }
        
        $count++
        if ($count % 100 -eq 0) {
            Write-Host "  [$count requests] $(Get-Date)" -ForegroundColor Gray
        }
        
        Start-Sleep -Milliseconds 500
    }
}

# Scenario 5: Availability Issue (high error rate)
function Scenario-AvailabilityIssue {
    Write-Host "Simulating availability issues (60% error rate)..." -ForegroundColor Yellow
    1..200 | ForEach-Object {
        $useError = (Get-Random -Maximum 10) -lt 6  # 60% errors
        
        if ($useError) {
            Invoke-SafeRequest "http://localhost:3002/api/orders/invalid-$_" | Out-Null
        } else {
            Invoke-SafeRequest "http://localhost:3002/api/orders" | Out-Null
        }
        
        if ($_ % 50 -eq 0) {
            Write-Host "  [$_ requests]" -ForegroundColor Gray
        }
        Start-Sleep -Milliseconds 200
    }
}

# Run scenarios based on parameter
switch ($Scenario.ToLower()) {
    "normal" { Run-Scenario "Normal Traffic" { Scenario-NormalTraffic } }
    "error" { Run-Scenario "Error Burst" { Scenario-ErrorBurst } }
    "latency" { Run-Scenario "High Latency" { Scenario-HighLatency } }
    "mixed" { Run-Scenario "Mixed Load" { Scenario-MixedLoad } }
    "availability" { Run-Scenario "Availability Issue" { Scenario-AvailabilityIssue } }
    "all" {
        Run-Scenario "Normal Traffic" { Scenario-NormalTraffic }
        Start-Sleep -Seconds 10
        Run-Scenario "Error Burst" { Scenario-ErrorBurst }
        Start-Sleep -Seconds 10
        Run-Scenario "High Latency" { Scenario-HighLatency }
        Start-Sleep -Seconds 10
        Run-Scenario "Availability Issue" { Scenario-AvailabilityIssue }
        Start-Sleep -Seconds 10
        Run-Scenario "Mixed Load" { Scenario-MixedLoad }
    }
    default {
        Write-Host "Unknown scenario: $Scenario" -ForegroundColor Red
        Write-Host "Available scenarios: normal, error, latency, mixed, availability, all" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ALL SCENARIOS COMPLETE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Check alert data:" -ForegroundColor Cyan
$services = @("delivery-service", "orders-service", "restaurants-service", "users-service")
foreach ($service in $services) {
    $file = "$service/logs/alert/$service-alert-data.ndjson"
    if (Test-Path $file) {
        $lines = (Get-Content $file | Measure-Object -Line).Lines
        Write-Host "  $service : $lines alerts" -ForegroundColor Green
    }
}

