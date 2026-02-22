import { TfIdf } from 'natural';
import { EventTypeClassifier } from './baseEventTypeClassifier';
import { EventType } from '../types/eventTypes';

/**
 * TF-IDF + K-Nearest Neighbors Event Type Classifier
 * Uses TF-IDF vectorization and cosine similarity for classification
 */
export class TfIdfKnnEventTypeClassifier implements EventTypeClassifier {
    name = 'tfidf-knn';
    private tfidf: TfIdf;
    private labels: string[] = [];
    private vectors: number[][] = [];
    private vocabulary: string[] = [];
    private trained: boolean = false;
    private k: number = 3;

    constructor(k: number = 3) {
        this.tfidf = new TfIdf();
        this.k = k;
    }

    train(trainingData: Array<{ template: string; eventType: string }>): void {
        this.tfidf = new TfIdf(); // Reset

        // Build TF-IDF vectors for training data
        for (const { template, eventType } of trainingData) {
            this.tfidf.addDocument(template.toLowerCase());
            this.labels.push(eventType);
        }

        // Extract vocabulary
        const vocabSet = new Set<string>();
        trainingData.forEach(d => {
            d.template.toLowerCase().split(/\s+/).forEach(t => {
                if (t.length > 0) vocabSet.add(t);
            });
        });
        this.vocabulary = Array.from(vocabSet);

        // Create vectors
        for (let i = 0; i < trainingData.length; i++) {
            const vector: number[] = [];
            this.vocabulary.forEach(term => {
                vector.push(this.tfidf.tfidf(term, i));
            });
            this.vectors.push(vector);
        }

        this.trained = true;
    }

    classify(template: string): string {
        if (!this.trained || this.vectors.length === 0) {
            return EventType.UNKNOWN;
        }

        // Create vector for input
        this.tfidf.addDocument(template.toLowerCase());
        const docIndex = this.labels.length; // New doc is at end

        const inputVector: number[] = [];
        this.vocabulary.forEach(term => {
            inputVector.push(this.tfidf.tfidf(term, docIndex));
        });

        // Find k nearest neighbors using cosine similarity
        const similarities = this.vectors.map((vec, i) => ({
            label: this.labels[i],
            similarity: this.cosineSimilarity(inputVector, vec),
        }));

        similarities.sort((a, b) => b.similarity - a.similarity);

        // Majority vote from top k
        const topK = similarities.slice(0, this.k);
        const votes: Record<string, number> = {};
        for (const { label } of topK) {
            votes[label] = (votes[label] || 0) + 1;
        }

        return Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] || EventType.UNKNOWN;
    }

    private cosineSimilarity(a: number[], b: number[]): number {
        let dot = 0, magA = 0, magB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            magA += a[i] * a[i];
            magB += b[i] * b[i];
        }
        return dot / (Math.sqrt(magA) * Math.sqrt(magB) || 1);
    }

    isTrained(): boolean {
        return this.trained;
    }
}

