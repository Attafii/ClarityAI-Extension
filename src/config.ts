import * as vscode from 'vscode';

/**
 * Configuration interface for Clarity extension
 */
export interface ClarityConfig {
    mode: 'instant' | 'confirmation';
    useExternalLLM: boolean;
    geminiApiKey: string;
}

/**
 * Reads and returns the current Clarity configuration from VS Code settings
 */
export function getConfig(): ClarityConfig {
    const config = vscode.workspace.getConfiguration('clarity');
    
    return {
        mode: config.get<'instant' | 'confirmation'>('mode', 'confirmation'),
        useExternalLLM: config.get<boolean>('useExternalLLM', true),
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
 * Validates if the current configuration is valid for external LLM usage
 */
export function validateExternalLLMConfig(config: ClarityConfig): boolean {
    if (!config.useExternalLLM) {
        return true; // No validation needed if not using external LLM
    }
    
    return config.geminiApiKey.trim() !== '';
}