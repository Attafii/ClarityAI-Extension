import { DEFAULT_CONFIG } from './defaultConfig';

let vscodeModule: typeof import('vscode') | undefined;

function getVscodeModule(): typeof import('vscode') | undefined {
    if (vscodeModule) {
        return vscodeModule;
    }

    try {
        // Lazily resolve vscode so this module can also run in plain Node CLI mode.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        vscodeModule = require('vscode') as typeof import('vscode');
    } catch {
        vscodeModule = undefined;
    }

    return vscodeModule;
}

/**
 * Configuration interface for Clarity extension
 */
export interface ClarityConfig {
    apiKey: string;
    apiBaseUrl: string;
    apiModel: string;
    fastModel: string;
    thinkingModel: string;
    autoInjectContext: boolean;
    showDiffView: boolean;
    enableMermaid: boolean;
    showEducationalInsights: boolean;
    defaultPersona: 'none' | 'architect' | 'security' | 'reviewer' | 'tester' | 'documentation' | 'performance' | 'frontend';
}

/**
 * Reads and returns the current Clarity configuration from VS Code settings
 */
export function getConfig(): ClarityConfig {
    const vscode = getVscodeModule();
    const config = vscode?.workspace?.getConfiguration('clarity');
    
    // Always use ClarityAI's built-in configuration via Proxy for standard LLM fields
    return {
        apiKey: DEFAULT_CONFIG.PROXY_TOKEN,
        apiBaseUrl: DEFAULT_CONFIG.PROXY_URL,
        apiModel: '"mistralai/mistral-large-3-675b-instruct-2512',
        fastModel: 'meta/llama-3.3-70b-instruct',
        thinkingModel: '"mistralai/mistral-large-3-675b-instruct-2512',
        autoInjectContext: config?.get<boolean>('autoInjectContext', true) ?? true,
        showDiffView: config?.get<boolean>('showDiffView', true) ?? true,
        enableMermaid: config?.get<boolean>('enableMermaid', true) ?? true,
        showEducationalInsights: config?.get<boolean>('showEducationalInsights', true) ?? true,
        defaultPersona: config?.get<'none' | 'architect' | 'security' | 'reviewer'>('defaultPersona', 'none') ?? 'none'
    };
}

/**
 * Updates a specific configuration value (limited to user-modifiable ones)
 */
export async function updateConfig(key: string, value: any): Promise<void> {
    const vscode = getVscodeModule();
    if (!vscode?.workspace) {
        return;
    }

    const config = vscode.workspace.getConfiguration('clarity');
    await config.update(key, value, vscode.ConfigurationTarget.Global);
}

/**
 * Validates if the API key is configured
 */
export function validateApiKey(config: ClarityConfig): boolean {
    return config.apiKey.trim() !== '';
}

/**
 * Gets a user-friendly error message for API key validation failures
 */
export function getApiKeyErrorMessage(): string {
    return 'ClarityAI internal API key is missing. Please contact support.';
}