import * as vscode from 'vscode';
import { DEFAULT_CONFIG } from './defaultConfig';

/**
 * Configuration interface for Clarity extension
 */
export interface ClarityConfig {
    apiMode: 'clarityai' | 'custom';
    apiKey: string;
    apiBaseUrl: string;
    apiModel: string;
    fastModel: string;
    thinkingModel: string;
}

/**
 * Reads and returns the current Clarity configuration from VS Code settings
 */
export function getConfig(): ClarityConfig {
    const config = vscode.workspace.getConfiguration('clarity');
    
    // Get API mode setting
    const apiMode = config.get<'clarityai' | 'custom'>('apiMode', 'clarityai');
    
    // Get user's custom API settings
    let userApiKey = config.get<string>('apiKey', '');
    
    const userBaseUrl = config.get<string>('apiBaseUrl', 'https://integrate.api.nvidia.com/v1');
    const userModel = config.get<string>('apiModel', 'deepseek-ai/deepseek-v3.1');
    const userFastModel = config.get<string>('fastModel', 'meta/llama-3.3-70b-instruct');
    const userThinkingModel = config.get<string>('thinkingModel', 'deepseek-ai/deepseek-v3.1');
    
    // Determine configuration based on mode
    if (apiMode === 'custom') {
        // Use custom API settings
        return {
            apiMode,
            apiKey: userApiKey,
            apiBaseUrl: userBaseUrl,
            apiModel: userModel,
            fastModel: userFastModel,
            thinkingModel: userThinkingModel
        };
    } else {
        // Use ClarityAI's built-in configuration
        return {
            apiMode,
            apiKey: DEFAULT_CONFIG.CLARITY_API_KEY,
            apiBaseUrl: 'https://integrate.api.nvidia.com/v1',
            apiModel: 'deepseek-ai/deepseek-v3.1',
            fastModel: 'meta/llama-3.3-70b-instruct',
            thinkingModel: 'deepseek-ai/deepseek-v3.1'
        };
    }
}

/**
 * Updates a specific configuration value
 */
export async function updateConfig(key: keyof ClarityConfig, value: any): Promise<void> {
    const config = vscode.workspace.getConfiguration('clarity');
    await config.update(key, value, vscode.ConfigurationTarget.Global);
}

/**
 * Validates if the API key is configured based on the selected mode
 */
export function validateApiKey(config: ClarityConfig): boolean {
    // If using ClarityAI mode, the default key should always be available
    if (config.apiMode === 'clarityai') {
        return config.apiKey.trim() !== '';
    }
    
    // If using custom mode, user must provide their own key
    if (config.apiMode === 'custom') {
        return config.apiKey.trim() !== '';
    }
    
    return false;
}

/**
 * Gets a user-friendly error message for API key validation failures
 */
export function getApiKeyErrorMessage(config: ClarityConfig): string {
    if (config.apiMode === 'custom') {
        return 'Custom API mode is enabled but no API key is configured. Please set your API key in Settings > Clarity > Api Key, or switch to ClarityAI mode.';
    }
    return 'API key is not configured. Please check your settings.';
}