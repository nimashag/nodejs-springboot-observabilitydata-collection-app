/**
 * Log Parameterizer Utility
 * 
 * Shared utility for parameterizing log strings by replacing variable parts
 * with placeholders. This ensures consistency between training and inference.
 */
export class LogParameterizer {
    // Parameterization patterns - applied in order
    private readonly parameterPatterns = [
        // UUIDs
        { pattern: /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, placeholder: '<UUID>' },
        // IPv4 addresses
        { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, placeholder: '<IP>' },
        // IPv6 addresses (simplified)
        { pattern: /([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}/g, placeholder: '<IPV6>' },
        // Email addresses
        { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, placeholder: '<EMAIL>' },
        // URLs
        { pattern: /https?:\/\/[^\s"']+/g, placeholder: '<URL>' },
        // MongoDB ObjectIds (24 hex chars)
        { pattern: /\b[0-9a-f]{24}\b/gi, placeholder: '<OBJECTID>' },
        // Timestamps (ISO format)
        { pattern: /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?/g, placeholder: '<TIMESTAMP>' },
        // Dates (YYYY-MM-DD)
        { pattern: /\d{4}-\d{2}-\d{2}/g, placeholder: '<DATE>' },
        // Request IDs (UUID-like)
        { pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, placeholder: '<REQUEST_ID>' },
        // Session IDs
        { pattern: /SESSION-[0-9a-f-]+/gi, placeholder: '<SESSION_ID>' },
        // File paths
        { pattern: /[\/\\][^\s"']+\.(jpg|jpeg|png|gif|pdf|txt|log|js|ts|java|class)/gi, placeholder: '<FILE_PATH>' },
        // Port numbers
        { pattern: /:\d{4,5}\b/g, placeholder: '<PORT>' },
        // Large numbers (likely IDs or counts)
        { pattern: /\b\d{6,}\b/g, placeholder: '<LONG_NUM>' },
        // Medium numbers (likely IDs)
        { pattern: /\b\d{4,5}\b/g, placeholder: '<NUM>' },
        // Small numbers (keep for now, might be status codes, etc.)
        // { pattern: /\b\d{1,3}\b/g, placeholder: '<SMALL_NUM>' },
    ];

    /**
     * Parameterize a log by replacing variable parts with placeholders
     * 
     * @param log Raw log string
     * @returns Parameterized log string
     */
    parameterizeLog(log: string): string {
        let parameterized = log;

        // Apply parameterization patterns in order
        for (const { pattern, placeholder } of this.parameterPatterns) {
            parameterized = parameterized.replace(pattern, placeholder);
        }

        // Additional parameterization for JSON values
        parameterized = this.parameterizeJsonValues(parameterized);

        return parameterized;
    }

    /**
     * Parameterize JSON values in logs
     */
    private parameterizeJsonValues(log: string): string {
        // Try to extract and parameterize JSON objects
        const jsonPattern = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
        return log.replace(jsonPattern, (match) => {
            try {
                const parsed = JSON.parse(match);
                const parameterized = this.parameterizeJsonObject(parsed);
                return JSON.stringify(parameterized);
            } catch {
                // Not valid JSON, return as is
                return match;
            }
        });
    }

    /**
     * Recursively parameterize JSON object values
     */
    private parameterizeJsonObject(obj: any): any {
        if (typeof obj === 'string') {
            // Check if string matches any parameter pattern
            for (const { pattern, placeholder } of this.parameterPatterns) {
                if (pattern.test(obj)) {
                    return placeholder;
                }
            }
            return obj;
        } else if (typeof obj === 'number') {
            if (obj > 9999) {
                return '<NUM>';
            }
            return obj;
        } else if (Array.isArray(obj)) {
            return obj.map(item => this.parameterizeJsonObject(item));
        } else if (obj && typeof obj === 'object') {
            const parameterized: any = {};
            for (const [key, value] of Object.entries(obj)) {
                parameterized[key] = this.parameterizeJsonObject(value);
            }
            return parameterized;
        }
        return obj;
    }
}

// Export singleton instance for convenience
export const logParameterizer = new LogParameterizer();

