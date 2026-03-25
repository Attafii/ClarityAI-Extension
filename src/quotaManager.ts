/**
 * Quota Management & Rate Limiting System
 * Tracks and enforces usage limits per user
 * Supports both hourly and daily quotas
 */

import * as vscode from 'vscode';

export interface QuotaConfig {
    maxRequestsPerHour: number;
    maxRequestsPerDay: number;
    maxTokensPerRequest: number;
    cooldownMinutes: number;
    resetHour: number; // UTC hour when daily quota resets (0-23)
}

export interface QuotaStatus {
    allowed: boolean;
    reason?: string;
    remainingToday: number;
    remainingThisHour: number;
    nextResetTime: Date;
    cooldownUntil?: Date;
}

/**
 * QuotaManager - Enforces usage limits based on free/premium tier
 */
export class QuotaManager {
    private config: QuotaConfig;
    private state: Map<string, QuotaState> = new Map();
    private context: vscode.ExtensionContext | null = null;

    constructor(config?: Partial<QuotaConfig>) {
        // Default configuration: Free tier
        this.config = {
            maxRequestsPerHour: 20,
            maxRequestsPerDay: 50,
            maxTokensPerRequest: 8192,
            cooldownMinutes: 5,
            resetHour: 0, // Midnight UTC
            ...config
        };
    }

    /**
     * Initialize quota manager with extension context for persistence
     */
    initialize(context: vscode.ExtensionContext): void {
        this.context = context;
        this.loadState();
    }

    /**
     * Check if a request is allowed
     */
    async isAllowed(): Promise<QuotaStatus> {
        const now = new Date();
        const state = this.getOrCreateState();

        // Check if in cooldown
        if (state.cooldownUntil && now < state.cooldownUntil) {
            return {
                allowed: false,
                reason: `Rate limited. Please wait ${Math.ceil((state.cooldownUntil.getTime() - now.getTime()) / 1000 / 60)} minutes.`,
                remainingToday: state.dailyCount,
                remainingThisHour: state.hourlyCount,
                nextResetTime: this.getNextDailyReset(),
                cooldownUntil: state.cooldownUntil
            };
        }

        // Reset counters if needed
        state.resetCountersIfNeeded();

        // Check hourly limit
        if (state.hourlyCount >= this.config.maxRequestsPerHour) {
            // Apply cooldown
            state.cooldownUntil = new Date(now.getTime() + this.config.cooldownMinutes * 60 * 1000);
            this.saveState();

            return {
                allowed: false,
                reason: `Hourly limit reached (${this.config.maxRequestsPerHour} requests/hour). Please wait and try again.`,
                remainingToday: Math.max(0, this.config.maxRequestsPerDay - state.dailyCount),
                remainingThisHour: 0,
                nextResetTime: this.getNextDailyReset(),
                cooldownUntil: state.cooldownUntil
            };
        }

        // Check daily limit
        if (state.dailyCount >= this.config.maxRequestsPerDay) {
            return {
                allowed: false,
                reason: `Daily limit reached (${this.config.maxRequestsPerDay} requests/day). Usage resets at ${this.getResetTimeString()}.`,
                remainingToday: 0,
                remainingThisHour: Math.max(0, this.config.maxRequestsPerHour - state.hourlyCount),
                nextResetTime: this.getNextDailyReset()
            };
        }

        return {
            allowed: true,
            remainingToday: Math.max(0, this.config.maxRequestsPerDay - state.dailyCount),
            remainingThisHour: Math.max(0, this.config.maxRequestsPerHour - state.hourlyCount),
            nextResetTime: this.getNextDailyReset()
        };
    }

    /**
     * Record a successful request
     */
    async recordRequest(tokens: number = 0): Promise<void> {
        const state = this.getOrCreateState();
        state.resetCountersIfNeeded();

        state.hourlyCount++;
        state.dailyCount++;
        state.lastRequestTime = new Date();

        if (tokens > 0) {
            state.tokensUsedToday += tokens;
        }

        this.saveState();
    }

    /**
     * Get remaining quota for display in UI
     */
    getRemainingQuota(): {
        hour: number;
        day: number;
        percentage: number;
    } {
        const state = this.getOrCreateState();
        state.resetCountersIfNeeded();

        const remaining = {
            hour: Math.max(0, this.config.maxRequestsPerHour - state.hourlyCount),
            day: Math.max(0, this.config.maxRequestsPerDay - state.dailyCount),
            percentage: Math.round((state.dailyCount / this.config.maxRequestsPerDay) * 100)
        };

        return remaining;
    }

    /**
     * Check if user is approaching quota limit
     */
    isApproachingLimit(): boolean {
        const quota = this.getRemainingQuota();
        // Warning at 80% usage
        return quota.percentage >= 80;
    }

    /**
     * Get formatted remaining quota string for display
     */
    getQuotaString(): string {
        const quota = this.getRemainingQuota();
        return `${quota.day} requests remaining today (${quota.percentage}% used)`;
    }

