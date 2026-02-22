import KMeans from 'ml-kmeans';
import * as natural from 'natural';
import { TfIdf } from 'natural';
import { LogTemplate, TemplateMiningResult } from '../types/log.types';
import { EventTypeClassifier } from '../classifiers';
import { getConfiguredClassifier, getConfiguredClassifierSync } from '../config/classifierLoader';
import { loadClassifierConfig } from '../config/classifierLoader';
import { LogParameterizer } from '../utils/logParameterizer';
import { EventType } from '../types/eventTypes';

/**
 * Enhanced Log Template Miner
 * 
 * Implements ML-based template extraction using:
 * 1. Parameterization (replacing variables with placeholders)
 * 2. TF-IDF vectorization for semantic similarity
 * 3. K-means clustering to group similar logs
 * 4. Template extraction from clusters
 * 
 * Similar to Drain algorithm but enhanced with ML clustering
 */
export class LogTemplateMiner {
  private templates: Map<string, LogTemplate> = new Map();
  private tfidf: TfIdf;
  private tokenizer: natural.WordTokenizer;
  private eventTypeClassifier: EventTypeClassifier;
  private parameterizer: LogParameterizer;

  constructor() {
    this.tfidf = new TfIdf();
    this.tokenizer = new natural.WordTokenizer();
    // Note: getConfiguredClassifier is now async, but constructor can't be async
    // We'll initialize it synchronously and load model asynchronously if needed
    this.eventTypeClassifier = getConfiguredClassifierSync();
    this.parameterizer = new LogParameterizer();
    this.initializeClassifier();
  }

  /**
   * Initialize classifier asynchronously (load pre-trained model if available)
   * This is called after construction to load pre-trained models
   */
  async initializeClassifier(): Promise<void> {
    try {
      const config = loadClassifierConfig();
      if (config.options?.modelPath) {
        const asyncClassifier = await getConfiguredClassifier();
        this.eventTypeClassifier = asyncClassifier;
        console.log(`TemplateMiner: Loaded pre-trained ${asyncClassifier.name} classifier`);
      }
    } catch (error) {
      console.warn(`Failed to initialize classifier with pre-trained model: ${error}`);
    }
  }

  /**
   * Mine templates from a collection of logs
   * 
   * @param logs Array of raw log strings
   * @param serviceName Optional service name for service-specific templates
   * @param minClusterSize Minimum number of logs in a cluster to create a template
   * @param maxClusters Maximum number of clusters (K for K-means)
   * @returns Template mining result
   */
  async mineTemplates(
    logs: string[],
    serviceName?: string,
    minClusterSize: number = 3,
    maxClusters: number = 50
  ): Promise<TemplateMiningResult> {
    const startTime = Date.now();

    if (logs.length === 0) {
      return {
        templates: [],
        totalLogs: 0,
        coverage: 0,
        miningTime: 0,
        statistics: {
          totalTemplates: 0,
          avgTemplateFrequency: 0,
        },
      };
    }

    console.log(`Mining templates from ${logs.length} logs...`);

    // Step 1: Parameterize logs (replace variables with placeholders)
    const parameterizedLogs = logs.map(log => this.parameterizer.parameterizeLog(log));

    // Step 2: Vectorize using TF-IDF
    const vectors = this.vectorizeLogs(parameterizedLogs);

    if (vectors.length === 0) {
      console.warn('No vectors generated from logs');
      return {
        templates: [],
        totalLogs: logs.length,
        coverage: 0,
        miningTime: Date.now() - startTime,
        statistics: {
          totalTemplates: 0,
          avgTemplateFrequency: 0,
        },
      };
    }

    // Step 3: Determine optimal number of clusters
    const optimalK = Math.min(
      Math.max(2, Math.floor(logs.length / minClusterSize)),
      maxClusters
    );

    console.log(`Clustering ${vectors.length} logs into ${optimalK} clusters...`);

    // Step 4: Cluster similar logs using K-means
    const clusters = this.clusterLogs(vectors, optimalK);

    // Step 5: Extract templates from clusters
    const templates = this.extractTemplates(
      clusters,
      logs,
      parameterizedLogs,
      serviceName,
      minClusterSize
    );

    const miningTime = Date.now() - startTime;
    const coverage = (templates.reduce((sum, t) => sum + t.frequency, 0) / logs.length) * 100;

    // Calculate statistics
    const avgFrequency = templates.length > 0
      ? templates.reduce((sum, t) => sum + t.frequency, 0) / templates.length
      : 0;

    const mostCommon = templates.length > 0
      ? templates.reduce((max, t) => t.frequency > max.frequency ? t : max, templates[0])
      : undefined;

    console.log(`Template mining completed: ${templates.length} templates found, ${coverage.toFixed(2)}% coverage`);

    return {
      templates,
      totalLogs: logs.length,
      coverage,
      miningTime,
      statistics: {
        totalTemplates: templates.length,
        avgTemplateFrequency: avgFrequency,
        mostCommonTemplate: mostCommon,
      },
    };
  }


