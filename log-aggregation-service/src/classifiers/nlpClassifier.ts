import { NlpManager } from 'node-nlp';
import { EventTypeClassifier } from './baseEventTypeClassifier';
import { EventType } from '../types/eventTypes';

/**
 * NLP-based Event Type Classifier
 * Uses node-nlp for intent recognition and classification
 */
export class NLPEventTypeClassifier implements EventTypeClassifier {
    name = 'nlp-based';
    private nlp: NlpManager;
    private trained: boolean = false;

    constructor() {
        this.nlp = new NlpManager({
            languages: ['en'],
            forceNER: true,
            nlu: { useNoneFeature: true }
        });
    }

    async train(trainingData: Array<{ template: string; eventType: string }>): Promise<void> {
        for (const { template, eventType } of trainingData) {
            this.nlp.addDocument('en', template, eventType);
        }

        await this.nlp.train();
        this.trained = true;
    }

    async classify(template: string): Promise<string> {
        if (!this.trained) {
            return EventType.UNKNOWN;
        }

        const result = await this.nlp.process('en', template);
        return result.intent || EventType.UNKNOWN;
    }

    async classifyWithConfidence(template: string): Promise<{ eventType: string; confidence: number }> {
        if (!this.trained) {
            return { eventType: EventType.UNKNOWN, confidence: 0 };
        }

        const result = await this.nlp.process('en', template);
        return {
            eventType: result.intent || EventType.UNKNOWN,
            confidence: result.score || 0,
        };
    }

    isTrained(): boolean {
        return this.trained;
    }

    async save(filepath: string): Promise<void> {
        await this.nlp.save(filepath);
    }

    async load(filepath: string): Promise<void> {
        await this.nlp.load(filepath);
        this.trained = true;
    }
}

