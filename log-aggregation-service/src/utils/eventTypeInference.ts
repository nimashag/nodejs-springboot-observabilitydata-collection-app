/**
 * Shared utility for inferring event types from text using keyword matching
 * This ensures consistency between rule-based classifier and evaluation scripts
 * 
 * This matches the logic in RuleBasedEventTypeClassifier.classify()
 */

/**
 * Infer event type from text using keyword matching rules
 * @param text The text to analyze (can be a template, event name, or log content)
 * @returns The inferred event type
 */
export function inferEventTypeFromText(text: string): string {
    const lower = text.toLowerCase();

    if (lower.includes('error') || lower.includes('exception') || lower.includes('fail')) {
        return 'error';
    }
    if (lower.includes('warn') || lower.includes('warning')) {
        return 'warning';
    }
    if (lower.includes('http.request')) {
        return 'http_request';
    }
    if (lower.includes('db.') || lower.includes('database')) {
        return 'database';
    }
    if (lower.includes('auth') || lower.includes('login') || lower.includes('logout')) {
        return 'authentication';
    }

    return 'unknown';
}

