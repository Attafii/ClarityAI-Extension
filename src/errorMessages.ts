/**
 * User-Facing Error Messages
 * Maps error codes to clear, helpful messages for users
 * No technical jargon or stack traces
 */

export interface UserFacingError {
    title: string;
    message: string;
    action?: {
        label: string;
        command?: string;
        url?: string;
    };
    suggestedActions?: Array<{
        label: string;
        command?: string;
        url?: string;
    }>;
}

/**
 * Error message catalog
 * Each error code maps to user-friendly guidance
 */
export const ERROR_MESSAGES: Record<string, UserFacingError> = {
    // API Errors
    'api-timeout': {
        title: '⏱️ Response is taking longer than usual',
        message: 'The LLM service is responding slowly right now. Try again in a moment, or use @clarity-fast for quicker results.',
        suggestedActions: [
            {
                label: 'Try @clarity-fast',
                command: 'clarity.switchToFast'
            },
            {
                label: 'Try again',
                command: 'clarity.retryLast'
            }
        ]
    },

    'api-unauthorized': {
        title: '🔐 Authentication error',
        message: 'ClarityAI cannot authenticate with the service. This is an internal configuration issue.',
        suggestedActions: [
            {
                label: 'Contact support',
                url: 'https://clarity-ai.app/support'
            },
            {
                label: 'Check status',
                url: 'https://clarity-ai.app/status'
            }
        ]
    },

    'api-forbidden': {
        title: '🚫 Access denied',
        message: 'Your account does not have permission to use this feature. Please upgrade your plan or contact support.',
        suggestedActions: [
            {
                label: 'View pricing',
                url: 'https://clarity-ai.app/pricing'
            },
            {
                label: 'Contact support',
                url: 'https://clarity-ai.app/support'
            }
        ]
    },

    'api-not-found': {
        title: '🔍 Service not found',
        message: 'ClarityAI service is unavailable. This is temporary. Please try again in a moment.',
        suggestedActions: [
            {
                label: 'Check status',
                url: 'https://clarity-ai.app/status'
            }
        ]
    },

    'api-rate-limit': {
        title: '⏱️ Rate limit exceeded',
        message: 'You\'ve used ClarityAI a lot today! Usage limits reset at 12:00 AM UTC. Premium members have higher limits.',
        suggestedActions: [
            {
                label: 'Learn more',
                url: 'https://clarity-ai.app/pricing'
            },
            {
                label: 'View limits',
                url: 'https://clarity-ai.app/quotas'
            }
        ]
    },

    'api-server-error': {
        title: '⚠️ Service error',
        message: 'The ClarityAI service encountered an error. This is temporary. Please try again in a moment.',
        suggestedActions: [
            {
                label: 'Try again',
                command: 'clarity.retryLast'
            },
            {
                label: 'Check status',
                url: 'https://clarity-ai.app/status'
            }
        ]
    },

    'api-malformed-response': {
        title: '❌ Unexpected response',
        message: 'The service returned an unexpected format. Try again or use a different persona.',
        suggestedActions: [
            {
                label: 'Try @clarity-fast',
                command: 'clarity.switchToFast'
            },
            {
                label: 'View help',
                command: 'clarity.showHelp'
            }
        ]
    },

    // Privacy & Security Errors
    'privacy-secrets-detected': {
        title: '🛡️ Secrets detected in your prompt!',
        message: 'ClarityAI found API keys, passwords, or other sensitive data. These have been automatically masked for your safety. Review the masked version before sending to Copilot.',
        suggestedActions: [
            {
                label: 'See what was masked',
                command: 'clarity.showSecretDetails'
            },
            {
                label: 'Continue anyway',
                command: 'clarity.sendMaskedPrompt'
            }
        ]
    },

    'privacy-scan-failed': {
        title: '⚠️ Privacy check failed',
        message: 'ClarityAI couldn\'t complete the security scan. Proceeding with caution...',
        suggestedActions: [
            {
                label: 'View logs',
                command: 'clarity.showOutputChannel'
            }
        ]
    },

    // Configuration Errors
    'config-invalid': {
        title: '⚙️ Configuration error',
        message: 'ClarityAI settings are invalid or incomplete. Please check your VS Code settings.',
        suggestedActions: [
            {
                label: 'Open settings',
                command: 'workbench.action.openSettings'
            },
            {
                label: 'Reset to defaults',
                command: 'clarity.resetSettings'
            }
        ]
    },

    'config-missing-context': {
        title: '📁 Cannot read project context',
        message: 'ClarityAI couldn\'t detect your project type. Auto-context injection is disabled. You can still enhance prompts manually.',
        suggestedActions: [
            {
                label: 'View logs for details',
                command: 'clarity.showOutputChannel'
            }
        ]
    },

    // Quota/Rate Limiting
    'quota-insufficient': {
        title: '📊 Quota exceeded',
        message: 'You\'ve reached your daily limit for prompt improvements. Limits reset at 12:00 AM UTC.',
        action: {
            label: 'Upgrade plan',
            url: 'https://clarity-ai.app/pricing'
        }
    },

    'quota-cooldown': {
        title: '⏳ Please wait',
        message: 'Too many requests in a short time. Please wait a moment before trying again.',
        suggestedActions: [
            {
                label: 'View quota',
                command: 'clarity.showQuota'
            }
        ]
    },

    // Feature Errors
    'feature-not-available': {
        title: '🔒 Feature unavailable',
        message: 'This feature requires an upgraded plan or is not available in your region.',
        suggestedActions: [
            {
                label: 'View pricing',
                url: 'https://clarity-ai.app/pricing'
            }
        ]
    },

    'vault-corrupted': {
        title: '⚠️ Vault data issue',
        message: 'Your prompt vault appears corrupted. Try clearing it and starting fresh.',
        suggestedActions: [
            {
                label: 'Clear vault',
                command: 'clarity.clearVault'
            },
            {
                label: 'Contact support',
                url: 'https://clarity-ai.app/support'
            }
        ]
    },

    'copilot-integration-failed': {
        title: '🔌 Cannot send to Copilot',
        message: 'ClarityAI couldn\'t forward the prompt to Copilot. Try copying to clipboard manually.',
        suggestedActions: [
            {
                label: 'Copy to clipboard',
                command: 'clarity.copyToClipboard'
            }
        ]
    },

    // Generic Errors
    'unknown-error': {
        title: '❌ Something went wrong',
        message: 'An unexpected error occurred. Check the logs for details, or contact support if the problem persists.',
        suggestedActions: [
            {
                label: 'View logs',
                command: 'clarity.showOutputChannel'
            },
            {
                label: 'Contact support',
                url: 'https://clarity-ai.app/support'
            }
        ]
    },

    // Setup/Onboarding Errors
    'onboarding-not-shown': {
        title: '👋 Welcome!',
        message: 'ClarityAI can help you write better prompts for Copilot. Start the tutorial to learn more.',
        suggestedActions: [
            {
                label: 'Start tutorial',
                command: 'clarity.showOnboarding'
            }
        ]
    }
};

