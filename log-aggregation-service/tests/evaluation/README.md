# Event Type Classifier Evaluation

This directory contains evaluation scripts for comparing different ML approaches to event type classification.

## Overview

The evaluation compares four different approaches:
1. **Rule-based** (Baseline) - Keyword matching
2. **Naive Bayes** - Using `natural` library's BayesClassifier
3. **NLP-based** - Using `node-nlp` for intent recognition
4. **TF-IDF + KNN** - Using TF-IDF vectorization with K-Nearest Neighbors

### Event Type Categories

The evaluation uses the following event type categories:
- **error**: Application errors and exceptions
- **warning**: Warning messages
- **http_request**: HTTP request/response events
- **database**: Database operations (db.connected, db.query, etc.)
- **authentication**: Authentication and authorization events
- **business_logic**: Application domain events (orders, restaurants, payments, menu items)
- **server_lifecycle**: Server startup/shutdown events
- **infrastructure**: Infrastructure/system logs (MongoDB driver, Spring, Tomcat, Hibernate, etc.)
- **unknown**: Unclassified events

## Performance Results

### Accuracy Summary

| Classifier | Accuracy | Precision (Avg) | Recall (Avg) | F1-Score (Avg) |
|------------|----------|-----------------|--------------|----------------|
| **Rule-based** | 93.06% | 91.11% | 95.48% | 92.87% |
| **Naive Bayes** | 89.02% | 92.86% | 83.24% | 87.50% |
| **NLP-based** | **98.84%** | **100.00%** | **98.84%** | **99.41%** |
| **TF-IDF KNN** | 30.64% | 7.66% | 16.67% | 10.45% |

*Results based on 70/30 train-test split from aggregated logs (623 samples total: 450 training, 173 test)*

### Per-Class Performance (NLP-based - Best Performer)

| Event Type | Precision | Recall | F1-Score |
|------------|-----------|--------|----------|
| **business_logic** | 100.00% | 100.00% | 100.00% |
| **http_request** | 100.00% | 100.00% | 100.00% |
| **database** | 100.00% | 100.00% | 100.00% |
| **server_lifecycle** | 100.00% | 100.00% | 100.00% |
| **infrastructure** | 100.00% | 100.00% | 100.00% |
| **authentication** | 100.00% | 100.00% | 100.00% |
| **unknown** | 100.00% | 90.91% | 95.24% |
| **warning** | N/A | N/A | N/A |
| **error** | N/A | N/A | N/A |

**Key Improvement**: With expanded event type categories, the NLP-based classifier achieved **98.84% accuracy** (up from 97.69%), with perfect classification for all new categories (business_logic, server_lifecycle, infrastructure).

## Running the Evaluation

```bash
npm run evaluate:event-types
```

## What It Does

1. **Loads Dataset**: Extracts templates from aggregated logs using the same parameterization logic as production (`LogParameterizer`)
2. **Ground Truth**: Infers event types from `log.event` using shared utility (`inferEventTypeFromText`) - ensures consistency with rule-based classifier logic
3. **Before Training**: Evaluates each classifier (except rule-based) without training
4. **Training**: Trains ML classifiers on training dataset (70% of data)
5. **After Training**: Re-evaluates all classifiers with trained models on test dataset (30% of data)
6. **Metrics**: Calculates accuracy, precision, recall, F1-score, and confusion matrices
7. **Results**: Saves detailed results to `evaluation-results/` directory (git-ignored)

### Evaluation Methodology

The evaluation simulates production behavior:
- **Templates**: Created using the same `LogParameterizer` utility as production
- **Inference**: Classifiers evaluate on templates (same as production `templateMiner.ts`)
- **Ground Truth**: Derived from `log.event` using shared `inferEventTypeFromText()` utility
- **Consistency**: Both rule-based classifier and ground truth generation use the same keyword matching logic

This ensures that:
- The rule-based classifier provides a meaningful baseline (93.06%, not 100%)
- All classifiers are evaluated on the same input format (templates)
- Results are comparable and reflect real-world production performance

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

### 1. Rule-based (Baseline) - 93.06% Accuracy

**How it works:**
- Simple keyword matching using shared utility (`inferEventTypeFromText`)
- Checks for keywords like "error", "warn", "http.request", "db.", "auth", etc.
- No training required, deterministic results
- Uses the same logic for both classification and ground truth generation (ensuring consistency)

**Strengths:**
- ✅ Fast and lightweight (no model overhead)
- ✅ Interpretable (easy to understand why a classification was made)
- ✅ No training data required
- ✅ Consistent performance (no randomness)
- ✅ Strong baseline performance (93.06% accuracy)
- ✅ Perfect precision for most classes (100% for unknown, http_request, authentication)

