import * as vscode from 'vscode';
import { DEFAULT_CONFIG } from './defaultConfig';

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
    
    // Priority: User setting > Default API key
    const userApiKey = config.get<string>('geminiApiKey', '');
    
    return {
        geminiApiKey: userApiKey || DEFAULT_CONFIG.GEMINI_API_KEY
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