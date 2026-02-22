import natural from 'natural';
import { EventTypeClassifier } from './baseEventTypeClassifier';
import { EventType } from '../types/eventTypes';

/**
 * Naive Bayes Event Type Classifier
 * Uses natural library's BayesClassifier for text classification
 */
export class NaiveBayesEventTypeClassifier implements EventTypeClassifier {
    name = 'naive-bayes';
    private classifier: natural.BayesClassifier;
    private trained: boolean = false;

    constructor() {
        this.classifier = new natural.BayesClassifier();
    }

    async train(trainingData: Array<{ template: string; eventType: string }>): Promise<void> {
        for (const { template, eventType } of trainingData) {
            this.classifier.addDocument(template.toLowerCase(), eventType);
        }

        this.classifier.train();
        this.trained = true;
    }

    classify(template: string): string {
        if (!this.trained) {
            return EventType.UNKNOWN;
        }
        return this.classifier.classify(template.toLowerCase());
    }

    classifyWithConfidence(template: string): Array<{ label: string; value: number }> {
        if (!this.trained) {
            return [{ label: EventType.UNKNOWN, value: 1.0 }];
        }
        return this.classifier.getClassifications(template.toLowerCase());
    }

    isTrained(): boolean {
        return this.trained;
    }

    save(filepath: string): void {
        this.classifier.save(filepath, (err) => {
            if (err) throw err;
        });
    }

    static load(filepath: string): Promise<NaiveBayesEventTypeClassifier> {
        return new Promise((resolve, reject) => {
            natural.BayesClassifier.load(filepath, null, (err, classifier) => {
                if (err) {
                    reject(err);
                    return;
                }
                if (!classifier) {
                    reject(new Error('Failed to load classifier'));
                    return;
                }
                const instance = new NaiveBayesEventTypeClassifier();
                instance.classifier = classifier;
                instance.trained = true;
                resolve(instance);
            });
        });
    }
}

