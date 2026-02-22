/**
 * PII Detection and Redaction Types
 */

export type PIIType = 
  | 'ip_address'
  | 'email'
  | 'username'
  | 'credential'
  | 'credit_card'
  | 'ssn'
  | 'phone_number';

export type RedactionStrategy = 'mask' | 'hash' | 'partial';

export interface PIIMatch {
  type: PIIType;
  value: string;
  startIndex: number;
  endIndex: number;
  context?: string; // Surrounding text for context
}

export interface PIIDetectionConfig {
  enabled: boolean;
  strategy: RedactionStrategy;
  keepOriginal: boolean;
  detectIPs: boolean;
  detectEmails: boolean;
  detectUsernames: boolean;
  detectCredentials: boolean;
  detectCreditCards: boolean;
  detectSSN: boolean;
  detectPhoneNumbers: boolean;
  whitelistIPs?: string[]; // IPs to exclude from redaction (e.g., internal IPs)
  whitelistDomains?: string[]; // Email domains to exclude (e.g., internal domains)
}

export interface PIIDetectionResult {
  detected: PIIMatch[];
  redactedText: string;
  redactedMetadata: Record<string, any>;
  piiTypes: PIIType[];
}

