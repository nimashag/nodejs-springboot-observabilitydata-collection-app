/**
 * Event Type Enum
 * 
 * Defines all possible event types that can be inferred from log entries.
 * These types categorize different kinds of events in the system.
 * 
 * Event Type Categories:
 * - ERROR: Application errors and exceptions
 * - WARNING: Warning messages
 * - HTTP_REQUEST: HTTP request/response events
 * - DATABASE: Database operations (db.connected, db.query, etc.)
 * - AUTHENTICATION: Authentication and authorization events
 * - BUSINESS_LOGIC: Application domain events (orders, restaurants, payments)
 * - SERVER_LIFECYCLE: Server startup/shutdown events
 * - INFRASTRUCTURE: Infrastructure/system logs (MongoDB driver, Spring, Tomcat, etc.)
 * - UNKNOWN: Unclassified events
 */
export enum EventType {
    ERROR = 'error',
    WARNING = 'warning',
    HTTP_REQUEST = 'http_request',
    DATABASE = 'database',
    AUTHENTICATION = 'authentication',
    BUSINESS_LOGIC = 'business_logic',
    SERVER_LIFECYCLE = 'server_lifecycle',
    INFRASTRUCTURE = 'infrastructure',
    UNKNOWN = 'unknown',
}

/**
 * Array of all event type values (useful for validation, iteration, etc.)
 */
export const EVENT_TYPES = Object.values(EventType) as string[];

/**
 * Type guard to check if a string is a valid event type
 */
export function isValidEventType(value: string): value is EventType {
    return EVENT_TYPES.includes(value);
}

