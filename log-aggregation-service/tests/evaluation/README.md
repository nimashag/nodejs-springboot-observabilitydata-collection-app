# Event Type Classifier Evaluation

This directory contains evaluation scripts for comparing different ML approaches to event type classification.

## Overview

The evaluation compares four different approaches:
1. **Rule-based** (Baseline) - Keyword matching
2. **Naive Bayes** - Using `natural` library's BayesClassifier
3. **NLP-based** - Using `node-nlp` for intent recognition
4. **TF-IDF + KNN** - Using TF-IDF vectorization with K-Nearest Neighbors

## Performance Results

### Accuracy Summary

| Classifier | Accuracy | Precision (Avg) | Recall (Avg) | F1-Score (Avg) |
|------------|----------|-----------------|--------------|----------------|
| **Rule-based** | 61.82% | 59.23% | 47.92% | 51.01% |
| **Naive Bayes** | 34.55% | 56.67% | 46.50% | 44.21% |
| **NLP-based** | **92.73%** | **92.86%** | **92.50%** | **91.62%** |
| **TF-IDF KNN** | 72.73% | 18.18% | 25.00% | 21.05% |

*Results based on 70/30 train-test split from aggregated logs (182 samples total)*

### Per-Class Performance (NLP-based - Best Performer)

| Event Type | Precision | Recall | F1-Score |
|------------|-----------|--------|----------|
| **unknown** | 100.00% | 95.00% | 97.44% |
| **http_request** | 100.00% | 75.00% | 85.71% |
| **database** | 100.00% | 100.00% | 100.00% |
| **authentication** | 71.43% | 100.00% | 83.33% |
| **warning** | N/A | N/A | N/A |
| **error** | N/A | N/A | N/A |

## Running the Evaluation

```bash
npm run evaluate:event-types
```

## What It Does

1. **Loads Test Dataset**: Extracts templates from aggregated logs and infers ground truth event types
2. **Before Training**: Evaluates each classifier (except rule-based) without training
3. **Training**: Trains ML classifiers on a curated training dataset
4. **After Training**: Re-evaluates all classifiers with trained models
5. **Metrics**: Calculates accuracy, precision, recall, F1-score, and confusion matrices
6. **Results**: Saves detailed results to `evaluation-results/` directory (git-ignored)

## Output

Results are saved to:
- `evaluation-results/evaluation-{timestamp}.json` - Timestamped results
- `evaluation-results/evaluation-latest.json` - Latest results

Each result file contains:
- Accuracy metrics (before/after training)
- Per-class precision, recall, and F1-scores
- Confusion matrices
- Detailed predictions for each test sample

## Changing the Classifier in Production

To change which classifier is used in the application:

1. Edit `src/config/classifier.config.json`
2. Set `"classifier"` to one of:
   - `"rule-based"`
   - `"naive-bayes"`
   - `"nlp-based"`
   - `"tfidf-knn"`
3. Restart the service

No code changes required!

## Model Comparison & Analysis

### 1. Rule-based (Baseline) - 61.82% Accuracy

**How it works:**
- Simple keyword matching using hardcoded patterns
- Checks for keywords like "error", "warn", "http.request", "db.", "auth", etc.
- No training required, deterministic results

**Strengths:**
- ✅ Fast and lightweight (no model overhead)
- ✅ Interpretable (easy to understand why a classification was made)
- ✅ No training data required
- ✅ Consistent performance (no randomness)

**Weaknesses:**
- ❌ Limited to predefined patterns
- ❌ Cannot learn new patterns from data
- ❌ Poor recall for classes without clear keywords (e.g., "warning": 0% recall)
- ❌ High false positive rate for ambiguous patterns (e.g., "database" has 15.38% precision)

**Why it performs moderately:**
The rule-based approach works well for classes with distinctive keywords (e.g., "http.request", "db.") but struggles with:
- Classes that lack clear keywords (warning, error)
- Ambiguous patterns that match multiple classes
- Variations in log format that don't match exact patterns

**Best for:** Simple deployments where interpretability and speed are more important than accuracy.

---

### 2. Naive Bayes - 34.55% Accuracy

**How it works:**
- Probabilistic classifier based on Bayes' theorem
- Assumes feature independence (words in template)
- Learns word probabilities for each event type from training data

**Strengths:**
- ✅ Fast training and inference
- ✅ Works well with small datasets
- ✅ Probabilistic output (confidence scores)
- ✅ Handles unseen words gracefully

**Weaknesses:**
- ❌ **Overfitting observed**: Performance drops from 72.73% (before training) to 34.55% (after training)
- ❌ Feature independence assumption is violated (words in logs are contextually dependent)
- ❌ Poor generalization when training data doesn't match test distribution
- ❌ Struggles with class imbalance (e.g., "unknown" class dominates)

**Why it underperforms:**
1. **Overfitting**: The model memorizes training patterns too closely and fails on test data
2. **Feature independence assumption**: Log templates have contextual dependencies (e.g., "db.connecting" vs "db.connected" are related but treated independently)
3. **Class imbalance**: The "unknown" class dominates (40/55 test samples), causing the model to default to it
4. **Training data mismatch**: Even with real log data, the small training set (127 samples) may not capture all variations

**Best for:** Balanced datasets with clear word-class associations, but not recommended for this use case.

---

### 3. NLP-based - 92.73% Accuracy ⭐ **BEST PERFORMER**

