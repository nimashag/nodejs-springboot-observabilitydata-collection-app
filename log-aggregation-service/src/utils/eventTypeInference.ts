import { EventType } from '../types/eventTypes';

/**
 * Shared utility for inferring event types from text using keyword matching
 * This ensures consistency between rule-based classifier and evaluation scripts
 * 
 * This matches the logic in RuleBasedEventTypeClassifier.classify()
 * 
 * Event Type Categories:
 * - error: Application errors and exceptions
 * - warning: Warning messages
 * - http_request: HTTP request/response events
 * - database: Database operations (db.connected, db.query, etc.)
 * - authentication: Authentication and authorization events
 * - business_logic: Application domain events (orders, restaurants, payments)
 * - server_lifecycle: Server startup/shutdown events
 * - infrastructure: Infrastructure/system logs (MongoDB driver, Spring, Tomcat, etc.)
 * - unknown: Unclassified events
 */

/**
 * Infer event type from text using keyword matching rules
 * @param text The text to analyze (can be a template, event name, or log content)
 * @returns The inferred event type
 */
export function inferEventTypeFromText(text: string): string {
    const lower = text.toLowerCase();

    // Error events (check first to catch error-related logs)
    if (lower.includes('error') || lower.includes('exception') || lower.includes('fail')) {
        return EventType.ERROR;
    }

    // Warning events
    if (lower.includes('warn') || lower.includes('warning')) {
        return EventType.WARNING;
    }

    // HTTP request events (check before business_logic to avoid conflicts)
    if (lower.includes('http.request')) {
        return EventType.HTTP_REQUEST;
    }

    // Database operations (check before infrastructure to catch db.* events)
    if (lower.includes('db.') || lower.includes('database')) {
        return EventType.DATABASE;
    }

    // Authentication events
    if (lower.includes('auth') || lower.includes('login') || lower.includes('logout')) {
        return EventType.AUTHENTICATION;
    }

    // Business logic events (application domain events)
    if (lower.includes('order.') || lower.includes('restaurant.') || lower.includes('restaurants.') ||
        lower.includes('payment.') || lower.includes('menuitem.') || lower.includes('delivery.')) {
        return EventType.BUSINESS_LOGIC;
    }

    // Server lifecycle events
    if (lower.includes('server.started') || lower.includes('server.stopped') ||
        lower.includes('server.start') || lower.includes('server.stop')) {
        return EventType.SERVER_LIFECYCLE;
    }

    // Infrastructure/system logs (MongoDB driver, Spring, Tomcat, Hibernate, etc.)
    if (lower.includes('org.mongodb.driver') || lower.includes('org.springframework') ||
        lower.includes('org.hibernate') || lower.includes('tomcat') ||
        lower.includes('dispatcherservlet') || lower.includes('spring') ||
        lower.includes('hibernate') || lower.includes('catalina') ||
        lower.includes('at com.mongodb') || lower.includes('at java.') ||
        lower.includes('at org.springframework')) {
        return EventType.INFRASTRUCTURE;
    }

    return EventType.UNKNOWN;
}

