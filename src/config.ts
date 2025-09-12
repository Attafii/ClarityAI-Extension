import * as vscode from 'vscode';

/**
 * Configuration interface for Clarity extension
 */
export interface ClarityConfig {
    geminiApiKey: string;
}

/**
 * Reads and returns the current Clarity configuration from VS Code settings
 */
export function getConfig(): ClarityConfig {
    const config = vscode.workspace.getConfiguration('clarity');
    
    return {
        geminiApiKey: config.get<string>('geminiApiKey', 'AIzaSyBgY5kVoX7hzMi4PERtkmMT8KtnIj-Hzt0')
    };
}

/**
 * Updates a specific configuration value
 */
export async function updateConfig(key: keyof ClarityConfig, value: any): Promise<void> {
    const config = vscode.workspace.getConfiguration('clarity');
    await config.update(key, value, vscode.ConfigurationTarget.Global);
}

/**
 * Validates if the Gemini API key is configured
 */
export function validateApiKey(config: ClarityConfig): boolean {
    return config.geminiApiKey.trim() !== '';
}