  /**
   * Vectorize logs using TF-IDF
   * 
   * @param parameterizedLogs Array of parameterized log strings
   * @returns Array of feature vectors
   */
  private vectorizeLogs(parameterizedLogs: string[]): number[][] {
    // Reset TF-IDF
    this.tfidf = new TfIdf();

    // Add documents to TF-IDF
    parameterizedLogs.forEach(log => {
      const tokens = this.tokenizeAndStem(log);
      this.tfidf.addDocument(tokens);
    });

    // Extract all terms
    const terms = new Set<string>();
    parameterizedLogs.forEach(log => {
      const tokens = this.tokenizeAndStem(log);
      tokens.forEach(token => terms.add(token));
    });

    const termArray = Array.from(terms);

    // Create vectors for each log
    const vectors: number[][] = [];
    for (let i = 0; i < parameterizedLogs.length; i++) {
      const vector: number[] = [];
      termArray.forEach(term => {
        const tfidf = this.tfidf.tfidf(term, i);
        vector.push(tfidf);
      });
      vectors.push(vector);
    }

    return vectors;
  }

  /**
   * Tokenize a log string
   */
  private tokenizeAndStem(log: string): string[] {
    const tokens = this.tokenizer.tokenize(log.toLowerCase()) || [];
    // Use simple stemming by removing common suffixes
    return tokens.map(token => {
      // Simple stemming: remove common suffixes
      if (token.endsWith('ing') && token.length > 5) {
        return token.slice(0, -3);
      }
      if (token.endsWith('ed') && token.length > 4) {
        return token.slice(0, -2);
      }
      if (token.endsWith('s') && token.length > 3) {
        return token.slice(0, -1);
      }
      return token;
    });
  }

  /**
   * Cluster logs using K-means
   * 
   * @param vectors Feature vectors
   * @param k Number of clusters
   * @returns Cluster assignments (array of cluster indices)
   */
  private clusterLogs(vectors: number[][], k: number): number[] {
    if (vectors.length === 0) {
      return [];
    }

    // Normalize vectors (handle different vector lengths)
    const maxLength = Math.max(...vectors.map(v => v.length));
    const normalizedVectors = vectors.map(vector => {
      const normalized = [...vector];
      while (normalized.length < maxLength) {
        normalized.push(0);
      }
      return normalized.slice(0, maxLength);
    });

    try {
      const result = KMeans(normalizedVectors, k, {
        initialization: 'kmeans++',
        maxIterations: 100,
        tolerance: 0.0001,
      });

      return result.clusters;
    } catch (error) {
      console.error('K-means clustering failed:', error);
      // Fallback: assign all to cluster 0
      return new Array(vectors.length).fill(0);
    }
  }

