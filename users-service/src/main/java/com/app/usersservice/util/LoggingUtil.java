package com.app.usersservice.util;

import org.slf4j.Logger;
import org.slf4j.MDC;

/**
 * Helper to keep log messages in a single, consistent format.
 * Automatically includes requestId from MDC in all log messages.
 */
public final class LoggingUtil {

    private static final String PREFIX = "[users-service]";
    private static final String MDC_REQUEST_ID_KEY = "requestId";
    private static final String SYSTEM_REQUEST_ID = "system";

    private LoggingUtil() {
        // Utility class
    }

    /**
     * Get requestId from MDC or return default "system" for non-request contexts.
     */
    private static String getRequestId() {
        String requestId = MDC.get(MDC_REQUEST_ID_KEY);
        return requestId != null ? requestId : SYSTEM_REQUEST_ID;
    }

    public static void info(Logger logger, String action, Object payload) {
        String requestId = getRequestId();
        logger.info("{} requestId={} | action={} | payload={}", PREFIX, requestId, action, payload);
    }

    public static void warn(Logger logger, String action, Object payload) {
        String requestId = getRequestId();
        logger.warn("{} requestId={} | action={} | payload={}", PREFIX, requestId, action, payload);
    }

    public static void error(Logger logger, String action, String message, Throwable throwable) {
        String requestId = getRequestId();
        logger.error("{} requestId={} | action={} | message={}", PREFIX, requestId, action, message, throwable);
    }
}
