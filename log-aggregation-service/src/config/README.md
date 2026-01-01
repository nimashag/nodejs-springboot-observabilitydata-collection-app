# Classifier Configuration

## Overview

The event type classifier used by the template miner is configured via `classifier.config.json`. This allows you to switch between different ML approaches without modifying code.

## Configuration File

Edit `src/config/classifier.config.json` to change the classifier:

```json
{
  "classifier": "rule-based",
  "options": {
    "k": 3
  }
}
```

## Available Classifiers

1. **rule-based** - Keyword matching baseline (no training required)
2. **naive-bayes** - Naive Bayes classifier using `natural` library
3. **nlp-based** - NLP-based intent recognition using `node-nlp`
4. **tfidf-knn** - TF-IDF vectorization with K-Nearest Neighbors

## Options

- `k`: Number of neighbors for TF-IDF KNN classifier (default: 3)
- `modelPath`: Path to saved model file (for future use)

## Usage

The classifier is automatically loaded when `LogTemplateMiner` is instantiated. No code changes needed to switch classifiers - just update the config file and restart the service.