    /**
     * Reset daily counters (admin function for testing)
     */
    resetDaily(): void {
        const state = this.getOrCreateState();
        state.dailyCount = 0;
        state.lastDailyReset = new Date();
        state.tokensUsedToday = 0;
        this.saveState();
    }

    /**
     * Reset cooldown (admin function)
     */
    resetCooldown(): void {
        const state = this.getOrCreateState();
        state.cooldownUntil = undefined;
        this.saveState();
    }

    /**
     * Update quota configuration (for premium tier upgrade)
     */
    updateConfig(newConfig: Partial<QuotaConfig>): void {
        this.config = { ...this.config, ...newConfig };
        // Save new config
    }

    /**
     * Get internal state
     */
    private getOrCreateState(): QuotaState {
        if (!this.state.has('global')) {
            this.state.set('global', new QuotaState(this.config.resetHour));
        }
        return this.state.get('global')!;
    }

    /**
     * Persist state to storage
     */
    private saveState(): void {
        if (!this.context) return;

        const state = this.getOrCreateState();
        this.context.globalState.update('clarity:quota', {
            hourlyCount: state.hourlyCount,
            dailyCount: state.dailyCount,
            lastRequestTime: state.lastRequestTime?.toISOString(),
            lastDailyReset: state.lastDailyReset?.toISOString(),
            tokensUsedToday: state.tokensUsedToday,
            cooldownUntil: state.cooldownUntil?.toISOString(),
            resetHour: this.config.resetHour
        });
    }

    /**
     * Load state from storage
     */
    private loadState(): void {
        if (!this.context) return;

        const stored = this.context.globalState.get<any>('clarity:quota');
        if (stored) {
            const state = this.getOrCreateState();
            state.hourlyCount = stored.hourlyCount || 0;
            state.dailyCount = stored.dailyCount || 0;
            state.lastRequestTime = stored.lastRequestTime ? new Date(stored.lastRequestTime) : undefined;
            state.lastDailyReset = stored.lastDailyReset ? new Date(stored.lastDailyReset) : new Date();
            state.tokensUsedToday = stored.tokensUsedToday || 0;
            state.cooldownUntil = stored.cooldownUntil ? new Date(stored.cooldownUntil) : undefined;
        }
    }

    /**
     * Get next daily reset time
     */
    private getNextDailyReset(): Date {
        const now = new Date();
        const nextReset = new Date(now);
        nextReset.setUTCHours(this.config.resetHour, 0, 0, 0);

        // If reset time has already passed today, set to tomorrow
        if (nextReset <= now) {
            nextReset.setDate(nextReset.getDate() + 1);
        }

        return nextReset;
    }

    /**
     * Get reset time as readable string
     */
    private getResetTimeString(): string {
        const resetTime = this.getNextDailyReset();
        return resetTime.toLocaleString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            timeZone: 'UTC',
            timeZoneName: 'short'
        });
    }
}

/**
 * Internal quota state class
 */
class QuotaState {
    hourlyCount = 0;
    dailyCount = 0;
    tokensUsedToday = 0;
    lastRequestTime?: Date;
    lastDailyReset = new Date();
    cooldownUntil?: Date;
    resetHour = 0;

    constructor(resetHour: number) {
        this.resetHour = resetHour;
    }

    /**
     * Reset counters if needed
     */
    resetCountersIfNeeded(): void {
        const now = new Date();

        // Reset hourly counter every hour
        if (!this.lastRequestTime || now.getUTCHours() !== this.lastRequestTime.getUTCHours()) {
            this.hourlyCount = 0;
        }

        // Reset daily counter at configured reset hour
        if (!this.lastDailyReset || this.getDriftedHour(now) >= this.resetHour) {
            this.dailyCount = 0;
            this.tokensUsedToday = 0;
            this.lastDailyReset = new Date(now);
        }
    }

    /**
     * Get adjusted hour for daily reset
     */
    private getDriftedHour(date: Date): number {
        return date.getUTCHours();
    }
}

/**
 * Default quota configurations
 */
export const QuotaPresets = {
    FREE: {
        maxRequestsPerHour: 20,
        maxRequestsPerDay: 50,
        maxTokensPerRequest: 8192,
        cooldownMinutes: 5,
        resetHour: 0
    },
    PREMIUM: {
        maxRequestsPerHour: 100,
        maxRequestsPerDay: 500,
        maxTokensPerRequest: 8192,
        cooldownMinutes: 1,
        resetHour: 0
    },
    ENTERPRISE: {
        maxRequestsPerHour: 1000,
        maxRequestsPerDay: 10000,
        maxTokensPerRequest: 8192,
        cooldownMinutes: 0,
        resetHour: 0
    }
} as const;

/**
 * Global quota manager instance
 */
export const quotaManager = new QuotaManager(QuotaPresets.FREE);
