package com.app.metrics;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Filter to capture request-level metrics and write to metrics.jsonl
 * 
 * Captures:
 * - request_id (X-Request-Id header)
 * - service name
 * - HTTP method, route, path, status_code
 * - timing: start_ts_ms, end_ts_ms, duration_ms
 * - metrics: cpu_percent, rss_mb, heap_used_mb, db_query_time_ms
 */
@Component
@Order(0) // Run before other filters
public class MetricsCaptureFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(MetricsCaptureFilter.class);
    private static final String REQUEST_ID_HEADER = "X-Request-Id";
    private static final String METRICS_DIR = "./metrics";
    private static final String METRICS_FILE = METRICS_DIR + "/metrics.jsonl";
    
    private String serviceName = "users-service"; // Default, can be overridden
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    // Store metrics per request
    private final Map<String, RequestMetrics> requestMetricsMap = new ConcurrentHashMap<>();
    
    public MetricsCaptureFilter() {
        // Ensure metrics directory exists
        try {
            Files.createDirectories(Paths.get(METRICS_DIR));
        } catch (IOException e) {
            log.error("Failed to create metrics directory", e);
        }
    }
    
    public MetricsCaptureFilter(String serviceName) {
        this();
        this.serviceName = serviceName;
    }
    
    public void setServiceName(String serviceName) {
        this.serviceName = serviceName;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, 
                                   FilterChain filterChain) throws ServletException, IOException {
        
        long startTime = System.currentTimeMillis();
        
        // Get or generate request ID
        String requestId = request.getHeader(REQUEST_ID_HEADER);
        if (requestId == null || requestId.isEmpty()) {
            requestId = UUID.randomUUID().toString();
        }
        
        // Initialize metrics tracking
        RequestMetrics metrics = new RequestMetrics();
        metrics.request_id = requestId;
        metrics.service = serviceName;
        metrics.http = new HttpInfo();
        metrics.http.method = request.getMethod();
        metrics.http.path = request.getRequestURI();
        metrics.http.route = extractRoute(request.getRequestURI(), request.getMethod());
        metrics.timing = new TimingInfo();
        metrics.timing.start_ts_ms = startTime;
        metrics.metrics = new MetricsInfo();
        
        // Capture initial memory state
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        long usedMemory = totalMemory - freeMemory;
        metrics.metrics.rss_mb = Math.round((totalMemory / 1024.0 / 1024.0) * 100.0) / 100.0;
        metrics.metrics.heap_used_mb = Math.round((usedMemory / 1024.0 / 1024.0) * 100.0) / 100.0;
        metrics.metrics.cpu_percent = getCpuPercent();
        metrics.metrics.db_query_time_ms = 0.0;
        
        // Store in map for DB query tracking
        requestMetricsMap.put(requestId, metrics);
        
        // Store requestId in request attribute for DB tracking
        request.setAttribute("metricsRequestId", requestId);
        
        try {
            filterChain.doFilter(request, response);
        } finally {
            long endTime = System.currentTimeMillis();
            long durationMs = endTime - startTime;
            
            // Update metrics
            metrics.timing.end_ts_ms = endTime;
            metrics.timing.duration_ms = Math.round(durationMs * 100.0) / 100.0;
            metrics.http.status_code = response.getStatus();
            
            // Capture final memory state
            totalMemory = runtime.totalMemory();
            freeMemory = runtime.freeMemory();
            usedMemory = totalMemory - freeMemory;
            metrics.metrics.rss_mb = Math.round((totalMemory / 1024.0 / 1024.0) * 100.0) / 100.0;
            metrics.metrics.heap_used_mb = Math.round((usedMemory / 1024.0 / 1024.0) * 100.0) / 100.0;
            metrics.metrics.cpu_percent = getCpuPercent();
            
            // Write to JSONL file
            writeMetrics(metrics);
            
            // Clean up
            requestMetricsMap.remove(requestId);
        }
    }
    
    /**
     * Track database query time for a request
     */
    public void trackDbQuery(String requestId, long queryTimeMs) {
        RequestMetrics metrics = requestMetricsMap.get(requestId);
        if (metrics != null) {
            metrics.metrics.db_query_time_ms += Math.round(queryTimeMs * 100.0) / 100.0;
        }
    }
    
    /**
     * Extract route pattern from path (simplified)
     */
    private String extractRoute(String path, String method) {
        // Remove query strings
        String cleanPath = path.split("\\?")[0];
        
        // Replace IDs with :id pattern
        String route = cleanPath
            .replaceAll("/\\d+", "/:id")
            .replaceAll("/[a-f0-9]{24}", "/:id") // MongoDB ObjectId
            .replaceAll("/[a-f0-9-]{36}", "/:id"); // UUID
        
        return method + " " + route;
    }
    
    /**
     * Get CPU usage percentage (simplified approximation)
     */
    private double getCpuPercent() {
        // This is a simplified approximation
        // In production, you'd want to use a library like oshi or track over time
        com.sun.management.OperatingSystemMXBean osBean = 
            (com.sun.management.OperatingSystemMXBean) 
            java.lang.management.ManagementFactory.getOperatingSystemMXBean();
        
        try {
            double cpuLoad = osBean.getProcessCpuLoad() * 100;
            return Math.round(cpuLoad * 100.0) / 100.0;
        } catch (Exception e) {
            return 0.0;
        }
    }
    
    /**
     * Write metrics to JSONL file
     */
    private void writeMetrics(RequestMetrics metrics) {
        try (PrintWriter writer = new PrintWriter(new FileWriter(METRICS_FILE, true))) {
            String json = objectMapper.writeValueAsString(metrics);
            writer.println(json);
        } catch (IOException e) {
            log.error("Failed to write metrics to file", e);
        }
    }
    
    // Inner classes for metrics structure
    public static class RequestMetrics {
        public String request_id;
        public String service;
        public HttpInfo http;
        public TimingInfo timing;
        public MetricsInfo metrics;
    }
    
    public static class HttpInfo {
        public String method;
        public String route;
        public String path;
        public int status_code;
    }
    
    public static class TimingInfo {
        public long start_ts_ms;
        public long end_ts_ms;
        public double duration_ms;
    }
    
    public static class MetricsInfo {
        public double cpu_percent;
        public double rss_mb;
        public double heap_used_mb;
        public double db_query_time_ms;
    }
}

