import crypto from 'crypto';
import { StructuredLog } from '../types/log.types';
import {
  PIIType,
  PIIMatch,
  PIIDetectionConfig,
  PIIDetectionResult,
  RedactionStrategy,
} from '../types/pii.types';

/**
 * PII Detector Service
 * 
 * Detects and redacts Personally Identifiable Information (PII) from logs
 * to maintain compliance with data protection regulations.
 */
export class PIIDetector {
  private config: PIIDetectionConfig;
  private patterns: Map<PIIType, RegExp>;

  constructor(config?: Partial<PIIDetectionConfig>) {
    // Load configuration from environment variables or use defaults
    this.config = this.loadConfig(config);
    this.patterns = this.initializePatterns();
  }

  /**
   * Load configuration from environment variables with defaults
   */
  private loadConfig(override?: Partial<PIIDetectionConfig>): PIIDetectionConfig {
    const defaultConfig: PIIDetectionConfig = {
      enabled: process.env.PII_DETECTION_ENABLED !== 'false',
      strategy: (process.env.PII_REDACTION_STRATEGY as RedactionStrategy) || 'mask',
      keepOriginal: process.env.PII_KEEP_ORIGINAL === 'true',
      detectIPs: process.env.PII_DETECT_IPS !== 'false',
      detectEmails: process.env.PII_DETECT_EMAILS !== 'false',
      detectUsernames: process.env.PII_DETECT_USERNAMES !== 'false',
      detectCredentials: process.env.PII_DETECT_CREDENTIALS !== 'false',
      detectCreditCards: process.env.PII_DETECT_CC_NUMBERS === 'true',
      detectSSN: process.env.PII_DETECT_SSN === 'true',
      detectPhoneNumbers: process.env.PII_DETECT_PHONE === 'true',
      whitelistIPs: process.env.PII_WHITELIST_IPS?.split(',').map(ip => ip.trim()) || [],
      whitelistDomains: process.env.PII_WHITELIST_DOMAINS?.split(',').map(d => d.trim()) || [],
    };

    return { ...defaultConfig, ...override };
  }

  /**
   * Initialize regex patterns for PII detection
   */
  private initializePatterns(): Map<PIIType, RegExp> {
    const patterns = new Map<PIIType, RegExp>();

    // IPv4 address pattern (excludes localhost and private IPs by default, but we'll filter later)
    patterns.set('ip_address', /(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/g);

    // IPv6 address pattern (simplified)
    const ipv6Pattern = /(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::1|::ffff:\d+\.\d+\.\d+\.\d+/g;
    patterns.set('ip_address', new RegExp(
      `(?:${patterns.get('ip_address')!.source}|${ipv6Pattern.source})`,
      'g'
    ));

    // Email address pattern
    patterns.set('email', /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);

    // Username patterns (common formats)
    // Matches: username=value, user=value, login=value, etc.
    patterns.set('username', /(?:username|user|login|account|uid|userId)[=:]\s*([a-zA-Z0-9._-]+)/gi);

    // Credential patterns (passwords, tokens, API keys)
    // Matches: password=value, pwd=value, secret=value, token=value, apiKey=value
    patterns.set('credential', /(?:password|pwd|pass|secret|token|apikey|api_key|auth|authorization)[=:]\s*([^\s"']+)/gi);

    // Credit card pattern (Luhn algorithm compatible, but we'll do basic pattern matching)
    patterns.set('credit_card', /\b(?:\d{4}[-\s]?){3}\d{4}\b/g);

    // SSN pattern (US format: XXX-XX-XXXX)
    patterns.set('ssn', /\b\d{3}-\d{2}-\d{4}\b/g);

    // Phone number patterns (US and international formats)
    patterns.set('phone_number', /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g);

    return patterns;
  }

  /**
   * Detect all PII in a text string
   */
  public detectPII(text: string): PIIMatch[] {
    if (!this.config.enabled || !text) {
      return [];
    }

    const matches: PIIMatch[] = [];

    // Detect IP addresses
    if (this.config.detectIPs) {
      matches.push(...this.detectIPs(text));
    }

    // Detect email addresses
    if (this.config.detectEmails) {
      matches.push(...this.detectEmails(text));
    }

    // Detect usernames
    if (this.config.detectUsernames) {
      matches.push(...this.detectUsernames(text));
    }

    // Detect credentials
    if (this.config.detectCredentials) {
      matches.push(...this.detectCredentials(text));
    }

    // Detect credit cards
    if (this.config.detectCreditCards) {
      matches.push(...this.detectCreditCards(text));
    }

    // Detect SSN
    if (this.config.detectSSN) {
      matches.push(...this.detectSSN(text));
    }

    // Detect phone numbers
    if (this.config.detectPhoneNumbers) {
      matches.push(...this.detectPhoneNumbers(text));
    }

    // Sort matches by start index
    return matches.sort((a, b) => a.startIndex - b.startIndex);
  }

  /**
   * Detect IP addresses
   */
  private detectIPs(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const pattern = this.patterns.get('ip_address')!;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const ip = match[0];
      
      // Skip whitelisted IPs
      if (this.config.whitelistIPs?.includes(ip)) {
        continue;
      }

      // Skip localhost and private IP ranges (common in logs)
      if (this.isPrivateIP(ip)) {
        continue;
      }

      matches.push({
        type: 'ip_address',
        value: ip,
        startIndex: match.index,
        endIndex: match.index + ip.length,
        context: this.getContext(text, match.index, ip.length),
      });
    }

    return matches;
  }

  /**
   * Check if IP is private/localhost
   */
  private isPrivateIP(ip: string): boolean {
    // Localhost
    if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
      return true;
    }

    // Private IP ranges
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^::ffff:10\./,
      /^::ffff:172\.(1[6-9]|2[0-9]|3[01])\./,
      /^::ffff:192\.168\./,
    ];

    return privateRanges.some(range => range.test(ip));
  }

  /**
   * Detect email addresses
   */
  private detectEmails(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const pattern = this.patterns.get('email')!;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const email = match[0];
      const domain = email.split('@')[1];

      // Skip whitelisted domains
      if (this.config.whitelistDomains?.some(wd => domain.toLowerCase().endsWith(wd.toLowerCase()))) {
        continue;
      }

      matches.push({
        type: 'email',
        value: email,
        startIndex: match.index,
        endIndex: match.index + email.length,
        context: this.getContext(text, match.index, email.length),
      });
    }

    return matches;
  }

  /**
   * Detect usernames
   */
  private detectUsernames(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const pattern = this.patterns.get('username')!;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const username = match[1];
      
      // Skip if it looks like an ID (UUID, MongoDB ObjectId, etc.)
      if (this.isLikelyID(username)) {
        continue;
      }

      matches.push({
        type: 'username',
        value: username,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        context: this.getContext(text, match.index, match[0].length),
      });
    }

    return matches;
  }