  /**
   * Extract templates from clusters
   * 
   * @param clusters Cluster assignments
   * @param originalLogs Original log strings
   * @param parameterizedLogs Parameterized log strings
   * @param serviceName Optional service name
   * @param minClusterSize Minimum cluster size
   * @returns Array of extracted templates
   */
  private extractTemplates(
    clusters: number[],
    originalLogs: string[],
    parameterizedLogs: string[],
    serviceName?: string,
    minClusterSize: number = 3
  ): LogTemplate[] {
    const templates: LogTemplate[] = [];
    const clusterMap = new Map<number, number[]>();

    // Group logs by cluster
    clusters.forEach((clusterId, logIndex) => {
      if (!clusterMap.has(clusterId)) {
        clusterMap.set(clusterId, []);
      }
      clusterMap.get(clusterId)!.push(logIndex);
    });

    // Extract template from each cluster
    clusterMap.forEach((logIndices, clusterId) => {
      if (logIndices.length < minClusterSize) {
        return; // Skip small clusters
      }

      const clusterLogs = logIndices.map(idx => originalLogs[idx]);
      const clusterParameterized = logIndices.map(idx => parameterizedLogs[idx]);

      // Find the most representative parameterized log (most common)
      const templateString = this.findMostCommonTemplate(clusterParameterized);

      // Create regex pattern from template
      const pattern = this.templateToRegex(templateString);

      // Extract metadata
      const metadata = this.extractTemplateMetadata(clusterLogs, templateString);

      const template: LogTemplate = {
        id: `template-${clusterId}-${Date.now()}`,
        template: templateString,
        pattern: pattern.toString(),
        parameterizedLog: templateString,
        exampleLogs: clusterLogs.slice(0, 5), // Keep first 5 examples
        frequency: logIndices.length,
        service: serviceName,
        eventType: this.inferEventType(templateString),
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        metadata,
      };

      templates.push(template);
    });

    return templates;
  }

