/**
 * Analytics Event Tracking System
 * Integrates PostHog for privacy-friendly event tracking and analytics
 */

import * as crypto from 'crypto';

/**
 * Analytics event types
 */
export type EventType =
    | 'extension_activated'
    | 'extension_deactivated'
    | 'prompt_enhanced'
    | 'model_selected'
    | 'vault_created'
    | 'vault_submitted'
    | 'vault_approved'
    | 'vault_rejected'
    | 'suggestion_shown'
    | 'suggestion_selected'
    | 'onboarding_started'
    | 'onboarding_completed'
    | 'onboarding_skipped'
    | 'feedback_provided'
    | 'error_occurred'
    | 'quota_exceeded';

/**
 * Event properties for detailed tracking
 */
export interface EventProperties {
    [key: string]: string | number | boolean | null | undefined;
}

/**
 * Analytics event
 */
export interface AnalyticsEvent {
    type: EventType;
    properties?: EventProperties;
    timestamp?: number;
}

/**
 * User segmentation data
 */
export interface UserSegment {
    tier: 'free' | 'premium' | 'enterprise';
    daysActive: number;
    promptsEnhanced: number;
    vaultSize: number;
    language?: string;
    vsVersion?: string;
}

/**
 * PostHog-compatible event payload
 */
interface PostHogEvent {
    event: string;
    properties: {
        [key: string]: any;
        $os?: string;
        $browser?: string;
        distinct_id: string;
        timestamp: string;
    };
}

export class AnalyticsManager {
    private apiKey: string = '';
    private distinctId: string = '';
    private eventQueue: AnalyticsEvent[] = [];
    private batchSize = 20;
    private flushInterval = 300000; // 5 minutes
    private isEnabled: boolean = false;
    private isBatching: boolean = false;
    private userSegment: UserSegment | null = null;

    constructor(apiKey?: string) {
        if (apiKey) {
            this.apiKey = apiKey;
            this.isEnabled = true;
            this.distinctId = this.generateAnonymousId();
            this.startBatchTimer();
        }
    }

    /**
     * Set consent for analytics
     */
    setConsent(enabled: boolean): void {
        this.isEnabled = enabled;
        if (enabled && !this.isBatching) {
            this.startBatchTimer();
        }
    }

    /**
     * Set user segment for classification
     */
    setUserSegment(segment: UserSegment): void {
        this.userSegment = segment;
    }

    /**
     * Track an event
     */
    trackEvent(event: AnalyticsEvent): void {
        if (!this.isEnabled) {
            return;
        }

        // Add timestamp if not present
        if (!event.timestamp) {
            event.timestamp = Date.now();
        }

        this.eventQueue.push(event);

        // Auto-flush if batch is full
        if (this.eventQueue.length >= this.batchSize) {
            this.flush();
        }
    }