  /**
   * Detect credentials
   */
  private detectCredentials(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const pattern = this.patterns.get('credential')!;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const credential = match[1];
      
      // Skip if it's a token format we recognize (JWT, etc.)
      if (this.isLikelyToken(credential)) {
        continue;
      }

      matches.push({
        type: 'credential',
        value: credential,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        context: this.getContext(text, match.index, match[0].length),
      });
    }

    return matches;
  }

  /**
   * Detect credit card numbers
   */
  private detectCreditCards(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const pattern = this.patterns.get('credit_card')!;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      const cardNumber = match[0].replace(/[-\s]/g, '');
      
      // Basic validation (should be 13-19 digits)
      if (cardNumber.length >= 13 && cardNumber.length <= 19) {
        matches.push({
          type: 'credit_card',
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          context: this.getContext(text, match.index, match[0].length),
        });
      }
    }

    return matches;
  }

  /**
   * Detect SSN
   */
  private detectSSN(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const pattern = this.patterns.get('ssn')!;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        type: 'ssn',
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        context: this.getContext(text, match.index, match[0].length),
      });
    }

    return matches;
  }

  /**
   * Detect phone numbers
   */
  private detectPhoneNumbers(text: string): PIIMatch[] {
    const matches: PIIMatch[] = [];
    const pattern = this.patterns.get('phone_number')!;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      matches.push({
        type: 'phone_number',
        value: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
        context: this.getContext(text, match.index, match[0].length),
      });
    }

    return matches;
  }

  /**
   * Get context around a match (for debugging/audit)
   */
  private getContext(text: string, startIndex: number, length: number, contextLength: number = 20): string {
    const start = Math.max(0, startIndex - contextLength);
    const end = Math.min(text.length, startIndex + length + contextLength);
    return text.substring(start, end);
  }

  /**
   * Check if a string is likely an ID (UUID, ObjectId, etc.)
   */
  private isLikelyID(value: string): boolean {
    // UUID pattern
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return true;
    }

    // MongoDB ObjectId pattern
    if (/^[0-9a-f]{24}$/i.test(value)) {
      return true;
    }

    // Numeric ID
    if (/^\d+$/.test(value) && value.length > 5) {
      return true;
    }

    return false;
  }

  /**
   * Check if a string is likely a token (JWT, etc.)
   */
  private isLikelyToken(value: string): boolean {
    // JWT pattern (three base64 parts separated by dots)
    if (/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/.test(value)) {
      return true;
    }

    // Long alphanumeric string (likely token)
    if (/^[A-Za-z0-9]{32,}$/.test(value)) {
      return true;
    }

    return false;
  }

  /**
   * Redact PII from text using the configured strategy
   */
  public redactPII(text: string, matches: PIIMatch[]): string {
    if (!matches.length) {
      return text;
    }

    // Sort matches by start index in reverse order to avoid index shifting issues
    const sortedMatches = [...matches].sort((a, b) => b.startIndex - a.startIndex);

    let redactedText = text;

    for (const match of sortedMatches) {
      const replacement = this.getReplacement(match.value, match.type);
      redactedText = 
        redactedText.substring(0, match.startIndex) +
        replacement +
        redactedText.substring(match.endIndex);
    }

    return redactedText;
  }

  /**
   * Get replacement string based on redaction strategy
   */
  private getReplacement(value: string, type: PIIType): string {
    switch (this.config.strategy) {
      case 'hash':
        return this.hashValue(value, type);
      case 'partial':
        return this.partialMask(value, type);
      case 'mask':
      default:
        return this.fullMask(type);
    }
  }

  /**
   * Full mask replacement
   */
  private fullMask(type: PIIType): string {
    const labels: Record<PIIType, string> = {
      ip_address: '[REDACTED_IP]',
      email: '[REDACTED_EMAIL]',
      username: '[REDACTED_USERNAME]',
      credential: '[REDACTED_CREDENTIAL]',
      credit_card: '[REDACTED_CC]',
      ssn: '[REDACTED_SSN]',
      phone_number: '[REDACTED_PHONE]',
    };
    return labels[type] || '[REDACTED]';
  }

  /**
   * Hash replacement (SHA-256, first 8 chars)
   */
  private hashValue(value: string, type: PIIType): string {
    const hash = crypto.createHash('sha256').update(value).digest('hex').substring(0, 8);
    const labels: Record<PIIType, string> = {
      ip_address: `[HASH_IP:${hash}]`,
      email: `[HASH_EMAIL:${hash}]`,
      username: `[HASH_USERNAME:${hash}]`,
      credential: `[HASH_CREDENTIAL:${hash}]`,
      credit_card: `[HASH_CC:${hash}]`,
      ssn: `[HASH_SSN:${hash}]`,
      phone_number: `[HASH_PHONE:${hash}]`,
    };
    return labels[type] || `[HASH:${hash}]`;
  }

  /**
   * Partial mask replacement (show first/last characters)
   */
  private partialMask(value: string, type: PIIType): string {
    if (value.length <= 4) {
      return '****';
    }

    const showChars = Math.min(2, Math.floor(value.length / 4));
    const prefix = value.substring(0, showChars);
    const suffix = value.substring(value.length - showChars);
    const masked = '*'.repeat(Math.max(3, value.length - (showChars * 2)));

    return `${prefix}${masked}${suffix}`;
  }

  /**
   * Redact PII from metadata object (recursive)
   */
  public redactMetadata(metadata: Record<string, any>): Record<string, any> {
    if (!this.config.enabled || !metadata) {
      return metadata;
    }

    const redacted: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        const matches = this.detectPII(value);
        if (matches.length > 0) {
          redacted[key] = this.redactPII(value, matches);
        } else {
          redacted[key] = value;
        }
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          redacted[key] = value.map(item => {
            if (typeof item === 'string') {
              const matches = this.detectPII(item);
              return matches.length > 0 ? this.redactPII(item, matches) : item;
            } else if (typeof item === 'object' && item !== null) {
              return this.redactMetadata(item as Record<string, any>);
            }
            return item;
          });
        } else {
          redacted[key] = this.redactMetadata(value as Record<string, any>);
        }
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Redact PII from a structured log
   */
  public redactStructuredLog(log: StructuredLog): StructuredLog {
    if (!this.config.enabled) {
      return log;
    }

    // Detect PII in raw log
    const rawMatches = this.detectPII(log.raw);
    const redactedRaw = this.redactPII(log.raw, rawMatches);

    // Detect PII in metadata
    const redactedMetadata = this.redactMetadata(log.metadata);

    // Collect all detected PII types
    const allMatches = [...rawMatches];
    const metadataString = JSON.stringify(log.metadata);
    const metadataMatches = this.detectPII(metadataString);
    allMatches.push(...metadataMatches);

    const detectedTypes = [...new Set(allMatches.map(m => m.type))];

    // Create redacted log
    const redactedLog: StructuredLog = {
      ...log,
      raw: redactedRaw,
      metadata: redactedMetadata,
      piiRedacted: detectedTypes.length > 0,
      piiDetected: detectedTypes.length > 0 ? detectedTypes : undefined,
    };

    return redactedLog;
  }

  /**
   * Get detection statistics
   */
  public getDetectionStats(matches: PIIMatch[]): Record<PIIType, number> {
    const stats: Record<string, number> = {};
    
    for (const match of matches) {
      stats[match.type] = (stats[match.type] || 0) + 1;
    }

    return stats as Record<PIIType, number>;
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<PIIDetectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): PIIDetectionConfig {
    return { ...this.config };
  }
}

