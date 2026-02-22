package com.app.usersservice.collector;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoClient;
import jakarta.annotation.PreDestroy;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.lang.management.ManagementFactory;
import java.lang.management.OperatingSystemMXBean;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

@Component
public class AlertDetector {
    
    private final String serviceName;
    private final String alertDataFile;
    private final List<RequestMetrics> recentRequests;
    private final Map<String, ActiveAlert> activeAlerts;
    private final ObjectMapper objectMapper;
    private final ScheduledExecutorService scheduler;
    private final List<AuthFailure> authFailures;
    private final List<TrafficRate> trafficRateHistory;
    private double baselineTrafficRate = 0.0;
    private boolean baselineCalculated = false;
    
    @Autowired(required = false)
    private MongoClient mongoClient;
    
    // Configuration thresholds - Original
    private static final int ERROR_BURST_THRESHOLD = 5;
    private static final long ERROR_BURST_WINDOW = 60000; // 1 minute
    private static final long HIGH_LATENCY_THRESHOLD = 3000; // 3 seconds
    private static final int HIGH_LATENCY_COUNT = 3;
    private static final double AVAILABILITY_ERROR_RATE = 0.5; // 50%
    private static final long METRICS_WINDOW = 300000; // 5 minutes
    
    // Configuration thresholds - New
    private static final double MEMORY_THRESHOLD_PERCENT = 85.0; // 85%
    private static final double CPU_THRESHOLD_PERCENT = 80.0; // 80%
    private static final double TRAFFIC_SPIKE_MULTIPLIER = 3.0; // 3x
    private static final double TRAFFIC_DROP_MULTIPLIER = 0.3; // 30%
    private static final long TRAFFIC_BASELINE_WINDOW = 600000; // 10 minutes
    private static final int AUTH_FAILURE_THRESHOLD = 10;
    private static final long AUTH_FAILURE_WINDOW = 300000; // 5 minutes
    
    public AlertDetector() {
        this.serviceName = "users-service";
        this.recentRequests = new CopyOnWriteArrayList<>();
        this.activeAlerts = new ConcurrentHashMap<>();
        this.authFailures = new CopyOnWriteArrayList<>();
        this.trafficRateHistory = new CopyOnWriteArrayList<>();
        this.objectMapper = new ObjectMapper();
        
        // Create alert data directory
        File alertDir = new File("alerts");
        if (!alertDir.exists()) {
            alertDir.mkdirs();
        }
        
        this.alertDataFile = "alerts/" + serviceName + "-alert-data.ndjson";
        
        // Start periodic check (every 30 seconds)
        this.scheduler = Executors.newSingleThreadScheduledExecutor();
        this.scheduler.scheduleAtFixedRate(
            this::checkAlertConditions,
            30,
            30,
            TimeUnit.SECONDS
        );
        
        System.out.println("[Alert Detector] Initialized for " + serviceName);
    }
    
    @PreDestroy
    public void cleanup() {
        if (scheduler != null && !scheduler.isShutdown()) {
            scheduler.shutdown();
            try {
                if (!scheduler.awaitTermination(5, TimeUnit.SECONDS)) {
                    scheduler.shutdownNow();
                }
            } catch (InterruptedException e) {
                scheduler.shutdownNow();
                Thread.currentThread().interrupt();
            }
        }
    }
    
    public void recordRequest(long duration, boolean isError, String errorType) {
        long now = System.currentTimeMillis();
        RequestMetrics metrics = new RequestMetrics(now, duration, isError, errorType);
        recentRequests.add(metrics);
        cleanOldMetrics(now);
        checkAlertConditions();
    }
    
    public void recordAuthFailure(String failureType) {
        authFailures.add(new AuthFailure(System.currentTimeMillis(), failureType));
    }
    
    private void cleanOldMetrics(long now) {
        long cutoff = now - METRICS_WINDOW;
        recentRequests.removeIf(r -> r.timestamp < cutoff);
    }
    
    private void checkAlertConditions() {
        long now = System.currentTimeMillis();
        cleanOldMetrics(now);
        
        // Original alerts
        checkErrorBurst(now);
        checkHighLatency(now);
        checkAvailability(now);
        
        // New resource alerts
        checkMemoryUsage(now);
        checkCPUUsage(now);
        
        // Traffic anomaly alerts
        checkTrafficAnomaly(now);
        
        // Security alerts
        checkAuthFailures(now);
        
        // Database alerts
        checkDatabaseConnection(now);
    }
    
