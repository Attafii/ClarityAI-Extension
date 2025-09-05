import * as vscode from 'vscode';
import { getConfig } from './config';
import { improvePrompt } from './autocorrect';
import { forwardToCopilot } from './forward';

/**
 * Clarity VS Code Extension - Entry Point
 * 
 * This extension registers a Chat Participant (@clarity) that improves developer prompts
 * before sending them to Copilot. It supports two modes:
 * 1. Instant Mode: Automatically forwards improved prompts to Copilot
 * 2. Confirmation Mode: Shows improved prompts with a "Send to Copilot" button
 */

let clarityParticipant: vscode.ChatParticipant | undefined;

/**
 * Extension activation function
 * Called when VS Code activates the extension
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Clarity extension is now active!');

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
            return [
                {
                    prompt: 'Restructure this prompt with more specific constraints',
                    label: '🎯 Add More Structure',
                    command: 'clarity'
                },
                {
                    prompt: 'Explain the structured prompt format used',
                    label: '� Explain Structure',
                    command: 'clarity'
                },
                {
                    prompt: 'Make this prompt more beginner-friendly',
                    label: '🔰 Simplify',
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
            mode: config.mode,
            useExternalLLM: config.useExternalLLM,
            hasApiKey: !!config.geminiApiKey
        });

        // Show processing indicator
        if (config.useExternalLLM) {
            stream.markdown('🤖 **Analyzing with Gemini 2.0 Flash to enhance your prompt...**\n\n');
        } else {
            stream.markdown('🔄 **Analyzing and improving your prompt...**\n\n');
        }
        
        // Improve the prompt using autocorrect + optional external LLM
        const improvedPrompt = await improvePrompt(userPrompt, config.useExternalLLM);
        
        // Show success message based on method used
        if (config.useExternalLLM) {
            stream.markdown('✅ **Gemini 2.0 Flash enhancement complete!**\n\n');
        }
        
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

        // Handle based on current mode
        if (config.mode === 'instant') {
            // Instant Mode: Forward immediately to Copilot
            stream.markdown('🚀 **Forwarding to Copilot automatically...**\n\n');
            
            try {
                await forwardToCopilot(improvedPrompt);
                stream.markdown('✅ **Sent to Copilot successfully!**');
            } catch (error) {
                stream.markdown('❌ **Failed to forward to Copilot.** Please try again or switch to Confirmation Mode.');
                console.error('Failed to forward to Copilot:', error);
            }
        } else {
            // Confirmation Mode: Show button for manual forwarding
            stream.markdown('👆 **Click below to send the improved prompt to Copilot:**\n\n');
            stream.button({
                title: '🤖 Send to Copilot',
                command: 'clarity.forwardToCopilot',
                arguments: [improvedPrompt]
            });
        }

        return { 
            metadata: { 
                command: 'clarity', 
                mode: config.mode,
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
    // Command: Switch to Instant Mode
    const switchToInstantMode = vscode.commands.registerCommand('clarity.switchToInstantMode', async () => {
        const config = vscode.workspace.getConfiguration('clarity');
        await config.update('mode', 'instant', vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('🚀 Clarity switched to Instant Mode - prompts will be forwarded automatically!');
    });

    // Command: Switch to Confirmation Mode
    const switchToConfirmationMode = vscode.commands.registerCommand('clarity.switchToConfirmationMode', async () => {
        const config = vscode.workspace.getConfiguration('clarity');
        await config.update('mode', 'confirmation', vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('👆 Clarity switched to Confirmation Mode - you\'ll see a button to confirm forwarding!');
    });

    // Command: Forward prompt to Copilot
    const forwardToCopilotCommand = vscode.commands.registerCommand('clarity.forwardToCopilot', async (improvedPrompt: string) => {
        try {
            await forwardToCopilot(improvedPrompt);
            vscode.window.showInformationMessage('✅ Prompt sent to Copilot successfully!');
        } catch (error) {
            vscode.window.showErrorMessage('❌ Failed to send prompt to Copilot. Make sure Copilot is available.');
            console.error('Failed to forward to Copilot:', error);
        }
    });

    // Add commands to subscriptions for proper cleanup
    context.subscriptions.push(
        switchToInstantMode,
        switchToConfirmationMode,
        forwardToCopilotCommand
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