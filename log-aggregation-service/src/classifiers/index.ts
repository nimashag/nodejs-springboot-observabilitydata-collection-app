/**
 * Classifier factory and exports
 */
import { EventTypeClassifier } from './baseEventTypeClassifier';
import { RuleBasedEventTypeClassifier } from './ruleBasedClassifier';
import { NaiveBayesEventTypeClassifier } from './naiveBayesClassifier';
import { NLPEventTypeClassifier } from './nlpClassifier';
import { TfIdfKnnEventTypeClassifier } from './tfidfKnnClassifier';

export * from './baseEventTypeClassifier';
export { RuleBasedEventTypeClassifier } from './ruleBasedClassifier';
export { NaiveBayesEventTypeClassifier } from './naiveBayesClassifier';
export { NLPEventTypeClassifier } from './nlpClassifier';
export { TfIdfKnnEventTypeClassifier } from './tfidfKnnClassifier';

/**
 * Create a classifier instance based on name
 */
export function createClassifier(name: string, options?: any): EventTypeClassifier {
    switch (name.toLowerCase()) {
        case 'rule-based':
            return new RuleBasedEventTypeClassifier();
        case 'naive-bayes':
            return new NaiveBayesEventTypeClassifier();
        case 'nlp-based':
            return new NLPEventTypeClassifier();
        case 'tfidf-knn':
            return new TfIdfKnnEventTypeClassifier(options?.k || 3);
        default:
            throw new Error(`Unknown classifier: ${name}`);
    }
}

