import fs from 'fs';
import path from 'path';
import { StructuredLog } from '../../src/types/log.types';
import { EventTypeClassifier } from '../../src/classifiers';
import { RuleBasedEventTypeClassifier } from '../../src/classifiers/ruleBasedClassifier';
import { NaiveBayesEventTypeClassifier } from '../../src/classifiers/naiveBayesClassifier';
import { NLPEventTypeClassifier } from '../../src/classifiers/nlpClassifier';
import { TfIdfKnnEventTypeClassifier } from '../../src/classifiers/tfidfKnnClassifier';
import { LogParameterizer } from '../../src/utils/logParameterizer';
import { inferEventTypeFromText } from '../../src/utils/eventTypeInference';

interface EvaluationResult {
    classifier: string;
    accuracy: number;
    precision: Record<string, number>;
    recall: Record<string, number>;
    f1Score: Record<string, number>;
    confusionMatrix: Record<string, Record<string, number>>;
    beforeTraining?: {
        accuracy: number;
        predictions: Array<{ template: string; predicted: string; actual: string }>;
    };
    afterTraining?: {
        accuracy: number;
        predictions: Array<{ template: string; predicted: string; actual: string }>;
    };
}

/**
 * Load all dataset from aggregated logs and split into train/test
 */
async function loadDatasetFromLogs(): Promise<{
    train: Array<{ template: string; eventType: string }>;
    test: Array<{ template: string; eventType: string }>;
}> {
    const projectRoot = path.resolve(__dirname, '../..');
    const aggregatedLogsPath = path.join(projectRoot, 'aggregated-logs');

    if (!fs.existsSync(aggregatedLogsPath)) {
        console.warn('Aggregated logs directory not found, using empty dataset');
        return { train: [], test: [] };
    }

    const files = fs.readdirSync(aggregatedLogsPath)
        .filter(f => f.endsWith('.jsonl'))
        .sort()
        .reverse()
        .slice(0, 1); // Use most recent file

    const dataset: Array<{ template: string; eventType: string }> = [];
    const seenTemplates = new Set<string>();

    for (const file of files) {
        const content = fs.readFileSync(path.join(aggregatedLogsPath, file), 'utf-8');
        const lines = content.split('\n').filter(l => l.trim());

        for (const line of lines) {
            try {
                const log: StructuredLog = JSON.parse(line);

                // Create a template-like string from the log
                if (log.event && log.raw) {
                    // Use the same parameterization logic as templateMiner
                    const parameterizer = new LogParameterizer();
                    let template = parameterizer.parameterizeLog(log.raw);

                    const templateKey = `${log.event}|${template.substring(0, 100)}`;

                    if (!seenTemplates.has(templateKey)) {
                        seenTemplates.add(templateKey);

                        // Infer event type from event name using shared utility
                        // This ensures consistency with the rule-based classifier logic
                        // Primary source: log.event
                        let eventType = inferEventTypeFromText(log.event);
                        
                        // If log.event doesn't match any category (unknown), check the raw log
                        // This helps identify infrastructure logs where log.event might be "unknown"
                        // but the raw log contains infrastructure patterns
                        if (eventType === 'unknown' && log.raw) {
                            const rawEventType = inferEventTypeFromText(log.raw);
                            // Only use raw log inference for infrastructure, server_lifecycle, or business_logic
                            // to avoid false positives from other patterns in raw logs
                            if (rawEventType === 'infrastructure' || 
                                rawEventType === 'server_lifecycle' || 
                                rawEventType === 'business_logic') {
                                eventType = rawEventType;
                            }
                        }

                        dataset.push({ template, eventType });
                    }
                }
            } catch (e) {
                // Skip invalid JSON
            }
        }
    }

    // Shuffle with fixed seed for reproducibility, then split: 70% train, 30% test
    // Using Fisher-Yates shuffle with seed
    const seed = 42; // Fixed seed for reproducibility
    const shuffled = [...dataset];
    let random = seed;
    for (let i = shuffled.length - 1; i > 0; i--) {
        random = (random * 9301 + 49297) % 233280; // Simple LCG
        const j = Math.floor((random / 233280) * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const splitIndex = Math.floor(shuffled.length * 0.7);

    return {
        train: shuffled.slice(0, splitIndex),
        test: shuffled.slice(splitIndex),
    };
}

/**
 * Load training dataset (fallback - synthetic examples)
 */
async function loadSyntheticTrainingDataset(): Promise<Array<{ template: string; eventType: string }>> {
    // Curated training set with diverse examples
    return [
        // Error events
        { template: "Error processing request <UUID>", eventType: "error" },
        { template: "Exception thrown in <METHOD>", eventType: "error" },
        { template: "Failed to connect to database", eventType: "error" },
        { template: "NullPointerException at line <NUM>", eventType: "error" },
        { template: "Database connection timeout", eventType: "error" },
        { template: "Payment gateway failed", eventType: "error" },
        { template: "Error: <MESSAGE>", eventType: "error" },
        { template: "Exception occurred during processing", eventType: "error" },

        // Warning events
        { template: "Warning: memory usage high <NUM>%", eventType: "warning" },
        { template: "Deprecated API called from <METHOD>", eventType: "warning" },
        { template: "Slow query detected <NUM>ms", eventType: "warning" },
        { template: "Warning: <MESSAGE>", eventType: "warning" },

        // HTTP events
        { template: "GET /api/users/<ID> status=<NUM>", eventType: "http_request" },
        { template: "POST /api/orders completed in <NUM>ms", eventType: "http_request" },
        { template: "HTTP request to <URL> returned <NUM>", eventType: "http_request" },
        { template: "http.request.received method=GET path=/api/orders", eventType: "http_request" },
        { template: "http.request.completed status=200 duration=<NUM>", eventType: "http_request" },
        { template: "GET /api/<PATH> <NUM>", eventType: "http_request" },
        { template: "POST /api/<PATH> <NUM>", eventType: "http_request" },
        { template: "PUT /api/<PATH> <NUM>", eventType: "http_request" },
        { template: "DELETE /api/<PATH> <NUM>", eventType: "http_request" },

        // Database events
        { template: "SELECT * FROM users WHERE id=<ID>", eventType: "database" },
        { template: "MongoDB query completed in <NUM>ms", eventType: "database" },
        { template: "Connection pool exhausted", eventType: "database" },
        { template: "db.connecting uri=<URL>", eventType: "database" },
        { template: "db.connected successfully", eventType: "database" },
        { template: "Database query executed", eventType: "database" },
        { template: "db.query <QUERY>", eventType: "database" },

        // Authentication events
        { template: "User <USERNAME> logged in successfully", eventType: "authentication" },
        { template: "Login failed for user <EMAIL>", eventType: "authentication" },
        { template: "Session <SESSION_ID> expired", eventType: "authentication" },
        { template: "JWT token validated for <USER>", eventType: "authentication" },
        { template: "User authenticated", eventType: "authentication" },
        { template: "Login attempt from <IP>", eventType: "authentication" },
        { template: "Logout successful for user <ID>", eventType: "authentication" },

        // Business logic events
        { template: "order.get_one.success orderId=<ID>", eventType: "business_logic" },
        { template: "order.create.start userId=<ID>", eventType: "business_logic" },
        { template: "restaurant.list.start", eventType: "business_logic" },
        { template: "restaurant.list.success count=<NUM>", eventType: "business_logic" },
        { template: "payment.mark_as_paid.success orderId=<ID>", eventType: "business_logic" },
        { template: "order.service.process_payment.start", eventType: "business_logic" },

        // Server lifecycle events
        { template: "server.started port=<NUM>", eventType: "server_lifecycle" },
        { template: "server.stopped gracefully", eventType: "server_lifecycle" },

        // Infrastructure events
        { template: "org.mongodb.driver.cluster - Monitor thread connected", eventType: "infrastructure" },
        { template: "org.springframework.web.servlet.DispatcherServlet initialized", eventType: "infrastructure" },
        { template: "Tomcat started on port <NUM>", eventType: "infrastructure" },
        { template: "at com.mongodb.internal.connection.DefaultServerMonitor", eventType: "infrastructure" },
    ];
}

/**
 * Calculate evaluation metrics
 */
function calculateMetrics(
    predictions: Array<{ predicted: string; actual: string }>
): {
    accuracy: number;
    precision: Record<string, number>;
    recall: Record<string, number>;
    f1Score: Record<string, number>;
    confusionMatrix: Record<string, Record<string, number>>;
} {
    const allLabels = new Set<string>();
    predictions.forEach(p => {
        allLabels.add(p.actual);
        allLabels.add(p.predicted);
    });

    const confusionMatrix: Record<string, Record<string, number>> = {};
    allLabels.forEach(label => {
        confusionMatrix[label] = {};
        allLabels.forEach(l => confusionMatrix[label][l] = 0);
    });

    predictions.forEach(p => {
        confusionMatrix[p.actual][p.predicted]++;
    });

    const precision: Record<string, number> = {};
    const recall: Record<string, number> = {};
    const f1Score: Record<string, number> = {};

    allLabels.forEach(label => {
        const tp = confusionMatrix[label][label];
        const fp = Object.values(confusionMatrix).reduce((sum, row) => {
            return sum + (row[label] || 0) - (row === confusionMatrix[label] ? tp : 0);
        }, 0);
        const fn = Object.values(confusionMatrix[label]).reduce((sum, val, idx) => {
            const labelArray = Array.from(allLabels);
            return sum + (idx !== labelArray.indexOf(label) ? val : 0);
        }, 0);

        precision[label] = tp + fp > 0 ? tp / (tp + fp) : 0;
        recall[label] = tp + fn > 0 ? tp / (tp + fn) : 0;
        f1Score[label] = precision[label] + recall[label] > 0
            ? 2 * (precision[label] * recall[label]) / (precision[label] + recall[label])
            : 0;
    });

    const correct = predictions.filter(p => p.predicted === p.actual).length;
    const accuracy = predictions.length > 0 ? correct / predictions.length : 0;

    return { accuracy, precision, recall, f1Score, confusionMatrix };
}

/**
 * Evaluate a classifier
 */
async function evaluateClassifier(
    classifier: EventTypeClassifier,
    testDataset: Array<{ template: string; eventType: string }>,
    trainingDataset?: Array<{ template: string; eventType: string }>
): Promise<EvaluationResult> {
    const result: EvaluationResult = {
        classifier: classifier.name,
        accuracy: 0,
        precision: {},
        recall: {},
        f1Score: {},
        confusionMatrix: {},
    };

    // Before training evaluation (if applicable)
    if (!classifier.isTrained() && trainingDataset) {
        const beforePredictions: Array<{ template: string; predicted: string; actual: string }> = [];

        for (const d of testDataset) {
            let predicted: string;
            const result = classifier.classify(d.template);
            if (result instanceof Promise) {
                predicted = await result;
            } else {
                predicted = result;
            }
            beforePredictions.push({
                template: d.template,
                predicted: predicted || 'unknown',
                actual: d.eventType,
            });
        }

        const beforeMetrics = calculateMetrics(beforePredictions);
        result.beforeTraining = {
            accuracy: beforeMetrics.accuracy,
            predictions: beforePredictions,
        };
    }

    // Train if needed
    if (trainingDataset && classifier.train) {
        console.log(`  Training ${classifier.name}...`);
        const trainResult = classifier.train(trainingDataset);
        if (trainResult instanceof Promise) {
            await trainResult;
        }

        // Save trained model if save method is available
        if (classifier.save && classifier.name !== 'rule-based') {
            const projectRoot = path.resolve(__dirname, '../..');
            const modelsDir = path.join(projectRoot, 'models');
            if (!fs.existsSync(modelsDir)) {
                fs.mkdirSync(modelsDir, { recursive: true });
            }

            const modelPath = path.join(modelsDir, `${classifier.name}-model.json`);
            try {
                const saveResult = classifier.save(modelPath);
                if (saveResult instanceof Promise) {
                    await saveResult;
                }
                console.log(`    ✓ Model saved to: ${modelPath}`);
            } catch (error) {
                console.warn(`    ⚠ Failed to save model: ${error}`);
            }
        }
    }

    // After training evaluation
    const predictions: Array<{ template: string; predicted: string; actual: string }> = [];

    for (const d of testDataset) {
        let predicted: string;
        const result = classifier.classify(d.template);
        if (result instanceof Promise) {
            predicted = await result;
        } else {
            predicted = result;
        }
        predictions.push({
            template: d.template,
            predicted: predicted || 'unknown',
            actual: d.eventType,
        });
    }

    const metrics = calculateMetrics(predictions);
    result.accuracy = metrics.accuracy;
    result.precision = metrics.precision;
    result.recall = metrics.recall;
    result.f1Score = metrics.f1Score;
    result.confusionMatrix = metrics.confusionMatrix;
    result.afterTraining = {
        accuracy: metrics.accuracy,
        predictions,
    };

    return result;
}

/**
 * Main evaluation function
 */
async function main() {
    console.log('=== Event Type Classifier Evaluation ===\n');

    // Load datasets from actual logs (train/test split)
    console.log('Loading datasets from aggregated logs...');
    const { train: trainDataset, test: testDataset } = await loadDatasetFromLogs();

    // Also load synthetic training data as supplement
    const syntheticTrain = await loadSyntheticTrainingDataset();

    // Combine real and synthetic training data
    const trainingDataset = [...trainDataset, ...syntheticTrain];

    console.log(`Training dataset: ${trainingDataset.length} samples (${trainDataset.length} from logs + ${syntheticTrain.length} synthetic)`);
    console.log(`Test dataset: ${testDataset.length} samples\n`);

    if (testDataset.length === 0) {
        console.error('No test data found. Please ensure aggregated logs exist.');
        process.exit(1);
    }

    // Initialize classifiers
    const classifiers: EventTypeClassifier[] = [
        new RuleBasedEventTypeClassifier(),
        new NaiveBayesEventTypeClassifier(),
        new NLPEventTypeClassifier(),
        new TfIdfKnnEventTypeClassifier(3),
    ];

    // Evaluate each classifier
    const results: EvaluationResult[] = [];

    for (const classifier of classifiers) {
        console.log(`\nEvaluating ${classifier.name}...`);
        const result = await evaluateClassifier(classifier, testDataset, trainingDataset);
        results.push(result);
    }

    // Print results
    console.log('\n\n=== EVALUATION RESULTS ===\n');

    results.forEach(result => {
        console.log(`\n${result.classifier.toUpperCase()}`);
        console.log('─'.repeat(50));

        if (result.beforeTraining) {
            console.log(`Before Training Accuracy: ${(result.beforeTraining.accuracy * 100).toFixed(2)}%`);
        }

        console.log(`After Training Accuracy: ${(result.accuracy * 100).toFixed(2)}%`);
        console.log('\nPer-Class Metrics:');

        Object.keys(result.precision).forEach(label => {
            console.log(`  ${label}:`);
            console.log(`    Precision: ${(result.precision[label] * 100).toFixed(2)}%`);
            console.log(`    Recall: ${(result.recall[label] * 100).toFixed(2)}%`);
            console.log(`    F1-Score: ${(result.f1Score[label] * 100).toFixed(2)}%`);
        });

        console.log('\nConfusion Matrix:');
        const labels = Object.keys(result.confusionMatrix);
        console.log('      ' + labels.map(l => l.substring(0, 8).padEnd(8)).join(' '));
        labels.forEach(actual => {
            const row = labels.map(predicted =>
                String(result.confusionMatrix[actual][predicted]).padStart(8)
            ).join(' ');
            console.log(`${actual.substring(0, 8).padEnd(8)} ${row}`);
        });
    });

    // Save detailed results to file (git-ignored)
    const projectRoot = path.resolve(__dirname, '../..');
    const resultsDir = path.join(projectRoot, 'evaluation-results');
    if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const resultsPath = path.join(resultsDir, `evaluation-${timestamp}.json`);
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\n\nDetailed results saved to: ${resultsPath}`);

    // Also save a latest results file
    const latestPath = path.join(resultsDir, 'evaluation-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(results, null, 2));
    console.log(`Latest results saved to: ${latestPath}`);
}

main().catch(error => {
    console.error('Evaluation failed:', error);
    process.exit(1);
});