    /**
     * Track extension activation
     */
    trackExtensionActivated(version: string): void {
        this.trackEvent({
            type: 'extension_activated',
            properties: {
                version,
                platform: process.platform,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track extension deactivation
     */
    trackExtensionDeactivated(): void {
        this.trackEvent({
            type: 'extension_deactivated',
            properties: {
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track prompt enhancement
     */
    trackPromptEnhanced(
        model: string,
        durationMs: number,
        success: boolean,
        tokenUsed?: number
    ): void {
        this.trackEvent({
            type: 'prompt_enhanced',
            properties: {
                model,
                duration_ms: durationMs,
                success,
                tokens_used: tokenUsed || 0,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track model selection
     */
    trackModelSelected(model: string, mode: 'fast' | 'thinking' | 'smart'): void {
        this.trackEvent({
            type: 'model_selected',
            properties: {
                model,
                mode,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track vault creation
     */
    trackVaultCreated(itemCount: number, isTeamVault: boolean): void {
        this.trackEvent({
            type: 'vault_created',
            properties: {
                item_count: itemCount,
                is_team_vault: isTeamVault,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track vault item submission for approval
     */
    trackVaultSubmitted(): void {
        this.trackEvent({
            type: 'vault_submitted',
            properties: {
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track vault item approval
     */
    trackVaultApproved(): void {
        this.trackEvent({
            type: 'vault_approved',
            properties: {
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track vault item rejection
     */
    trackVaultRejected(): void {
        this.trackEvent({
            type: 'vault_rejected',
            properties: {
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track suggestion shown
     */
    trackSuggestionShown(category: string, count: number): void {
        this.trackEvent({
            type: 'suggestion_shown',
            properties: {
                category,
                count,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track suggestion selected
     */
    trackSuggestionSelected(suggestionId: string, category: string): void {
        this.trackEvent({
            type: 'suggestion_selected',
            properties: {
                suggestion_id: suggestionId,
                category,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track onboarding started
     */
    trackOnboardingStarted(): void {
        this.trackEvent({
            type: 'onboarding_started',
            properties: {
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track onboarding completed
     */
    trackOnboardingCompleted(stepsCompleted: number, totalSteps: number): void {
        this.trackEvent({
            type: 'onboarding_completed',
            properties: {
                steps_completed: stepsCompleted,
                total_steps: totalSteps,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track onboarding skipped
     */
    trackOnboardingSkipped(stepNumber: number): void {
        this.trackEvent({
            type: 'onboarding_skipped',
            properties: {
                step_number: stepNumber,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track user feedback
     */
    trackFeedback(rating: number, category: string, comment?: string): void {
        this.trackEvent({
            type: 'feedback_provided',
            properties: {
                rating,
                category,
                has_comment: !!comment,
                comment_length: comment?.length || 0,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track error event
     */
    trackError(
        errorType: string,
        severity: 'low' | 'medium' | 'high' | 'critical',
        feature: string
    ): void {
        this.trackEvent({
            type: 'error_occurred',
            properties: {
                error_type: errorType,
                severity,
                feature,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Track quota exceeded
     */
    trackQuotaExceeded(tier: string, limit: number, period: string): void {
        this.trackEvent({
            type: 'quota_exceeded',
            properties: {
                tier,
                limit,
                period,
                timestamp: new Date().toISOString(),
            },
        });
    }

    /**
     * Flush event queue to PostHog
     */
    private async flush(): Promise<void> {
        if (this.eventQueue.length === 0 || !this.isEnabled) {
            return;
        }

        const events = this.eventQueue.splice(0, this.batchSize);
        await this.sendBatch(events);
    }

    /**
     * Send batch of events to PostHog
     */
    private async sendBatch(events: AnalyticsEvent[]): Promise<void> {
        if (!this.apiKey) {
            return;
        }

        try {
            const payload = events.map((event) => this.convertToPostHogEvent(event));

            // In production, send to PostHog API
            // This is a placeholder - actual implementation would use fetch
            // await fetch('https://app.posthog.com/batch', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({
            //         api_key: this.apiKey,
            //         batch: payload,
            //     }),
            // });
        } catch (error) {
            // Silently fail - don't disrupt main functionality
            console.error('Failed to send analytics batch:', error);
        }
    }

    /**
     * Convert generic event to PostHog format
     */
    private convertToPostHogEvent(event: AnalyticsEvent): PostHogEvent {
        const timestamp = new Date(event.timestamp || Date.now()).toISOString();

        return {
            event: event.type,
            properties: {
                ...event.properties,
                distinct_id: this.distinctId,
                timestamp,
                // Add user segment info if available
                ...(this.userSegment && {
                    user_tier: this.userSegment.tier,
                    days_active: this.userSegment.daysActive,
                    prompts_enhanced: this.userSegment.promptsEnhanced,
                    vault_size: this.userSegment.vaultSize,
                }),
            },
        };
    }

    /**
     * Generate anonymous user ID
     */
    private generateAnonymousId(): string {
        const uuid = `${process.platform}-${Date.now()}-${Math.random()
            .toString(36)}`;
        return crypto.createHash('sha256').update(uuid).digest('hex').substring(0, 16);
    }

    /**
     * Start automatic batch flushing
     */
    private startBatchTimer(): void {
        if (this.isBatching) {
            return;
        }

        this.isBatching = true;
        setInterval(() => {
            this.flush();
        }, this.flushInterval);
    }

    /**
     * Get current event queue size
     */
    getQueueSize(): number {
        return this.eventQueue.length;
    }

    /**
     * Get distinct ID for debugging
     */
    getDistinctId(): string {
        return this.distinctId;
    }

    /**
     * Get analytics status
     */
    getStatus(): {
        enabled: boolean;
        queueSize: number;
        distinctId: string;
        apiKeySet: boolean;
    } {
        return {
            enabled: this.isEnabled,
            queueSize: this.eventQueue.length,
            distinctId: this.distinctId,
            apiKeySet: !!this.apiKey,
        };
    }
}
