import { EventTypeClassifier } from './baseEventTypeClassifier';

/**
 * Rule-based Event Type Classifier (Baseline)
 * Uses keyword matching to infer event types
 */
export class RuleBasedEventTypeClassifier implements EventTypeClassifier {
    name = 'rule-based';

    classify(template: string): string {
        const lower = template.toLowerCase();

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

    isTrained(): boolean {
        return true; // Rule-based doesn't need training
    }
}