    private void checkErrorBurst(long now) {
        String alertName = "error_burst";
        long burstWindow = now - ERROR_BURST_WINDOW;
        
        long recentErrorCount = recentRequests.stream()
            .filter(r -> r.isError && r.timestamp > burstWindow)
            .count();
        
        if (recentErrorCount >= ERROR_BURST_THRESHOLD) {
            if (!activeAlerts.containsKey(alertName)) {
                String severity = recentErrorCount >= 10 ? "high" :
                                 recentErrorCount >= 7 ? "medium" : "low";
                fireAlert(alertName, "error", severity);
            }
        } else {
            if (activeAlerts.containsKey(alertName)) {
                resolveAlert(alertName);
            }
        }
    }
    
    private void checkHighLatency(long now) {
        String alertName = "high_latency";
        
        List<RequestMetrics> recentNonError = recentRequests.stream()
            .filter(r -> !r.isError)
            .collect(Collectors.toList());
        
        if (recentNonError.size() < HIGH_LATENCY_COUNT) {
            return;
        }
        
        List<RequestMetrics> lastN = recentNonError.subList(
            Math.max(0, recentNonError.size() - HIGH_LATENCY_COUNT),
            recentNonError.size()
        );
        
        boolean allSlow = lastN.stream()
            .allMatch(r -> r.duration > HIGH_LATENCY_THRESHOLD);
        
        if (allSlow) {
            if (!activeAlerts.containsKey(alertName)) {
                double avgLatency = lastN.stream()
                    .mapToLong(r -> r.duration)
                    .average()
                    .orElse(0);
                
                String severity = avgLatency > 5000 ? "high" :
                                 avgLatency > 4000 ? "medium" : "low";
                fireAlert(alertName, "latency", severity);
            }
        } else {
            if (activeAlerts.containsKey(alertName)) {
                resolveAlert(alertName);
            }
        }
    }
    
    private void checkAvailability(long now) {
        String alertName = "availability_issue";
        
        if (recentRequests.size() < 10) {
            return;
        }
        
        long errorCount = recentRequests.stream()
            .filter(r -> r.isError)
            .count();
        
        double errorRate = (double) errorCount / recentRequests.size();
        
        if (errorRate >= AVAILABILITY_ERROR_RATE) {
            if (!activeAlerts.containsKey(alertName)) {
                String severity = errorRate >= 0.8 ? "high" :
                                 errorRate >= 0.65 ? "medium" : "low";
                fireAlert(alertName, "availability", severity);
            }
        } else {
            if (activeAlerts.containsKey(alertName)) {
                resolveAlert(alertName);
            }
        }
    }
    
    private void checkMemoryUsage(long now) {
        String alertName = "high_memory_usage";
        Runtime runtime = Runtime.getRuntime();
        long maxMemory = runtime.maxMemory();
        long usedMemory = runtime.totalMemory() - runtime.freeMemory();
        double usagePercent = (double) usedMemory / maxMemory * 100;
        
        if (usagePercent >= MEMORY_THRESHOLD_PERCENT) {
            if (!activeAlerts.containsKey(alertName)) {
                String severity = usagePercent >= 95 ? "critical" :
                                 usagePercent >= 90 ? "high" : "medium";
                fireAlert(alertName, "resource", severity);
            }
        } else if (usagePercent < MEMORY_THRESHOLD_PERCENT - 5) {
            if (activeAlerts.containsKey(alertName)) {
                resolveAlert(alertName);
            }
        }
    }
    
    private void checkCPUUsage(long now) {
        String alertName = "high_cpu_usage";
        
        double cpuUsage = -1.0;
        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        if (osBean instanceof com.sun.management.OperatingSystemMXBean) {
            com.sun.management.OperatingSystemMXBean sunOsBean = 
                (com.sun.management.OperatingSystemMXBean) osBean;
            double processCpuLoad = sunOsBean.getProcessCpuLoad();
            if (processCpuLoad >= 0) {
                cpuUsage = processCpuLoad * 100;
            }
        }
        
        if (cpuUsage >= CPU_THRESHOLD_PERCENT) {
            if (!activeAlerts.containsKey(alertName)) {
                String severity = cpuUsage >= 95 ? "critical" :
                                 cpuUsage >= 90 ? "high" : "medium";
                fireAlert(alertName, "resource", severity);
            }
        } else if (cpuUsage >= 0 && cpuUsage < CPU_THRESHOLD_PERCENT - 10) {
            if (activeAlerts.containsKey(alertName)) {
                resolveAlert(alertName);
            }
        }
    }
    
