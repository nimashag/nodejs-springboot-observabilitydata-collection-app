package com.app.usersservice.util;

import org.slf4j.Logger;

/**
 * Helper to keep log messages in a single, consistent format.
 */
public final class LoggingUtil {

    private static final String PREFIX = "[users-service]";

    private LoggingUtil() {
        // Utility class
    }

    public static void info(Logger logger, String action, Object payload) {
        logger.info("{} action={} | payload={}", PREFIX, action, payload);
    }

    public static void warn(Logger logger, String action, Object payload) {
        logger.warn("{} action={} | payload={}", PREFIX, action, payload);
    }

    public static void error(Logger logger, String action, String message, Throwable throwable) {
        logger.error("{} action={} | message={}", PREFIX, action, message, throwable);
    }
}
