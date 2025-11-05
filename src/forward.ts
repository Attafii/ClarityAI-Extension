import * as vscode from 'vscode';

/**
 * Forwards an improved prompt directly to GitHub Copilot Chat
 * This function uses VS Code's command system to send messages directly to Copilot
 * @param improvedPrompt The improved prompt text to send to Copilot
 */
export async function forwardToCopilot(improvedPrompt: string): Promise<void> {
    console.log('🚀 Attempting to forward prompt to Copilot:', improvedPrompt.substring(0, 50) + '...');
    
    const errors: string[] = [];
    
    // Method 1: Try the new chat API approach (VS Code 1.90+)
    try {
        await vscode.commands.executeCommand(
            'workbench.action.chat.open',
            {
                query: `@copilot ${improvedPrompt}`,
                isPartialQuery: false
            }
        );
        
        console.log('✅ Successfully forwarded prompt to Copilot via chat.open');
        return;
        
    } catch (error) {
        const errorMsg = `Method 1 (chat.open) failed: ${error}`;
        console.warn(errorMsg);
        errors.push(errorMsg);
    }
    
    // Method 2: Open chat panel and insert text
    try {
        await vscode.commands.executeCommand('workbench.view.chat');
        
        // Wait for panel to load
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Insert the text into the chat input
        await vscode.commands.executeCommand(
            'workbench.action.chat.insertAtCursor',
            `@copilot ${improvedPrompt}`
        );
        
        console.log('✅ Successfully inserted prompt into Copilot chat');
        return;
        
    } catch (error) {
        const errorMsg = `Method 2 (insertAtCursor) failed: ${error}`;
        console.warn(errorMsg);
        errors.push(errorMsg);
    }
    
    // Method 3: Try direct send message command
    try {
        await vscode.commands.executeCommand('workbench.view.chat');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        await vscode.commands.executeCommand(
            'workbench.action.chat.sendMessage',
            `@copilot ${improvedPrompt}`
        );
        
        console.log('✅ Successfully sent prompt via sendMessage');
        return;
        
    } catch (error) {
        const errorMsg = `Method 3 (sendMessage) failed: ${error}`;
        console.warn(errorMsg);
        errors.push(errorMsg);
    }
    
    // Method 4: Focus Copilot specific panel and copy
    try {
        await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Copy to clipboard with @copilot prefix
        await vscode.env.clipboard.writeText(`@copilot ${improvedPrompt}`);
        
        // Show user guidance
        vscode.window.showInformationMessage(
            '📋 Prompt copied with @copilot prefix. Please paste it in the chat panel and press Enter.',
            'Got it!'
        );
        
        console.log('✅ Prompt copied to clipboard with @copilot prefix and Copilot panel focused');
        return;
        
    } catch (error) {
        const errorMsg = `Method 4 (focus + copy) failed: ${error}`;
        console.warn(errorMsg);
        errors.push(errorMsg);
    }
    
    // All methods failed
    console.error('All forwarding methods failed:', errors);
    
    // Last resort: Just copy to clipboard
    try {
        await vscode.env.clipboard.writeText(improvedPrompt);
        throw new Error(`All 4 forwarding methods failed. Errors: ${errors.join('; ')}`);
    } catch (clipboardError) {
        throw new Error(`Complete failure: ${clipboardError}`);
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
        const chatCommands = allCommands.filter((cmd: string) => 
            cmd.includes('chat') || 
            cmd.includes('copilot') ||
            cmd.includes('github')
        );
        
        console.log('🔍 Available Chat/Copilot Commands (' + chatCommands.length + ' found):');
        chatCommands.forEach(cmd => console.log('  -', cmd));
        
        // Check extension status
        const copilotExt = vscode.extensions.getExtension('GitHub.copilot');
        const chatExt = vscode.extensions.getExtension('GitHub.copilot-chat');
        
        console.log('🔍 Extension Status:');
        console.log('  - GitHub.copilot:', copilotExt ? `Found (Active: ${copilotExt.isActive})` : 'Not found');
        console.log('  - GitHub.copilot-chat:', chatExt ? `Found (Active: ${chatExt.isActive})` : 'Not found');
        
        // Test if we can access chat view
        try {
            await vscode.commands.executeCommand('workbench.view.chat');
            console.log('✅ Chat view accessible');
        } catch (error) {
            console.log('❌ Chat view not accessible:', error);
        }
        
        // Look for specific chat commands we want to use
        const targetCommands = [
            'workbench.action.chat.open',
            'workbench.action.chat.insertAtCursor',
            'workbench.panel.chat.view.copilot.focus',
            'workbench.action.chat.sendMessage',
            'workbench.action.chat.submit'
        ];
        
        console.log('🎯 Target commands availability:');
        targetCommands.forEach(cmd => {
            const available = chatCommands.includes(cmd);
            console.log(`  - ${cmd}: ${available ? '✅ Available' : '❌ Not found'}`);
        });
        
    } catch (error) {
        console.error('Error debugging commands:', error);
    }
}