/**
 * Get user-friendly error message by error code
 * Falls back to generic "unknown error" if code not found
 */
export function getUserFacingError(errorCode: string): UserFacingError {
    return (
        ERROR_MESSAGES[errorCode] || {
            title: '❌ Something went wrong',
            message: `Error: ${errorCode}. Please check the logs or contact support.`,
            suggestedActions: [
                {
                    label: 'Contact support',
                    url: 'https://clarity-ai.app/support'
                }
            ]
        }
    );
}

/**
 * Error code constants for type safety
 */
export const ErrorCode = {
    // API Errors
    API_TIMEOUT: 'api-timeout',
    API_UNAUTHORIZED: 'api-unauthorized',
    API_FORBIDDEN: 'api-forbidden',
    API_NOT_FOUND: 'api-not-found',
    API_RATE_LIMIT: 'api-rate-limit',
    API_SERVER_ERROR: 'api-server-error',
    API_MALFORMED_RESPONSE: 'api-malformed-response',

    // Privacy & Security
    PRIVACY_SECRETS_DETECTED: 'privacy-secrets-detected',
    PRIVACY_SCAN_FAILED: 'privacy-scan-failed',

    // Configuration
    CONFIG_INVALID: 'config-invalid',
    CONFIG_MISSING_CONTEXT: 'config-missing-context',

    // Quota
    QUOTA_INSUFFICIENT: 'quota-insufficient',
    QUOTA_COOLDOWN: 'quota-cooldown',

    // Features
    FEATURE_NOT_AVAILABLE: 'feature-not-available',
    VAULT_CORRUPTED: 'vault-corrupted',
    COPILOT_INTEGRATION_FAILED: 'copilot-integration-failed',

    // Generic
    UNKNOWN_ERROR: 'unknown-error',
    ONBOARDING_NOT_SHOWN: 'onboarding-not-shown'
} as const;

/**
 * Show error to user via VS Code UI
 * This would be called from extension.ts
 */
export async function showErrorToUser(
    errorCode: string,
    context?: {
        showInformation?: boolean;
        showError?: boolean;
    }
): Promise<void> {
    const error = getUserFacingError(errorCode);

    // For now, this is a placeholder
    // Would be integrated with vscode.window API
    console.error(`${error.title}: ${error.message}`);
}

/**
 * Map HTTP status codes to error codes
 */
export function getErrorCodeFromHttpStatus(statusCode: number): string {
    switch (statusCode) {
        case 400:
            return ErrorCode.API_MALFORMED_RESPONSE;
        case 401:
            return ErrorCode.API_UNAUTHORIZED;
        case 403:
            return ErrorCode.API_FORBIDDEN;
        case 404:
            return ErrorCode.API_NOT_FOUND;
        case 429:
            return ErrorCode.API_RATE_LIMIT;
        case 500:
        case 502:
        case 503:
        case 504:
            return ErrorCode.API_SERVER_ERROR;
        default:
            return ErrorCode.UNKNOWN_ERROR;
    }
}

/**
 * Map timeout errors to error code
 */
export function getErrorCodeFromTimeout(): string {
    return ErrorCode.API_TIMEOUT;
}