  /**
   * Find the most common template in a cluster
   */
  private findMostCommonTemplate(parameterizedLogs: string[]): string {
    const counts = new Map<string, number>();

    parameterizedLogs.forEach(log => {
      counts.set(log, (counts.get(log) || 0) + 1);
    });

    // Return the most frequent one
    let maxCount = 0;
    let mostCommon = parameterizedLogs[0];

    counts.forEach((count, log) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = log;
      }
    });

    return mostCommon;
  }

  /**
   * Convert template string to regex pattern
   */
  private templateToRegex(template: string): RegExp {
    // Escape special regex characters
    let regex = template
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Replace placeholders with regex patterns
      .replace(/<UUID>/g, '[0-9a-f-]{36}')
      .replace(/<IP>/g, '\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}')
      .replace(/<IPV6>/g, '([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}')
      .replace(/<EMAIL>/g, '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}')
      .replace(/<URL>/g, 'https?://[^\\s"\']+')
      .replace(/<OBJECTID>/g, '[0-9a-f]{24}')
      .replace(/<TIMESTAMP>/g, '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z?')
      .replace(/<DATE>/g, '\\d{4}-\\d{2}-\\d{2}')
      .replace(/<REQUEST_ID>/g, '[0-9a-f-]{36}')
      .replace(/<SESSION_ID>/g, 'SESSION-[0-9a-f-]+')
      .replace(/<FILE_PATH>/g, '[\\/\\\\][^\\s"\']+\\.(jpg|jpeg|png|gif|pdf|txt|log|js|ts|java|class)')
      .replace(/<PORT>/g, ':\\d{4,5}')
      .replace(/<LONG_NUM>/g, '\\d{6,}')
      .replace(/<NUM>/g, '\\d{4,5}')
      .replace(/<ID>/g, '[0-9a-f]{24}|[0-9a-f-]{36}|\\d+');

    return new RegExp(regex, 'i');
  }

  /**
   * Extract metadata from template
   */
  private extractTemplateMetadata(logs: string[], template: string): LogTemplate['metadata'] {
    const avgLength = logs.reduce((sum, log) => sum + log.length, 0) / logs.length;

    // Count parameters in template
    const parameterMatches = template.match(/<[A-Z_]+>/g) || [];
    const parameterCount = parameterMatches.length;

    // Identify parameter types
    const parameterTypes: Record<string, string> = {};
    parameterMatches.forEach(param => {
      const type = param.replace(/[<>]/g, '').toLowerCase();
      parameterTypes[param] = type;
    });

    return {
      avgLength: Math.round(avgLength),
      parameterCount,
      parameterTypes,
    };
  }

  /**
   * Infer event type from template using the configured classifier
   * Note: For async classifiers (like NLP), this will return EventType.UNKNOWN initially
   * The classifier should be trained and used synchronously for best results
   */
  private inferEventType(template: string): string {
    try {
      const result = this.eventTypeClassifier.classify(template);
      // Handle both sync and async results
      if (result instanceof Promise) {
        // For async classifiers, return EventType.UNKNOWN as fallback
        // In a production system, you might want to await this
        return EventType.UNKNOWN;
      }
      return result;
    } catch (error) {
      console.warn(`Error classifying event type: ${error}`);
      return EventType.UNKNOWN;
    }
  }

  /**
   * Get the current event type classifier
   */
  getEventTypeClassifier(): EventTypeClassifier {
    return this.eventTypeClassifier;
  }

  /**
   * Set a custom event type classifier (useful for testing)
   */
  setEventTypeClassifier(classifier: EventTypeClassifier): void {
    this.eventTypeClassifier = classifier;
  }

  /**
   * Match a log against existing templates
   * 
   * @param log Raw log string
   * @returns Matching template or null
   */
  matchTemplate(log: string): LogTemplate | null {
    const parameterized = this.parameterizer.parameterizeLog(log);

    // Debug: Log template matching attempts (only if DEBUG env var is set)
    const debugMode = process.env.DEBUG_TEMPLATE_MATCHING === 'true';

    if (debugMode) {
      console.log(`[TemplateMiner] Matching log: ${log.substring(0, 100)}...`);
      console.log(`[TemplateMiner] Parameterized: ${parameterized.substring(0, 100)}...`);
      console.log(`[TemplateMiner] Total templates: ${this.templates.size}`);
    }

    // First, try exact regex matching
    for (const template of this.templates.values()) {
      try {
        // Fix pattern: Remove leading/trailing slashes if present (pattern might be stored as "/pattern/i")
        let patternStr = template.pattern;
        if (patternStr.startsWith('/') && patternStr.endsWith('/i')) {
          patternStr = patternStr.slice(1, -2);
        } else if (patternStr.startsWith('/') && patternStr.endsWith('/')) {
          patternStr = patternStr.slice(1, -1);
        }

        // Make pattern more flexible: replace hardcoded timestamp milliseconds with flexible pattern
        // This handles cases where template has .648Z but log has .123Z
        patternStr = patternStr.replace(/\\\.\d{3}Z/g, '\\.\\d{3}Z'); // Make milliseconds flexible
        patternStr = patternStr.replace(/\\\.\d{3}\\+/g, '\\.\\d{3}\\+'); // Handle timezone offsets

        const regex = new RegExp(patternStr, 'i');
        const matchesOriginal = regex.test(log);
        const matchesParameterized = regex.test(parameterized);

        if (debugMode) {
          console.log(`[TemplateMiner] Template ${template.id}: matchesOriginal=${matchesOriginal}, matchesParameterized=${matchesParameterized}`);
        }

        if (matchesOriginal || matchesParameterized) {
          if (debugMode) {
            console.log(`[TemplateMiner] ✓ Matched template: ${template.id}`);
          }
          return template;
        }
      } catch (error) {
        // Invalid regex, skip
        if (debugMode) {
          console.log(`[TemplateMiner] ✗ Invalid regex for template ${template.id}: ${error}`);
        }
        continue;
      }
    }

    // Fallback: Try matching against parameterized template strings using similarity
    // This helps when regex patterns are too strict
    let bestMatch: LogTemplate | null = null;
    let bestSimilarity = 0;
    const similarityThreshold = 0.85; // 85% similarity required

    for (const template of this.templates.values()) {
      const templateParam = template.parameterizedLog || template.template;
      const similarity = this.calculateSimilarity(parameterized, templateParam);

      if (debugMode && similarity > 0.5) {
        console.log(`[TemplateMiner] Template ${template.id} similarity: ${(similarity * 100).toFixed(2)}%`);
      }

      if (similarity > bestSimilarity && similarity >= similarityThreshold) {
        bestSimilarity = similarity;
        bestMatch = template;
      }
    }

    if (bestMatch) {
      if (debugMode) {
        console.log(`[TemplateMiner] ✓ Matched template via similarity (${(bestSimilarity * 100).toFixed(2)}%): ${bestMatch.id}`);
      }
      return bestMatch;
    }

    if (debugMode) {
      console.log(`[TemplateMiner] ✗ No template matched`);
    }
    return null;
  }

  /**
   * Calculate similarity between two strings (simple Jaccard-like similarity)
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // Tokenize both strings
    const tokens1 = new Set(str1.toLowerCase().split(/\s+/));
    const tokens2 = new Set(str2.toLowerCase().split(/\s+/));

    // Calculate intersection and union
    const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
    const union = new Set([...tokens1, ...tokens2]);

    // Jaccard similarity
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Get all templates
   */
  getTemplates(): LogTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add template to collection
   */
  addTemplate(template: LogTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Clear all templates
   */
  clearTemplates(): void {
    this.templates.clear();
  }
}

