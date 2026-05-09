/**
 * ClarityAI Structured Logging System
 * Provides production-grade logging with:
 * - Multiple log levels (debug, info, warn, error)
 * - Output to VS Code Output Channel
 * - In-memory session buffer (last 500 entries)
 * - Structured format with metadata
 * - No sensitive data logging
 */

import type * as vscode from 'vscode';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    category: string;
    message: string;
    metadata?: Record<string, any>;
    stack?: string;
}

/**
 * ClarityLogger - Main logger class
 * Usage:
 *   clarityLogger.info('auth', 'User logged in', { userId: 'abc123' });
 *   clarityLogger.error('api', 'API call failed', error, { url: endpoint });
 */
export class ClarityLogger {
    private outputChannel: vscode.OutputChannel | null = null;
    private sessionBuffer: LogEntry[] = [];
    private maxBufferSize = 500;
    private isProduction = process.env.NODE_ENV === 'production';
    private verboseLogging = process.env.CLARITY_VERBOSE_LOGGING === 'true';

    /**
     * Initialize the logger with a VS Code OutputChannel
     * This should be called during extension activation
     */
    initialize(outputChannel: vscode.OutputChannel): void {
        this.outputChannel = outputChannel;
        this.info('logger', 'ClarityAI Logger initialized');
    }

    /**
     * Log at DEBUG level - detailed information for debugging
     * Only shown in verbose mode or development
     */
    debug(category: string, message: string, metadata?: Record<string, any>): void {
        if (this.verboseLogging || !this.isProduction) {
            this.log('debug', category, message, metadata);
        }
    }

    /**
     * Log at INFO level - standard operational messages
     */
    info(category: string, message: string, metadata?: Record<string, any>): void {
        this.log('info', category, message, metadata);
    }

    /**
     * Log at WARN level - warning messages about potential issues
     */
    warn(category: string, message: string, metadata?: Record<string, any>): void {
        this.log('warn', category, message, metadata);
    }

    /**
     * Log at ERROR level - error messages with optional error object
     */
    error(
        category: string,
        message: string,
        error?: Error | unknown,
        metadata?: Record<string, any>
    ): void {
        const errorStack = this.extractErrorStack(error);
        const errorMetadata = {
            ...metadata,
            errorName: error instanceof Error ? error.name : typeof error,
            errorMessage: error instanceof Error ? error.message : String(error)
        };

        this.log('error', category, message, errorMetadata, errorStack);
    }

    /**
     * Internal log method - handles formatting and output
     */
    private log(
        level: LogLevel,
        category: string,
        message: string,
        metadata?: Record<string, any>,
        stack?: string
    ): void {
        const entry = this.createLogEntry(level, category, message, metadata, stack);

        // Add to session buffer
        this.addToBuffer(entry);

        // Output to VS Code channel (if initialized)
        if (this.outputChannel) {
            this.outputChannel.appendLine(this.formatLogEntry(entry));
        }

        // Also output to console in non-production for development visibility
        if (!this.isProduction) {
            this.logToConsole(level, entry);
        }
    }

    /**
     * Create a structured log entry
     */
    private createLogEntry(
        level: LogLevel,
        category: string,
        message: string,
        metadata?: Record<string, any>,
        stack?: string
    ): LogEntry {
        return {
            timestamp: new Date().toISOString(),
            level,
            category,
            message,
            metadata: this.sanitizeMetadata(metadata),
            stack
        };
    }

    /**
     * Format log entry for display
     * Format: [TIME] [LEVEL] [CATEGORY] Message | metadata
     */
    private formatLogEntry(entry: LogEntry): string {
        const time = entry.timestamp.substring(11, 19); // HH:MM:SS
        const levelStr = entry.level.toUpperCase().padEnd(5);
        const categoryStr = `[${entry.category}]`.padEnd(12);

        let line = `[${time}] [${levelStr}] ${categoryStr} ${entry.message}`;

        // AppendMetadata if present
        if (entry.metadata && Object.keys(entry.metadata).length > 0) {
            const metaStr = Object.entries(entry.metadata)
                .map(([key, value]) => `${key}=${this.stringifyValue(value)}`)
                .join(', ');
            line += ` | ${metaStr}`;
        }

        // Append stack trace if present (errors)
        if (entry.stack) {
            line += `\n  Stack: ${entry.stack}`;
        }

        return line;
    }