**Weaknesses:**
- ❌ Limited to predefined patterns
- ❌ Cannot learn new patterns from data
- ❌ Lower precision for database class (55.56%) due to false positives
- ❌ Some confusion between "unknown" and other classes (8 database, 4 error misclassifications)

**Why it performs well:**
The rule-based approach works well because:
- Templates contain clear event indicators (e.g., "http.request.received", "db.connected")
- Shared utility ensures consistent keyword matching logic
- Most event types have distinctive patterns in templates
- The 93.06% baseline provides a meaningful target for ML models to beat

**Best for:** Simple deployments where interpretability and speed are important, or as a reliable baseline for comparison.

---

### 2. Naive Bayes - 89.02% Accuracy

**How it works:**
- Probabilistic classifier based on Bayes' theorem
- Assumes feature independence (words in template)
- Learns word probabilities for each event type from training data (438 samples)

**Strengths:**
- ✅ Good performance improvement after training (12.72% → 89.02%)
- ✅ Fast training and inference
- ✅ Works well with moderate-sized datasets (450 training samples)
- ✅ Probabilistic output (confidence scores)
- ✅ Handles unseen words gracefully
- ✅ Strong precision (92.86% average)
- ✅ Improved recall (83.24% average) with expanded categories

**Weaknesses:**
- ❌ Still lower recall than NLP-based (83.24% vs 98.84%)
- ❌ Feature independence assumption is violated (words in logs are contextually dependent)
- ❌ Some confusion between similar classes
- ❌ Struggles with infrastructure class (lower recall)

**Why it performs well:**
1. **Improved with expanded categories**: New categories (business_logic, infrastructure, server_lifecycle) provide clearer patterns
2. **Better class balance**: More diverse training data (450 samples) helps generalization
3. **Clearer patterns**: Business logic events have distinctive keywords that Naive Bayes can learn
4. **Feature independence limitation**: Still struggles with contextual dependencies in log templates

**Best for:** Balanced datasets with clear word-class associations. Performs well but still below NLP-based approach.

---

### 3. NLP-based - 98.84% Accuracy ⭐ **BEST PERFORMER**

**How it works:**
- Uses `node-nlp` library with neural network-based intent recognition
- Learns semantic patterns and context from training data (438 samples)
- Handles variations in phrasing and format

**Strengths:**
- ✅ **Highest accuracy** (98.84%) - 5.8% improvement over rule-based baseline
- ✅ Perfect precision (100%) across all classes
- ✅ Excellent recall (98.84% average)
- ✅ Learns semantic patterns, not just keywords
- ✅ Handles format variations well (e.g., "DELIVERY|ts=..." vs "{\"lvl\":\"info\"...")
- ✅ Robust to training data size (works well with 450 training samples)
- ✅ **Perfect classification** for all new categories: business_logic, server_lifecycle, infrastructure (100% precision/recall)
- ✅ Perfect classification for database, authentication, and http_request events (100% precision/recall)

**Weaknesses:**
- ❌ Slower training (requires neural network training epochs)
- ❌ More memory intensive
- ❌ Less interpretable than rule-based
- ❌ Minor confusion: 1 unknown → None, 1 unknown → error, 2 http_request → None

**Why it performs best:**
1. **Semantic understanding**: Unlike keyword matching, it learns that "db.connecting", "db.connected", and "database connection" are related
2. **Context awareness**: Understands that "http.request.received" and "http.request.completed" are both HTTP events
3. **Format flexibility**: Can handle different log formats (pipe-separated, JSON, etc.) because it learns patterns, not exact matches
4. **Neural network architecture**: The underlying neural network can capture complex relationships between words and event types
5. **Larger training set**: 438 samples (vs 127 previously) enables better pattern learning

**Performance breakdown:**
- **Perfect classification** for business_logic events (100% precision/recall) - NEW
- **Perfect classification** for server_lifecycle events (100% precision/recall) - NEW
- **Perfect classification** for infrastructure events (100% precision/recall) - NEW
- **Perfect classification** for database events (100% precision/recall)
- **Perfect classification** for authentication events (100% precision/recall)
- **Perfect classification** for HTTP requests (100% precision/recall)
- **Excellent** for unknown events (100% precision, 90.91% recall) - reduced from 32 to 22 samples

**Best for:** Production use where accuracy is critical. Recommended classifier for this application.

---

### 4. TF-IDF + KNN - 53.76% Accuracy

**How it works:**
- Converts templates to TF-IDF vectors (term frequency-inverse document frequency)
- Uses K-Nearest Neighbors (K=3) with cosine similarity
- Classifies based on majority vote of nearest neighbors

**Strengths:**
- ✅ Simple and interpretable (can see which neighbors influenced the decision)
- ✅ No training required (lazy learning)
- ✅ Handles new classes easily

