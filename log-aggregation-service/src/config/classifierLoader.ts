import fs from 'fs';
import path from 'path';
import { EventTypeClassifier } from '../classifiers';
import { createClassifier } from '../classifiers';
import { NaiveBayesEventTypeClassifier } from '../classifiers/naiveBayesClassifier';
import { NLPEventTypeClassifier } from '../classifiers/nlpClassifier';

export interface ClassifierConfig {
    classifier: string;
    options?: {
        k?: number;
        modelPath?: string;
    };
}

/**
 * Load classifier configuration and create classifier instance
 */
export function loadClassifierConfig(): ClassifierConfig {
    const configPath = path.join(__dirname, 'classifier.config.json');

    if (!fs.existsSync(configPath)) {
        console.warn(`Classifier config not found at ${configPath}, using default: rule-based`);
        return { classifier: 'rule-based' };
    }

    try {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        const config: ClassifierConfig = JSON.parse(configContent);
        return config;
    } catch (error) {
        console.error(`Error loading classifier config: ${error}`);
        console.warn('Using default classifier: rule-based');
        return { classifier: 'rule-based' };
    }
}

/**
 * Get the configured classifier instance (synchronous version)
 * Used when async initialization is not possible (e.g., in constructors)
 */
export function getConfiguredClassifierSync(): EventTypeClassifier {
    const config = loadClassifierConfig();
    return createClassifier(config.classifier, config.options);
}

/**
 * Get the configured classifier instance
 * Optionally loads a pre-trained model if modelPath is specified
 */
export async function getConfiguredClassifier(): Promise<EventTypeClassifier> {
    const config = loadClassifierConfig();
    const classifier = createClassifier(config.classifier, config.options);

    // Load pre-trained model if path is provided and classifier supports loading
    if (config.options?.modelPath && classifier.load) {
        const modelPath = path.resolve(__dirname, '..', '..', config.options.modelPath);
        if (fs.existsSync(modelPath)) {
            try {
                // Handle different classifier types
                if (classifier.name === 'naive-bayes' && classifier instanceof NaiveBayesEventTypeClassifier) {
                    const loaded = await NaiveBayesEventTypeClassifier.load(modelPath);
                    return loaded;
                } else if (classifier.name === 'nlp-based' && classifier instanceof NLPEventTypeClassifier) {
                    await classifier.load(modelPath);
                    console.log(`Loaded pre-trained NLP model from: ${modelPath}`);
                } else {
                    await classifier.load(modelPath);
                    console.log(`Loaded pre-trained model from: ${modelPath}`);
                }
            } catch (error) {
                console.warn(`Failed to load model from ${modelPath}: ${error}`);
                console.warn('Using untrained classifier');
            }
        } else {
            console.warn(`Model file not found at: ${modelPath}`);
            console.warn('Using untrained classifier');
        }
    }

    return classifier;
}

