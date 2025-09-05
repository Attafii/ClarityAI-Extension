import * as vscode from 'vscode';

/**
 * Forwards an improved prompt directly to GitHub Copilot Chat
 * This function uses VS Code's command system to send messages directly to Copilot
 * @param improvedPrompt The improved prompt text to send to Copilot
 */
export async function forwardToCopilot(improvedPrompt: string): Promise<void> {
    try {
        // Primary method: Use the direct chat send command with Copilot target
        // This should work with the latest VS Code and GitHub Copilot extension
        await vscode.commands.executeCommand(
            'workbench.action.chat.sendMessage', 
            improvedPrompt,
            { target: "@copilot" }
        );
        
        console.log('✅ Successfully forwarded prompt to Copilot via direct command');
        
    } catch (primaryError) {
        console.warn('Primary forwarding method failed, trying alternatives:', primaryError);
        
        try {
            // Alternative method 1: Try the newer chat submit command
            await vscode.commands.executeCommand(
                'workbench.action.chat.submit',
                `@copilot ${improvedPrompt}`
            );
            
            console.log('✅ Successfully forwarded prompt to Copilot via submit command');
            
        } catch (alternativeError) {
            console.warn('Alternative forwarding method failed:', alternativeError);
            
            try {
                // Alternative method 2: Focus chat first, then send
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                
                // Wait a moment for the panel to load
                await new Promise(resolve => setTimeout(resolve, 200));
                
                // Try to send the message
                await vscode.commands.executeCommand(
                    'workbench.action.chat.sendMessage',
                    improvedPrompt,
                    { target: "@copilot" }
                );
                
                console.log('✅ Successfully forwarded prompt to Copilot via focus + send');
                
            } catch (finalError) {
                console.error('All forwarding methods failed:', finalError);
                
                // Last resort: Copy to clipboard and show error
                await vscode.env.clipboard.writeText(improvedPrompt);
                
                // Display user-friendly error message
                vscode.window.showErrorMessage(
                    '❌ Failed to automatically send prompt to Copilot. ' +
                    'The enhanced prompt has been copied to your clipboard - ' +
                    'please paste it in the Copilot chat manually.',
                    'Open Chat Panel'
                ).then(selection => {
                    if (selection === 'Open Chat Panel') {
                        vscode.commands.executeCommand('workbench.view.chat');
                    }
                });
                
                // Re-throw the error so calling code knows it failed
                throw new Error(`Auto-forward failed: ${finalError}`);
            }
        }
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
 * Debug function to log available chat and copilot commands
 * This helps identify the correct command names for forwarding
 */
export async function debugAvailableCommands(): Promise<void> {
    try {
        const allCommands = await vscode.commands.getCommands();
        const relevantCommands = allCommands.filter((cmd: string) => 
            cmd.includes('chat') || 
            cmd.includes('copilot') ||
            cmd.includes('github')
        );
        
        console.log('🔍 Available Chat/Copilot Commands:');
        relevantCommands.forEach(cmd => console.log('  -', cmd));
        
        // Also log extension info
        const copilotExt = vscode.extensions.getExtension('GitHub.copilot');
        const chatExt = vscode.extensions.getExtension('GitHub.copilot-chat');
        
        console.log('🔍 Extension Status:');
        console.log('  - GitHub.copilot:', copilotExt ? 'Found' : 'Not found');
        console.log('  - GitHub.copilot-chat:', chatExt ? 'Found' : 'Not found');
        
    } catch (error) {
        console.error('Error debugging commands:', error);
    }
}