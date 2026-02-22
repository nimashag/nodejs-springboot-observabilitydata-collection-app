/**
 * Base interface for Event Type Classifiers
 */
export interface EventTypeClassifier {
    name: string;
    classify(template: string): string | Promise<string>;
    train?(trainingData: Array<{ template: string; eventType: string }>): void | Promise<void>;
    isTrained(): boolean;
    save?(filepath: string): void | Promise<void>;
    load?(filepath: string): void | Promise<void>;
}

export interface ClassificationResult {
    eventType: string;
    confidence?: number;
    classifier: string;
}