    /**
     * Log to console (development only)
     */
    private logToConsole(level: LogLevel, entry: LogEntry): void {
        const emoji = {
            debug: '🔍',
            info: 'ℹ️ ',
            warn: '⚠️ ',
            error: '❌'
        };

        const output = `${emoji[level]} [${entry.category}] ${entry.message}`;

        switch (level) {
            case 'debug':
                console.debug(output, entry.metadata);
                break;
            case 'info':
                console.info(output, entry.metadata);
                break;
            case 'warn':
                console.warn(output, entry.metadata);
                break;
            case 'error':
                console.error(output, entry.metadata);
                break;
        }
    }

    /**
     * Add entry to session buffer (FIFO)
     */
    private addToBuffer(entry: LogEntry): void {
        this.sessionBuffer.push(entry);

        // Remove oldest entries if buffer exceeds max size
        if (this.sessionBuffer.length > this.maxBufferSize) {
            this.sessionBuffer = this.sessionBuffer.slice(-this.maxBufferSize);
        }
    }

    /**
     * Sanitize metadata to prevent logging sensitive data
     */
    private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
        if (!metadata) return undefined;

        const sensitiveKeys = [
            'password',
            'token',
            'secret',
            'key',
            'apiKey',
            'authorization',
            'api_key',
            'access_token',
            'refresh_token',
            'credentials',
            'ssn',
            'creditCard'
        ];

        const sanitized = { ...metadata };

        for (const key of Object.keys(sanitized)) {
            if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
                // Log that a sensitive field was redacted
                sanitized[key] = '[REDACTED]';
            }
        }

        return sanitized;
    }

    /**
     * Extract stack trace from error object
     */
    private extractErrorStack(error?: Error | unknown): string | undefined {
        if (error instanceof Error && error.stack) {
            // Only include first 3 lines of stack trace
            return error.stack.split('\n').slice(0, 3).join('\n');
        }
        return undefined;
    }

    /**
     * Stringify values for display
     */
    private stringifyValue(value: any): string {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return `"${value}"`;
        if (typeof value === 'object') {
            try {
                return JSON.stringify(value);
            } catch {
                return String(value);
            }
        }
        return String(value);
    }

    /**
     * Get session logs (for debugging or export)
     */
    getSessionLogs(): LogEntry[] {
        return [...this.sessionBuffer];
    }

    /**
     * Get logs filtered by level
     */
    getLogsByLevel(level: LogLevel): LogEntry[] {
        return this.sessionBuffer.filter(entry => entry.level === level);
    }

    /**
     * Get logs filtered by category
     */
    getLogsByCategory(category: string): LogEntry[] {
        return this.sessionBuffer.filter(entry => entry.category === category);
    }

    /**
     * Export logs as JSON string
     */
    exportLogsAsJSON(): string {
        return JSON.stringify(this.sessionBuffer, null, 2);
    }

    /**
     * Clear session logs
     */
    clearLogs(): void {
        this.sessionBuffer = [];
        this.info('logger', 'Session logs cleared');
    }

    /**
     * Get buffer statistics
     */
    getStats(): {
        totalEntries: number;
        byLevel: Record<LogLevel, number>;
        byCategory: Record<string, number>;
    } {
        const byLevel: Record<LogLevel, number> = {
            debug: 0,
            info: 0,
            warn: 0,
            error: 0
        };

        const byCategory: Record<string, number> = {};

        for (const entry of this.sessionBuffer) {
            byLevel[entry.level]++;
            byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
        }

        return {
            totalEntries: this.sessionBuffer.length,
            byLevel,
            byCategory
        };
    }
}

/**
 * Global logger instance
 * This should be initialized during extension activation
 */
export const clarityLogger = new ClarityLogger();

/**
 * Logger categories used throughout the codebase
 * Use these for consistent categorization
 */
export const LogCategory = {
    EXTENSION: 'extension',
    API: 'api',
    PRIVACY: 'privacy',
    CONFIG: 'config',
    VAULT: 'vault',
    ANALYTICS: 'analytics',
    ERROR_TRACKING: 'errorTracking',
    QUOTA: 'quota',
    CONTEXT: 'context',
    TEMPLATE: 'template',
    PERSONA: 'persona',
    IMPROVEMENT: 'improvement',
    LOGGER: 'logger'
} as const;
