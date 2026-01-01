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
    private static final String MDC_SESSION_ID_KEY = "sessionId";
    private static final String SYSTEM_REQUEST_ID = "system";
    private static final String NO_SESSION = "no-session";

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

    /**
     * Get sessionId from MDC or return default "no-session" for non-request contexts.
     */
    private static String getSessionId() {
        String sessionId = MDC.get(MDC_SESSION_ID_KEY);
        return sessionId != null ? sessionId : NO_SESSION;
    }

    public static void info(Logger logger, String action, Object payload) {
        String requestId = getRequestId();
        String sessionId = getSessionId();
        logger.info("{} requestId={} | sessionId={} | action={} | payload={}", PREFIX, requestId, sessionId, action, payload);
    }

    public static void warn(Logger logger, String action, Object payload) {
        String requestId = getRequestId();
        String sessionId = getSessionId();
        logger.warn("{} requestId={} | sessionId={} | action={} | payload={}", PREFIX, requestId, sessionId, action, payload);
    }

    public static void error(Logger logger, String action, String message, Throwable throwable) {
        String requestId = getRequestId();
        String sessionId = getSessionId();
        logger.error("{} requestId={} | sessionId={} | action={} | message={}", PREFIX, requestId, sessionId, action, message, throwable);
    }
}