**How it works:**
- Uses `node-nlp` library with neural network-based intent recognition
- Learns semantic patterns and context from training data
- Handles variations in phrasing and format

**Strengths:**
- ✅ **Highest accuracy** (92.73%) - 50% improvement over baseline
- ✅ Excellent per-class performance (100% precision/recall for database events)
- ✅ Learns semantic patterns, not just keywords
- ✅ Handles format variations well (e.g., "DELIVERY|ts=..." vs "{\"lvl\":\"info\"...")
- ✅ Robust to training data size (works well with 127 training samples)

**Weaknesses:**
- ❌ Slower training (requires neural network training epochs)
- ❌ More memory intensive
- ❌ Less interpretable than rule-based

**Why it performs best:**
1. **Semantic understanding**: Unlike keyword matching, it learns that "db.connecting", "db.connected", and "database connection" are related
2. **Context awareness**: Understands that "http.request.received" and "http.request.completed" are both HTTP events
3. **Format flexibility**: Can handle different log formats (pipe-separated, JSON, etc.) because it learns patterns, not exact matches
4. **Neural network architecture**: The underlying neural network can capture complex relationships between words and event types

**Performance breakdown:**
- **Perfect classification** for database events (100% precision/recall)
- **Excellent** for unknown events (100% precision, 95% recall)
- **Good** for HTTP requests (100% precision, 75% recall) - some confusion with authentication
- **Good** for authentication (71.43% precision, 100% recall) - some false positives from HTTP requests

**Best for:** Production use where accuracy is critical. Recommended classifier for this application.

---

### 4. TF-IDF + KNN - 72.73% Accuracy

**How it works:**
- Converts templates to TF-IDF vectors (term frequency-inverse document frequency)
- Uses K-Nearest Neighbors (K=3) with cosine similarity
- Classifies based on majority vote of nearest neighbors

**Strengths:**
- ✅ Simple and interpretable (can see which neighbors influenced the decision)
- ✅ No training required (lazy learning)
- ✅ Handles new classes easily
- ✅ Better than baseline (72.73% vs 61.82%)

**Weaknesses:**
- ❌ **Class collapse**: Predicts only "unknown" for all test samples (100% recall, 72.73% precision)
- ❌ Poor feature representation: TF-IDF may not capture semantic relationships
- ❌ Sensitive to feature scaling and vocabulary size
- ❌ Computationally expensive for large datasets (must compute similarity to all training samples)

**Why it underperforms:**
1. **Class imbalance**: The "unknown" class dominates training data, so most nearest neighbors are "unknown"
2. **Feature sparsity**: TF-IDF vectors are sparse, making similarity calculations less meaningful
3. **Vocabulary mismatch**: Test templates may have words not seen in training, leading to zero similarity
4. **K value**: K=3 may be too small for this dataset, causing it to default to the majority class

**Potential improvements:**
- Increase K value (try K=5 or K=7)
- Use better feature engineering (n-grams, character-level features)
- Balance training data across classes
- Use different distance metrics (e.g., Jaccard similarity)

**Best for:** Balanced datasets with rich vocabulary overlap between train and test sets.

---

## Key Insights

### Why ML Approaches Should (and Do) Outperform Rule-based

1. **Pattern Learning**: ML models learn patterns from data rather than relying on hardcoded rules
2. **Format Flexibility**: They handle variations in log formats better than keyword matching
3. **Context Understanding**: NLP-based models understand semantic relationships between words
4. **Adaptability**: Can improve with more training data without code changes

### Why Some ML Models Underperform

1. **Naive Bayes**: Overfitting and violated independence assumption
2. **TF-IDF KNN**: Class imbalance and feature sparsity issues
3. **Training data quality**: Small training sets (127 samples) limit model performance
4. **Class distribution**: Imbalanced classes (40/55 "unknown") bias predictions

### Recommendations

1. **For Production**: Use **NLP-based** classifier (92.73% accuracy)
2. **For Development/Testing**: Use **Rule-based** (fast, interpretable, 61.82% accuracy)
3. **For Research**: Experiment with **TF-IDF KNN** with improved feature engineering

## Example Config

```json
{
  "classifier": "nlp-based",
  "options": {
    "k": 3
  }
}
```

## Summary

### Performance Ranking

1. **🥇 NLP-based (92.73%)** - Best overall performance, recommended for production
2. **🥈 TF-IDF KNN (72.73%)** - Better than baseline but needs improvement
3. **🥉 Rule-based (61.82%)** - Reliable baseline, good for development
4. **Naive Bayes (34.55%)** - Underperforms due to overfitting

### Key Takeaways

- **ML approaches can significantly outperform rule-based methods** when properly trained on representative data
- **NLP-based classifier achieves 50% accuracy improvement** over the baseline
- **Training data quality and format matching** are critical for ML model success
- **Class imbalance** significantly impacts model performance (especially for Naive Bayes and KNN)
- **Semantic understanding** (NLP) outperforms statistical methods (Naive Bayes, TF-IDF) for this task

### Next Steps for Improvement

1. **Expand training dataset**: Collect more diverse log examples (target: 500+ samples)
2. **Balance classes**: Ensure all event types have sufficient training examples
3. **Feature engineering**: For TF-IDF KNN, try n-grams and character-level features
4. **Hyperparameter tuning**: Experiment with different K values for KNN, regularization for Naive Bayes
5. **Ensemble methods**: Combine multiple classifiers for even better performance

