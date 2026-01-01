package com.app.usersservice.collector;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class TelemetryStore {
    public static final long startTime = System.currentTimeMillis();

    public static final AtomicLong totalRequests = new AtomicLong(0);
    public static final AtomicLong totalErrors = new AtomicLong(0);
    public static final AtomicLong totalLatencyMs = new AtomicLong(0);

    // key: "METHOD /path"
    public static final ConcurrentHashMap<String, RouteStat> routes = new ConcurrentHashMap<>();

    public static class RouteStat {
        public final AtomicLong count = new AtomicLong(0);
        public final AtomicLong errors = new AtomicLong(0);
        public final AtomicLong totalLatencyMs = new AtomicLong(0);
    }
}
