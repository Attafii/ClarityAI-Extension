import * as vscode from 'vscode';

/**
 * Forwards an improved prompt to Copilot Chat
 * @param improvedPrompt The improved prompt text to send to Copilot
 */
export async function forwardToCopilot(improvedPrompt: string): Promise<void> {
    try {
        // First, check if Copilot extension is available
        const copilotExtension = vscode.extensions.getExtension('GitHub.copilot') || 
                                vscode.extensions.getExtension('GitHub.copilot-chat');
        
        if (!copilotExtension) {
            throw new Error('GitHub Copilot extension not found. Please install and enable GitHub Copilot.');
        }

        // Ensure the extension is activated
        if (!copilotExtension.isActive) {
            await copilotExtension.activate();
        }

        // Try different methods to send the message to Copilot
        const success = await tryForwardMethods(improvedPrompt);
        
        if (!success) {
            throw new Error('Failed to forward prompt to Copilot using available methods');
        }
        
    } catch (error) {
        console.error('Error forwarding to Copilot:', error);
        throw error;
    }
}

/**
 * Tries multiple methods to forward the prompt to Copilot
 * @param prompt The prompt to forward
 * @returns Promise<boolean> indicating success
 */
async function tryForwardMethods(prompt: string): Promise<boolean> {
    const methods = [
        () => tryWorkbenchChatSend(prompt),
        () => tryGitHubCopilotChat(prompt),
        () => tryCopilotChatSubmit(prompt),
        () => tryGenericChatCommand(prompt)
    ];

    for (const method of methods) {
        try {
            const success = await method();
            if (success) {
                console.log('Successfully forwarded prompt to Copilot');
                return true;
            }
        } catch (error) {
            console.warn('Forward method failed, trying next:', error);
            continue;
        }
    }

    return false;
}

/**
 * Method 1: Try using workbench.action.chat.sendMessage
 */
async function tryWorkbenchChatSend(prompt: string): Promise<boolean> {
    try {
        await vscode.commands.executeCommand('workbench.action.chat.sendMessage', 
            `@copilot ${prompt}`, 
            { target: '@copilot' }
        );
        return true;
    } catch (error) {
        console.warn('workbench.action.chat.sendMessage failed:', error);
        return false;
    }
}

/**
 * Method 2: Try using GitHub Copilot Chat specific command
 */
async function tryGitHubCopilotChat(prompt: string): Promise<boolean> {
    try {
        await vscode.commands.executeCommand('github.copilot.chat.send', prompt);
        return true;
    } catch (error) {
        console.warn('github.copilot.chat.send failed:', error);
        return false;
    }
}

/**
 * Method 3: Try using copilot chat submit command
 */
async function tryCopilotChatSubmit(prompt: string): Promise<boolean> {
    try {
        await vscode.commands.executeCommand('workbench.action.chat.submit', 
            `@copilot ${prompt}`
        );
        return true;
    } catch (error) {
        console.warn('workbench.action.chat.submit failed:', error);
        return false;
    }
}

/**
 * Method 4: Try generic chat command
 */
async function tryGenericChatCommand(prompt: string): Promise<boolean> {
    try {
        // Try to focus the chat view first
        await vscode.commands.executeCommand('workbench.view.chat');
        
        // Wait a bit for the view to load
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Try to send the message
        await vscode.commands.executeCommand('workbench.action.chat.sendMessage', 
            `@copilot ${prompt}`
        );
        return true;
    } catch (error) {
        console.warn('Generic chat command failed:', error);
        return false;
    }
}

/**
 * Opens the chat view and prepares it for manual input
 * This is a fallback when automatic forwarding fails
 * @param prompt The prompt to prepare for manual sending
 */
export async function openChatWithPrompt(prompt: string): Promise<void> {
    try {
        // Open the chat view
        await vscode.commands.executeCommand('workbench.view.chat');
        
        // Copy the improved prompt to clipboard for easy pasting
        await vscode.env.clipboard.writeText(`@copilot ${prompt}`);
        
        // Show a message to the user
        const action = await vscode.window.showInformationMessage(
            'Improved prompt copied to clipboard. Paste it in the Chat view.',
            'Open Chat View'
        );
        
        if (action === 'Open Chat View') {
            await vscode.commands.executeCommand('workbench.view.chat');
        }
        
    } catch (error) {
        console.error('Error opening chat with prompt:', error);
        throw new Error('Failed to open chat view with prompt');
    }
}

/**
 * Checks if Copilot is available and active
 * @returns Promise<boolean> indicating if Copilot is available
 */
export async function isCopilotAvailable(): Promise<boolean> {
    try {
        // Check for Copilot extensions
        const copilotExtension = vscode.extensions.getExtension('GitHub.copilot');
        const copilotChatExtension = vscode.extensions.getExtension('GitHub.copilot-chat');
        
        if (!copilotExtension && !copilotChatExtension) {
            return false;
        }
        
        // Check if at least one is active
        const copilotActive = copilotExtension?.isActive ?? false;
        const chatActive = copilotChatExtension?.isActive ?? false;
        
        return copilotActive || chatActive;
        
    } catch (error) {
        console.error('Error checking Copilot availability:', error);
        return false;
    }
}

/**
 * Gets available Copilot commands for debugging purposes
 * @returns Promise<string[]> list of available commands
 */
export async function getAvailableCopilotCommands(): Promise<string[]> {
    try {
        const allCommands = await vscode.commands.getCommands();
        const copilotCommands = allCommands.filter((cmd: string) => 
            cmd.includes('copilot') || 
            cmd.includes('chat') ||
            cmd.includes('github')
        );
        
        console.log('Available Copilot-related commands:', copilotCommands);
        return copilotCommands;
        
    } catch (error) {
        console.error('Error getting Copilot commands:', error);
        return [];
    }
}