import fs from 'fs';
import path from 'path';
import { EventTypeClassifier } from '../classifiers';
import { createClassifier } from '../classifiers';

interface ClassifierConfig {
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
 * Get the configured classifier instance
 */
export function getConfiguredClassifier(): EventTypeClassifier {
    const config = loadClassifierConfig();
    return createClassifier(config.classifier, config.options);
}