    private void checkTrafficAnomaly(long now) {
        long oneMinuteAgo = now - 60000;
        long recentTrafficCount = recentRequests.stream()
            .filter(r -> r.timestamp > oneMinuteAgo)
            .count();
        double currentRate = recentTrafficCount / 60.0;
        
        trafficRateHistory.add(new TrafficRate(now, recentTrafficCount));
        
        // Keep only last 10 minutes
        trafficRateHistory.removeIf(t -> t.timestamp <= now - TRAFFIC_BASELINE_WINDOW);
        
        // Calculate baseline
        if (!baselineCalculated && trafficRateHistory.size() >= 5) {
            baselineTrafficRate = trafficRateHistory.stream()
                .mapToDouble(t -> t.count / 60.0)
                .average()
                .orElse(0);
            baselineCalculated = true;
        }
        
        if (baselineCalculated && baselineTrafficRate > 0) {
            // Check for traffic spike
            if (currentRate >= baselineTrafficRate * TRAFFIC_SPIKE_MULTIPLIER) {
                String alertName = "traffic_spike";
                if (!activeAlerts.containsKey(alertName)) {
                    double multiplier = currentRate / baselineTrafficRate;
                    String severity = multiplier >= 5 ? "high" :
                                     multiplier >= 4 ? "medium" : "low";
                    fireAlert(alertName, "traffic", severity);
                }
            } else if (currentRate < baselineTrafficRate * (TRAFFIC_SPIKE_MULTIPLIER - 0.5)) {
                String alertName = "traffic_spike";
                if (activeAlerts.containsKey(alertName)) {
                    resolveAlert(alertName);
                }
            }
            
            // Check for traffic drop
            if (currentRate <= baselineTrafficRate * TRAFFIC_DROP_MULTIPLIER) {
                String alertName = "traffic_drop";
                if (!activeAlerts.containsKey(alertName)) {
                    double dropPercent = (1 - currentRate / baselineTrafficRate) * 100;
                    String severity = dropPercent >= 90 ? "critical" :
                                     dropPercent >= 80 ? "high" :
                                     dropPercent >= 70 ? "medium" : "low";
                    fireAlert(alertName, "traffic", severity);
                }
            } else if (currentRate > baselineTrafficRate * (TRAFFIC_DROP_MULTIPLIER + 0.2)) {
                String alertName = "traffic_drop";
                if (activeAlerts.containsKey(alertName)) {
                    resolveAlert(alertName);
                }
            }
        }
    }
    
    private void checkAuthFailures(long now) {
        String alertName = "auth_failure_spike";
        
        // Clean old auth failures
        authFailures.removeIf(f -> f.timestamp <= now - AUTH_FAILURE_WINDOW);
        
        if (authFailures.size() >= AUTH_FAILURE_THRESHOLD) {
            if (!activeAlerts.containsKey(alertName)) {
                String severity = authFailures.size() >= 50 ? "critical" :
                                 authFailures.size() >= 30 ? "high" :
                                 authFailures.size() >= 20 ? "medium" : "low";
                fireAlert(alertName, "security", severity);
            }
        } else if (authFailures.size() < AUTH_FAILURE_THRESHOLD - 3) {
            if (activeAlerts.containsKey(alertName)) {
                resolveAlert(alertName);
            }
        }
    }
    
    private void checkDatabaseConnection(long now) {
        String alertName = "database_connection_issue";
        
        boolean isConnected = false;
        if (mongoClient != null) {
            try {
                // Try to ping the database
                mongoClient.listDatabaseNames().first();
                isConnected = true;
            } catch (Exception e) {
                isConnected = false;
            }
        }
        
        if (!isConnected) {
            if (!activeAlerts.containsKey(alertName)) {
                fireAlert(alertName, "resource", "critical");
            }
        } else {
            if (activeAlerts.containsKey(alertName)) {
                resolveAlert(alertName);
            }
        }
    }
    
    private void fireAlert(String alertName, String alertType, String severity) {
        long now = System.currentTimeMillis();
        
        ActiveAlert activeAlert = new ActiveAlert(alertName, alertType, now, severity);
        activeAlerts.put(alertName, activeAlert);
        
        AlertEvent alertEvent = new AlertEvent();
        alertEvent.setTimestamp(Instant.now().toString());
        alertEvent.setServiceName(serviceName);
        alertEvent.setAlertName(alertName);
        alertEvent.setAlertType(alertType);
        alertEvent.setAlertState("fired");
        alertEvent.setSeverity(severity);
        
        // Capture context
        ContextMetrics context = captureContext();
        alertEvent.setRequestCount(context.requestCount);
        alertEvent.setErrorCount(context.errorCount);
        alertEvent.setAverageResponseTime(context.averageResponseTime);
        alertEvent.setProcessCpuUsage(context.processCpuUsage);
        alertEvent.setProcessMemoryUsage(context.processMemoryUsage);
        alertEvent.setTrafficRate(context.trafficRate);
        
        writeAlertEvent(alertEvent);
    }
    
