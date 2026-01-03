package com.app.usersservice.controller;

import com.app.usersservice.collector.TelemetryStore;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.util.*;
import java.util.stream.Collectors;

@RestController
public class TelemetryController {

    private long percentile(List<Long> values, int p) {
        if (values == null || values.isEmpty()) return 0;
        Collections.sort(values);
        int idx = (int) Math.ceil((p / 100.0) * values.size()) - 1;
        idx = Math.max(0, Math.min(values.size() - 1, idx));
        return values.get(idx);
    }

    @GetMapping("/telemetry")
    public Map<String, Object> telemetry() {
        long now = System.currentTimeMillis();
        long uptimeMs = Math.max(0, now - TelemetryStore.startTime);
        long uptimeSec = Math.max(1, uptimeMs / 1000);

        double avgLatency = TelemetryStore.totalRequests.get() == 0
                ? 0
                : ((double) TelemetryStore.totalLatencyMs.get() / TelemetryStore.totalRequests.get());

        double rps = (double) TelemetryStore.totalRequests.get() / uptimeSec;

        long heapUsedBytes = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory();
        long heapMaxBytes = Runtime.getRuntime().maxMemory();

        Long rssMb = null;
        try {
            com.sun.management.OperatingSystemMXBean os =
                    (com.sun.management.OperatingSystemMXBean) ManagementFactory.getOperatingSystemMXBean();
            long committed = os.getCommittedVirtualMemorySize();
            rssMb = committed > 0 ? committed / (1024 * 1024) : null;
        } catch (Throwable ignored) {}

        // ✅ snapshot rolling latencies
        List<Long> latencySnapshot = new ArrayList<>(TelemetryStore.latenciesMs);
        long p95 = percentile(latencySnapshot, 95);
        long p99 = percentile(latencySnapshot, 99);

        List<Map<String, Object>> routes = TelemetryStore.routes.entrySet().stream()
                .map(e -> {
                    String route = e.getKey();
                    TelemetryStore.RouteStat s = e.getValue();
                    long count = s.count.get();
                    long errors = s.errors.get();
                    long avgRouteLatency = count == 0 ? 0 : Math.round((double) s.totalLatencyMs.get() / count);

                    Map<String, Object> obj = new LinkedHashMap<>();
                    obj.put("route", route);
                    obj.put("count", count);
                    obj.put("errors", errors);
                    obj.put("avg_latency_ms", avgRouteLatency);
                    return obj;
                })
                .collect(Collectors.toList());

        Map<String, Object> process = new LinkedHashMap<>();
        process.put("heap_used_mb", heapUsedBytes / (1024 * 1024));
        process.put("heap_max_mb", heapMaxBytes / (1024 * 1024));
        if (rssMb != null) process.put("rss_mb", rssMb);

        Map<String, Object> http = new LinkedHashMap<>();
        http.put("total_requests", TelemetryStore.totalRequests.get());
        http.put("total_errors", TelemetryStore.totalErrors.get());
        http.put("avg_latency_ms", Math.round(avgLatency));
        http.put("rps", Math.round(rps * 100.0) / 100.0);
        http.put("p95_latency_ms", p95);
        http.put("p99_latency_ms", p99);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("service", "users-service");
        out.put("timestamp", now);
        out.put("uptime_ms", uptimeMs);
        out.put("process", process);
        out.put("http", http);
        out.put("routes", routes);

        return out;
    }
}
