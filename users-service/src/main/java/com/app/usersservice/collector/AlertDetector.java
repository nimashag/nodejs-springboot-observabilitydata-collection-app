package com.app.usersservice.collector;

import com.fasterxml.jackson.databind.ObjectMapper;
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

/**
 * Alert Detector for Users Service (Spring Boot)
 * 
 * This class detects alert events based on application behavior:
 * - Error bursts (multiple errors in short time)
 * - Repeated failures (same error pattern)
 * - High latency conditions (slow responses)
 * 
 * NO OpenTelemetry, NO Prometheus, NO external observability libraries
 */
@Component
public class AlertDetector {
    
    private final String serviceName;
    private final String alertDataFile;
    private final List<RequestMetrics> recentRequests;
    private final Map<String, ActiveAlert> activeAlerts;
    private final ObjectMapper objectMapper;
    private final ScheduledExecutorService scheduler;
    
    // Configuration thresholds
    private static final int ERROR_BURST_THRESHOLD = 5; // errors in window
    private static final long ERROR_BURST_WINDOW = 60000; // 1 minute
    private static final long HIGH_LATENCY_THRESHOLD = 3000; // 3 seconds
    private static final int HIGH_LATENCY_COUNT = 3; // consecutive slow requests
    private static final double AVAILABILITY_ERROR_RATE = 0.5; // 50% error rate
    private static final long METRICS_WINDOW = 300000; // 5 minutes
    
    public AlertDetector() {
        this.serviceName = "users-service";
        this.recentRequests = new CopyOnWriteArrayList<>();
        this.activeAlerts = new ConcurrentHashMap<>();
        this.objectMapper = new ObjectMapper();
        
        // Create alert data directory if it doesn't exist
        File alertDir = new File("logs/alert");
        if (!alertDir.exists()) {
            alertDir.mkdirs();
        }
        
        this.alertDataFile = "logs/alert/" + serviceName + "-alert-data.ndjson";
        
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
    
    /**
     * Record a request for alert detection
     */
    public void recordRequest(long duration, boolean isError, String errorType) {
        long now = System.currentTimeMillis();
        
        RequestMetrics metrics = new RequestMetrics(now, duration, isError, errorType);
        recentRequests.add(metrics);
        
        // Clean old requests outside the metrics window
        cleanOldMetrics(now);
        
        // Check for alert conditions immediately
        checkAlertConditions();
    }
    
    /**
     * Clean metrics older than the window
     */
    private void cleanOldMetrics(long now) {
        long cutoff = now - METRICS_WINDOW;
        recentRequests.removeIf(r -> r.timestamp < cutoff);
    }
    
    /**
     * Check all alert conditions
     */
    private void checkAlertConditions() {
        long now = System.currentTimeMillis();
        cleanOldMetrics(now);
        
        // Check error burst
        checkErrorBurst(now);
        
        // Check high latency
        checkHighLatency(now);
        
        // Check availability
        checkAvailability(now);
    }
    
    /**
     * Check for error burst condition
     */
    private void checkErrorBurst(long now) {
        String alertName = "error_burst";
        long burstWindow = now - ERROR_BURST_WINDOW;
        
        long recentErrorCount = recentRequests.stream()
            .filter(r -> r.isError && r.timestamp > burstWindow)
            .count();
        
        if (recentErrorCount >= ERROR_BURST_THRESHOLD) {
            if (!activeAlerts.containsKey(alertName)) {
                // Fire alert
                String severity = recentErrorCount >= 10 ? "high" :
                                 recentErrorCount >= 7 ? "medium" : "low";
                
                fireAlert(alertName, "error", severity);
            }
        } else {
            if (activeAlerts.containsKey(alertName)) {
                // Resolve alert
                resolveAlert(alertName);
            }
        }
    }
    
    /**
     * Check for high latency condition
     */
    private void checkHighLatency(long now) {
        String alertName = "high_latency";
        
        // Get last N non-error requests
        List<RequestMetrics> recentNonError = recentRequests.stream()
            .filter(r -> !r.isError)
            .collect(Collectors.toList());
        
        if (recentNonError.size() < HIGH_LATENCY_COUNT) {
            return;
        }
        
        // Get last N requests
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
    
    /**
     * Check for availability issues (high error rate)
     */
    private void checkAvailability(long now) {
        String alertName = "availability_issue";
        
        if (recentRequests.size() < 10) {
            // Not enough data
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
    
    /**
     * Fire an alert
     */
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
        
        writeAlertEvent(alertEvent);
    }
    
    /**
     * Resolve an alert
     */
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
        
        writeAlertEvent(alertEvent);
    }
    
    /**
     * Capture context metrics at alert time
     */
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
        
        OperatingSystemMXBean osBean = ManagementFactory.getOperatingSystemMXBean();
        double cpuUsage = osBean.getSystemLoadAverage();
        
        return new ContextMetrics(requestCount, errorCount, avgResponseTime, cpuUsage, memoryUsage);
    }
    
    /**
     * Write alert event to file (append-only NDJSON)
     */
    private void writeAlertEvent(AlertEvent alertEvent) {
        try (FileWriter writer = new FileWriter(alertDataFile, true)) {
            String json = objectMapper.writeValueAsString(alertEvent);
            writer.write(json + "\n");
        } catch (IOException e) {
            System.err.println("Failed to write alert event: " + e.getMessage());
        }
    }
    
    /**
     * Get current alert statistics (for monitoring)
     */
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
        
        ContextMetrics(int requestCount, int errorCount, long averageResponseTime,
                      double processCpuUsage, long processMemoryUsage) {
            this.requestCount = requestCount;
            this.errorCount = errorCount;
            this.averageResponseTime = averageResponseTime;
            this.processCpuUsage = processCpuUsage;
            this.processMemoryUsage = processMemoryUsage;
        }
    }
}

