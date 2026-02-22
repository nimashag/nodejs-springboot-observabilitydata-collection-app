package com.app.usersservice.interceptor;

import com.app.usersservice.collector.TelemetryStore;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.servlet.HandlerInterceptor;

public class TelemetryInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        request.setAttribute("_telemetry_start_ns", System.nanoTime());
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        Object startObj = request.getAttribute("_telemetry_start_ns");
        long latencyMs = 0;

        if (startObj instanceof Long startNs) {
            latencyMs = (System.nanoTime() - startNs) / 1_000_000;
        }

        // ---- global counters ----
        TelemetryStore.totalRequests.incrementAndGet();
        TelemetryStore.totalLatencyMs.addAndGet(latencyMs);

        boolean isError = response.getStatus() >= 400;
        if (isError) {
            TelemetryStore.totalErrors.incrementAndGet();
        }

        // ✅ add to rolling latency window (for p95/p99)
        TelemetryStore.recordLatency(latencyMs);

        // ---- per-route stats ----
        String path = request.getRequestURI(); // already without query
        String key = request.getMethod() + " " + path;

        TelemetryStore.RouteStat stat =
                TelemetryStore.routes.computeIfAbsent(key, k -> new TelemetryStore.RouteStat());

        stat.count.incrementAndGet();
        stat.totalLatencyMs.addAndGet(latencyMs);
        if (isError) stat.errors.incrementAndGet();
    }
}