    private void resolveAlert(String alertName) {
        ActiveAlert activeAlert = activeAlerts.get(alertName);
        if (activeAlert == null) return;
        
        long now = System.currentTimeMillis();
        long duration = now - activeAlert.firedAt;
        
        activeAlerts.remove(alertName);
        
        AlertEvent alertEvent = new AlertEvent();
        alertEvent.setTimestamp(Instant.now().toString());
        alertEvent.setServiceName(serviceName);
        alertEvent.setAlertName(alertName);
        alertEvent.setAlertType(activeAlert.alertType);
        alertEvent.setAlertState("resolved");
        alertEvent.setAlertDuration(duration);
        alertEvent.setSeverity(activeAlert.severity);
        
        // Capture context
        ContextMetrics context = captureContext();
        alertEvent.setRequestCount(context.requestCount);
        alertEvent.setErrorCount(context.errorCount);
        alertEvent.setAverageResponseTime(context.averageResponseTime);
        alertEvent.setProcessCpuUsage(context.processCpuUsage);
        alertEvent.setProcessMemoryUsage(context.processMemoryUsage);
        alertEvent.setTrafficRate(context.trafficRate);
        
        writeAlertEvent(alertEvent);
    }
    
    private ContextMetrics captureContext() {
        int requestCount = recentRequests.size();
        int errorCount = (int) recentRequests.stream()
            .filter(r -> r.isError)
            .count();
        
        long avgResponseTime = requestCount > 0
            ? (long) recentRequests.stream()
                .mapToLong(r -> r.duration)
                .average()
                .orElse(0)
            : 0;
        
        // Get process metrics
        Runtime runtime = Runtime.getRuntime();
        long memoryUsage = runtime.totalMemory() - runtime.freeMemory();
        
        double cpuUsage = -1.0;
        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        if (osBean instanceof com.sun.management.OperatingSystemMXBean) {
            com.sun.management.OperatingSystemMXBean sunOsBean = 
                (com.sun.management.OperatingSystemMXBean) osBean;
            double processCpuLoad = sunOsBean.getProcessCpuLoad();
            if (processCpuLoad >= 0) {
                cpuUsage = processCpuLoad * 100;
            }
        }
        
        if (cpuUsage < 0) {
            double loadAvg = osBean.getSystemLoadAverage();
            cpuUsage = loadAvg >= 0 ? loadAvg : -1.0;
        }
        
        // Calculate traffic rate
        long now = System.currentTimeMillis();
        long oneMinuteAgo = now - 60000;
        long recentTrafficCount = recentRequests.stream()
            .filter(r -> r.timestamp > oneMinuteAgo)
            .count();
        double trafficRate = recentTrafficCount / 60.0;
        
        return new ContextMetrics(requestCount, errorCount, avgResponseTime, 
                                 cpuUsage, memoryUsage, trafficRate);
    }
    
    private synchronized void writeAlertEvent(AlertEvent alertEvent) {
        try {
            String json = objectMapper.writeValueAsString(alertEvent);
            
            try (FileWriter writer = new FileWriter(alertDataFile, true)) {
                writer.write(json);
                writer.write(System.lineSeparator());
            }
        } catch (IOException e) {
            System.err.println("Failed to write alert event: " + e.getMessage());
        }
    }
    
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("activeAlerts", activeAlerts.size());
        stats.put("recentRequests", recentRequests.size());
        stats.put("recentErrors", recentRequests.stream().filter(r -> r.isError).count());
        return stats;
    }
    
    // Inner classes
    private static class RequestMetrics {
        long timestamp;
        long duration;
        boolean isError;
        String errorType;
        
        RequestMetrics(long timestamp, long duration, boolean isError, String errorType) {
            this.timestamp = timestamp;
            this.duration = duration;
            this.isError = isError;
            this.errorType = errorType;
        }
    }
    
    private static class ActiveAlert {
        String alertName;
        String alertType;
        long firedAt;
        String severity;
        
        ActiveAlert(String alertName, String alertType, long firedAt, String severity) {
            this.alertName = alertName;
            this.alertType = alertType;
            this.firedAt = firedAt;
            this.severity = severity;
        }
    }
    
    private static class ContextMetrics {
        int requestCount;
        int errorCount;
        long averageResponseTime;
        double processCpuUsage;
        long processMemoryUsage;
        double trafficRate;
        
        ContextMetrics(int requestCount, int errorCount, long averageResponseTime,
                      double processCpuUsage, long processMemoryUsage, double trafficRate) {
            this.requestCount = requestCount;
            this.errorCount = errorCount;
            this.averageResponseTime = averageResponseTime;
            this.processCpuUsage = processCpuUsage;
            this.processMemoryUsage = processMemoryUsage;
            this.trafficRate = trafficRate;
        }
    }
    
    private static class AuthFailure {
        long timestamp;
        String type;
        
        AuthFailure(long timestamp, String type) {
            this.timestamp = timestamp;
            this.type = type;
        }
    }
    
    private static class TrafficRate {
        long timestamp;
        long count;
        
        TrafficRate(long timestamp, long count) {
            this.timestamp = timestamp;
            this.count = count;
        }
    }
}
