import { EventTypeClassifier } from './baseEventTypeClassifier';
import { inferEventTypeFromText } from '../utils/eventTypeInference';

/**
 * Rule-based Event Type Classifier (Baseline)
 * Uses keyword matching to infer event types
 */
export class RuleBasedEventTypeClassifier implements EventTypeClassifier {
    name = 'rule-based';

    classify(template: string): string {
        return inferEventTypeFromText(template);
    }

    isTrained(): boolean {
        return true; // Rule-based doesn't need training
    }
}