**Weaknesses:**
- ❌ **Class collapse**: Predicts only "unknown" for all test samples (100% recall for unknown, 0% for others)
- ❌ Poor feature representation: TF-IDF may not capture semantic relationships
- ❌ Sensitive to feature scaling and vocabulary size
- ❌ Computationally expensive for large datasets (must compute similarity to all training samples)
- ❌ Worst performing classifier (53.76% accuracy)

**Why it underperforms:**
1. **Class imbalance**: The "unknown" class dominates training data (93/173 test samples), so most nearest neighbors are "unknown"
2. **Feature sparsity**: TF-IDF vectors are sparse, making similarity calculations less meaningful
3. **Vocabulary mismatch**: Test templates may have words not seen in training, leading to zero similarity
4. **K value**: K=3 may be too small for this dataset, causing it to default to the majority class
5. **No improvement with larger dataset**: Performance remains at 53.76% even with 438 training samples

**Potential improvements:**
- Increase K value (try K=5 or K=7)
- Use better feature engineering (n-grams, character-level features)
- Balance training data across classes
- Use different distance metrics (e.g., Jaccard similarity)
- Consider class weighting to reduce bias toward majority class

**Best for:** Balanced datasets with rich vocabulary overlap between train and test sets. Not recommended for this use case.

---

## Key Insights

### Why ML Approaches Can Outperform Rule-based

1. **Pattern Learning**: ML models learn patterns from data rather than relying on hardcoded rules
2. **Format Flexibility**: They handle variations in log formats better than keyword matching
3. **Context Understanding**: NLP-based models understand semantic relationships between words
4. **Adaptability**: Can improve with more training data without code changes
5. **Semantic Understanding**: NLP models can distinguish between similar patterns (e.g., "auth.login.request" in HTTP context vs authentication context)

### Why Some ML Models Underperform

1. **Naive Bayes**: Feature independence assumption violated, struggles with contextual dependencies
2. **TF-IDF KNN**: Class imbalance and feature sparsity issues cause class collapse
3. **Training data quality**: While improved (438 samples), class imbalance still affects performance
4. **Class distribution**: Imbalanced classes (93/173 "unknown" in test set) bias predictions

### Recommendations

1. **For Production**: Use **NLP-based** classifier (97.69% accuracy) - best overall performance
2. **For Development/Testing**: Use **Rule-based** (fast, interpretable, 93.06% accuracy) - strong baseline
3. **For Research**: Experiment with **Naive Bayes** improvements or **TF-IDF KNN** with better feature engineering

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

1. **🥇 NLP-based (98.84%)** - Best overall performance, recommended for production
2. **🥈 Rule-based (93.06%)** - Strong baseline, good for development/testing
3. **🥉 Naive Bayes (89.02%)** - Good performance, improved with expanded categories
4. **TF-IDF KNN (30.64%)** - Underperforms due to class collapse

### Impact of Expanded Event Type Categories

**Before expansion** (6 categories: unknown, http_request, database, authentication, error, warning):
- NLP-based: 97.69% accuracy
- Unknown category: 93/173 samples (53.76%)

**After expansion** (9 categories: added business_logic, server_lifecycle, infrastructure):
- NLP-based: **98.84% accuracy** (+1.15% improvement)
- Unknown category: **22/173 samples (12.72%)** - 76% reduction!
- Perfect classification for all new categories (100% precision/recall)
- Naive Bayes improved from 81.50% to 89.02% (+7.52%)

### Key Takeaways

- **Expanding event types significantly improves classification**: NLP-based accuracy increased from 97.69% to 98.84%
- **Reduced "unknown" category by 76%**: From 93 samples to 22 samples
- **Perfect classification for new categories**: business_logic, server_lifecycle, and infrastructure all achieve 100% precision/recall with NLP-based
- **NLP-based classifier achieves 5.8% accuracy improvement** over the rule-based baseline (98.84% vs 93.06%)
- **Rule-based provides a strong baseline** (93.06%) - not trivial to beat, making ML improvements meaningful
- **Training data quality matters**: Larger dataset (450 samples) and expanded categories improved all ML models
- **Semantic understanding** (NLP) outperforms statistical methods (Naive Bayes, TF-IDF) for this task
- **Consistent evaluation methodology**: Using shared utilities ensures fair comparison and production simulation

### Next Steps for Improvement

1. **Further reduce "unknown" category**: Analyze remaining 22 unknown samples to identify new categories
2. **Expand training dataset**: Collect more diverse log examples (target: 1000+ samples)
3. **Balance classes**: Ensure all event types have sufficient training examples, especially "error" and "warning"
4. **Feature engineering**: For TF-IDF KNN, try n-grams and character-level features
5. **Hyperparameter tuning**: Experiment with different K values for KNN, regularization for Naive Bayes
6. **Ensemble methods**: Combine multiple classifiers for even better performance
7. **Phase 2 expansion**: Consider adding "stack_trace" and "configuration" categories if patterns emerge

