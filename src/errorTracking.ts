/**
 * Error Tracking & Telemetry System
 * Integrates with PostHog for error reporting and event tracking
 * Privacy-first: No user identifiable information is collected
 */

import * as crypto from 'crypto';
import * as os from 'os';

export interface ErrorContext {
    feature: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    environment: 'development' | 'production';
    userId?: string; // Anonymous hash
    metadata?: Record<string, any>;
}

export interface TelemetryEvent {
    name: string;
    properties?: Record<string, any>;
    timestamp: number;
    anonymousId: string;
}

/**
 * ErrorTracker - Handles error tracking and telemetry
 */
export class ErrorTracker {
    private apiKey: string = '';
    private anonymousId: string = '';
    private isInitialized = false;
    private isOptedIn = false;
    private apiEndpoint = 'https://clarity-ai.app/api/telemetry';
    private batchSize = 10;
    private eventBatch: TelemetryEvent[] = [];
    private batchInterval: NodeJS.Timeout | null = null;

    /**
     * Initialize the error tracker with PostHog API key
     * @param apiKey PostHog API key
     * @param optedIn Whether user has opted into telemetry
     */
    initialize(apiKey: string, optedIn: boolean = false): void {
        this.apiKey = apiKey;
        this.isOptedIn = optedIn;
        this.anonymousId = this.generateAnonymousId();
        this.isInitialized = true;

        // Start batch processor
        this.startBatchProcessor();
    }

    /**
     * Generate anonymous user ID from machine + extension version
     * This is deterministic and doesn't identify the user
     */
    private generateAnonymousId(): string {
        try {
            const machineId = os.machine() || 'unknown';
            const extensionVersion = '1.3.0'; // Would be injected from package.json
            const combined = `${machineId}:${extensionVersion}`;

            return crypto
                .createHash('sha256')
                .update(combined)
                .digest('hex')
                .substring(0, 16);
        } catch {
            return 'unknown-' + Date.now();
        }
    }

    /**
     * Capture an exception with context
     */
    captureException(error: Error, context: ErrorContext): void {
        if (!this.isInitialized || !this.isOptedIn) {
            return;
        }

        const event: TelemetryEvent = {
            name: `error:${context.feature}`,
            properties: {
                error_name: error.name,
                error_message: error.message,
                error_stack: this.sanitizeStackTrace(error.stack || ''),
                severity: context.severity,
                environment: context.environment,
                feature: context.feature,
                timestamp: Date.now(),
                ...context.metadata
            },
            timestamp: Date.now(),
            anonymousId: this.anonymousId
        };

        this.addEvent(event);
    }

    /**
     * Capture an event (usage tracking)
     */
    captureEvent(name: string, properties?: Record<string, any>): void {
        if (!this.isInitialized || !this.isOptedIn) {
            return;
        }

        const event: TelemetryEvent = {
            name,
            properties: {
                ...properties,
                timestamp: Date.now()
            },
            timestamp: Date.now(),
            anonymousId: this.anonymousId
        };

        this.addEvent(event);
    }

    /**
     * Identify user (with anonymous hash)
     */
    identifyUser(userId: string, properties?: Record<string, any>): void {
        if (!this.isInitialized || !this.isOptedIn) {
            return;
        }

        // Hash the user ID for anonymity
        const hashedId = crypto
            .createHash('sha256')
            .update(userId)
            .digest('hex')
            .substring(0, 16);

        this.captureEvent('user:identified', {
            hashedId,
            ...this.sanitizeProperties(properties)
        });
    }

    /**
     * Set context that applies to all subsequent events
     */
    setContext(context: Partial<ErrorContext>): void {
        // Context can be stored and applied to all events
        // Implementation depends on persistence needs
    }

    /**
     * Add event to batch queue
     */
    private addEvent(event: TelemetryEvent): void {
        this.eventBatch.push(event);

        // Send immediately if batch size reached
        if (this.eventBatch.length >= this.batchSize) {
            this.flushBatch();
        }
    }

    /**
     * Send batch of events to server
     */
    private flushBatch(): void {
        if (this.eventBatch.length === 0) {
            return;
        }

        const batch = [...this.eventBatch];
        this.eventBatch = [];

        // Send to server asynchronously (fire and forget)
        this.sendBatch(batch).catch(error => {
            console.error('Failed to send telemetry batch:', error);
        });
    }

    /**
     * HTTP request to send batch to server
     */
    private async sendBatch(events: TelemetryEvent[]): Promise<void> {
        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    events,
                    apiKey: this.apiKey,
                    timestamp: Date.now()
                })
            });

            if (!response.ok) {
                console.error(`Telemetry request failed: ${response.status}`);
            }
        } catch (error) {
            // Silently fail - don't want telemetry to break the app
            console.error('Telemetry send failed:', error);
        }
    }

    /**
     * Start periodic batch processor
     */
    private startBatchProcessor(): void {
        // Flush batch every 30 seconds
        this.batchInterval = setInterval(() => {
            this.flushBatch();
        }, 30000);
    }

    /**
     * Sanitize stack trace to remove sensitive paths
     */
    private sanitizeStackTrace(stack: string): string {
        // Remove file paths that might contain user info
        return stack
            .split('\n')
            .slice(0, 5) // Only first 5 lines
            .map(line => {
                // Remove absolute paths
                return line.replace(/\/Users\/[^/]+/g, '/USER');
            })
            .join('\n');
    }

    /**
     * Sanitize properties to ensure no PII
     */
    private sanitizeProperties(properties?: Record<string, any>): Record<string, any> {
        if (!properties) return {};

        const sensitive = [
            'password',
            'token',
            'secret',
            'key',
            'apiKey',
            'email',
            'name',
            'phone',
            'ssn',
            'creditCard'
        ];

        const sanitized = { ...properties };

        for (const prop of Object.keys(sanitized)) {
            if (sensitive.some(s => prop.toLowerCase().includes(s.toLowerCase()))) {
                delete sanitized[prop];
            }
        }

        return sanitized;
    }

    /**
     * Check if telemetry is enabled
     */
    isEnabled(): boolean {
        return this.isInitialized && this.isOptedIn;
    }

    /**
     * Update consent status
     */
    setConsent(optedIn: boolean): void {
        this.isOptedIn = optedIn;

        if (optedIn) {
            this.captureEvent('user:analytics:enabled');
        } else {
            this.captureEvent('user:analytics:disabled');
            // Don't send further events
        }
    }

    /**
     * Cleanup and flush remaining events
     */
    dispose(): void {
        if (this.batchInterval) {
            clearInterval(this.batchInterval);
        }
        // Flush any remaining events
        this.flushBatch();
        this.isInitialized = false;
    }

    /**
     * Get event count for debugging
     */
    getPendingEventCount(): number {
        return this.eventBatch.length;
    }
}

/**
 * Global error tracker instance
 */
export const errorTracker = new ErrorTracker();

/**
 * Common error severity levels
 */
export const ErrorSeverity = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
} as const;

/**
 * Common features for error tracking
 */
export const TrackedFeatures = {
    PROMPT_IMPROVEMENT: 'prompt:improvement',
    API_CALL: 'api:call',
    CONTEXT_INJECTION: 'context:injection',
    TEMPLATE_LOOKUP: 'template:lookup',
    VAULT_OPERATION: 'vault:operation',
    COPILOT_FORWARD: 'copilot:forward',
    CONFIGURATION: 'configuration',
    ENV_SETUP: 'env:setup'
} as const;
