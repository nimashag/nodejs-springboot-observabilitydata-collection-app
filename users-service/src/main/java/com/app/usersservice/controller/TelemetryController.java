package com.app.usersservice.controller;

import com.app.usersservice.collector.TelemetryStore;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.*;

@RestController
public class TelemetryController {

    @GetMapping("/telemetry")
    public Map<String, Object> telemetry() {

        long requests = TelemetryStore.totalRequests.get();
        long avgLatency = (requests == 0) ? 0 : (TelemetryStore.totalLatencyMs.get() / requests);

        long heapUsedMb = (Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) / (1024 * 1024);
        long heapMaxMb = Runtime.getRuntime().maxMemory() / (1024 * 1024);

        List<Map<String, Object>> routes = new ArrayList<>();
        for (Map.Entry<String, TelemetryStore.RouteStat> e : TelemetryStore.routes.entrySet()) {
            long c = e.getValue().count.get();
            long avg = (c == 0) ? 0 : (e.getValue().totalLatencyMs.get() / c);

            Map<String, Object> r = new HashMap<>();
            r.put("route", e.getKey());
            r.put("count", c);
            r.put("errors", e.getValue().errors.get());
            r.put("avg_latency_ms", avg);
            routes.add(r);
        }

        routes.sort((a, b) -> Long.compare((long) b.get("count"), (long) a.get("count")));

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("service", "users-service");
        res.put("timestamp", System.currentTimeMillis());
        res.put("uptime_ms", System.currentTimeMillis() - TelemetryStore.startTime);

        Map<String, Object> process = new LinkedHashMap<>();
        process.put("heap_used_mb", heapUsedMb);
        process.put("heap_max_mb", heapMaxMb);

        Map<String, Object> http = new LinkedHashMap<>();
        http.put("total_requests", requests);
        http.put("total_errors", TelemetryStore.totalErrors.get());
        http.put("avg_latency_ms", avgLatency);

        res.put("process", process);
        res.put("http", http);
        res.put("routes", routes);

        return res;
    }
}
