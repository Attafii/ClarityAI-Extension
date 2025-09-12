import * as vscode from 'vscode';
import { getConfig } from './config';
import { improvePrompt } from './autocorrect';
import { forwardToCopilot, debugAvailableCommands } from './forward';

/**
 * Clarity VS Code Extension - Entry Point
 * 
 * This extension registers a Chat Participant (@clarity) that improves developer prompts
 * using Gemini 2.0 Flash API and shows buttons to send to Copilot or copy to clipboard.
 */

let clarityParticipant: vscode.ChatParticipant | undefined;
let lastEnhancedPrompt: string = '';

/**
 * Extension activation function
 * Called when VS Code activates the extension
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Clarity extension is now active!');

    // Debug: Log available commands to help with forwarding
    debugAvailableCommands();

    // Register the @clarity chat participant
    registerChatParticipant(context);

    // Register commands for mode switching and forwarding
    registerCommands(context);
}

/**
 * Registers the @clarity chat participant
 */
function registerChatParticipant(context: vscode.ExtensionContext) {
    // Create and register the chat participant
    clarityParticipant = vscode.chat.createChatParticipant('clarity', handleChatRequest);
    clarityParticipant.iconPath = vscode.Uri.joinPath(context.extensionUri, 'icon.png');
    clarityParticipant.followupProvider = {
        provideFollowups(_result: vscode.ChatResult, _context: vscode.ChatContext, _token: vscode.CancellationToken) {
            if (!lastEnhancedPrompt) {
                // Default suggestions when no previous enhanced prompt
                return [
                    {
                        prompt: 'Help me write a better prompt for coding tasks',
                        label: '🎯 Coding Prompt Help',
                        command: 'clarity'
                    },
                    {
                        prompt: 'Show me examples of well-structured prompts',
                        label: '📚 Show Examples',
                        command: 'clarity'
                    }
                ];
            }

            // Context-aware suggestions based on last enhanced prompt
            return [
                {
                    prompt: `Make this enhanced prompt even more specific: "${lastEnhancedPrompt}"`,
                    label: '🎯 Add More Detail',
                    command: 'clarity'
                },
                {
                    prompt: `Simplify this enhanced prompt for beginners: "${lastEnhancedPrompt}"`,
                    label: '🔰 Make Beginner-Friendly',
                    command: 'clarity'
                },
                {
                    prompt: `Simplify this prompt and make it more concise: "${lastEnhancedPrompt}"`,
                    label: '✂️ Simplify Prompt',
                    command: 'clarity'
                },
                {
                    prompt: `Add more technical constraints to: "${lastEnhancedPrompt}"`,
                    label: '⚙️ Add Constraints',
                    command: 'clarity'
                },
                {
                    prompt: `Convert this to a step-by-step tutorial format: "${lastEnhancedPrompt}"`,
                    label: '� Make Step-by-Step',
                    command: 'clarity'
                }
            ];
        }
    };

    context.subscriptions.push(clarityParticipant);
}

/**
 * Handles incoming chat requests to @clarity
 */
async function handleChatRequest(
    request: vscode.ChatRequest,
    _context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    _token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
    try {
        // Get user's prompt from the request
        const userPrompt = request.prompt.trim();
        
        // Handle edge case: empty prompt
        if (!userPrompt) {
            stream.markdown('❌ **No prompt detected.** Please provide text to improve.');
            return { metadata: { command: 'clarity', error: 'empty_prompt' } };
        }

        // Get current configuration
        const config = getConfig();
        
        // Debug configuration
        console.log('🔧 Clarity Configuration:', {
            hasApiKey: !!config.geminiApiKey
        });

        // Show processing indicator
        stream.markdown('🤖 **ClarityAI is currently preparing your upgraded prompt...**\n\n');
        
        // Improve the prompt using Gemini 2.0 Flash
        const improvedPrompt = await improvePrompt(userPrompt);
        
        // Show success message
        stream.markdown('✅ **ClarityAI enhancement complete!**\n\n');
        
        // Check if any improvements were made
        if (improvedPrompt === userPrompt) {
            stream.markdown('✅ **Your prompt looks good!** No changes needed.\n\n');
            stream.markdown(`**Original:** ${userPrompt}`);
            return { metadata: { command: 'clarity', result: 'no_changes' } };
        }

        // Show the enhanced prompt
        stream.markdown('✨ **Enhanced prompt:**\n\n');
        stream.markdown(`**Before:** ${userPrompt}\n\n`);
        stream.markdown(`**After (Enhanced):**\n\n${improvedPrompt}\n\n`);

        // Store the enhanced prompt for follow-up suggestions
        lastEnhancedPrompt = improvedPrompt;

        // Show action buttons
        stream.markdown('👆 **Choose an action:**\n\n');
        stream.button({
            title: '🤖 Send to Copilot',
            command: 'clarity.forwardToCopilot',
            arguments: [improvedPrompt]
        });
        stream.button({
            title: '📋 Copy Prompt',
            command: 'clarity.copyPrompt',
            arguments: [improvedPrompt]
        });

        return { 
            metadata: { 
                command: 'clarity',
                improved: true,
                originalLength: userPrompt.length,
                improvedLength: improvedPrompt.length
            } 
        };

    } catch (error) {
        // Handle any unexpected errors
        stream.markdown('❌ **Error occurred while improving prompt.**\n\n');
        stream.markdown(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('Clarity error:', error);
        
        return { metadata: { command: 'clarity', error: 'processing_error' } };
    }
}

/**
 * Registers all extension commands
 */
function registerCommands(context: vscode.ExtensionContext) {
    // Command: Forward prompt to Copilot
    const forwardToCopilotCommand = vscode.commands.registerCommand('clarity.forwardToCopilot', async (improvedPrompt: string) => {
        try {
            await forwardToCopilot(improvedPrompt);
            vscode.window.showInformationMessage('✅ Prompt sent to Copilot successfully!');
        } catch (error) {
            // Fallback: Copy to clipboard and open chat
            await vscode.env.clipboard.writeText(improvedPrompt);
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            vscode.window.showWarningMessage('❌ Auto-forward failed. Prompt copied to clipboard - paste it in the chat panel.');
            console.error('Failed to forward to Copilot:', error);
        }
    });

    // Command: Copy improved prompt to clipboard
    const copyPromptCommand = vscode.commands.registerCommand('clarity.copyPrompt', async (improvedPrompt: string) => {
        try {
            await vscode.env.clipboard.writeText(improvedPrompt);
            vscode.window.showInformationMessage('📋 Enhanced prompt copied to clipboard!');
        } catch (error) {
            vscode.window.showErrorMessage('❌ Failed to copy prompt to clipboard.');
            console.error('Failed to copy prompt:', error);
        }
    });

    // Add commands to subscriptions for proper cleanup
    context.subscriptions.push(
        forwardToCopilotCommand,
        copyPromptCommand
    );
}

/**
 * Extension deactivation function
 * Called when VS Code deactivates the extension
 */
export function deactivate() {
    console.log('Clarity extension deactivated');
    
    // Clean up the chat participant
    if (clarityParticipant) {
        clarityParticipant.dispose();
    }
}