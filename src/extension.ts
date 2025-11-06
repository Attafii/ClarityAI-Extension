import * as vscode from 'vscode';
import { getConfig } from './config';
import { improvePrompt, ConversationContext } from './autocorrect';
import { forwardToCopilot, debugAvailableCommands } from './forward';
import { PROMPT_TEMPLATES, getTemplate, fillTemplate, searchTemplates, TEMPLATE_CATEGORIES } from './templates';
import { injectContextIfEnabled } from './contextInjection';

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
 * Extracts conversation context including todos and previous messages
 */
function extractConversationContext(context: vscode.ChatContext): ConversationContext {
    const previousMessages: string[] = [];
    const todos: string[] = [];
    const projectContext: string[] = [];
    const lastActions: string[] = [];

    // Analyze conversation history
    context.history.forEach((turn) => {
        if (turn instanceof vscode.ChatRequestTurn) {
            // User messages - extract any project context or requirements
            const message = turn.prompt;
            previousMessages.push(message);
            
            // Look for project indicators
            if (message.toLowerCase().includes('project') || 
                message.toLowerCase().includes('app') || 
                message.toLowerCase().includes('website') ||
                message.toLowerCase().includes('feature')) {
                projectContext.push(message);
            }
        } else if (turn instanceof vscode.ChatResponseTurn) {
            // Assistant responses - extract todos and action items
            turn.response.forEach((part) => {
                if (part instanceof vscode.ChatResponseMarkdownPart) {
                    const content = part.value.value;
                    
                    // Extract GitHub Copilot style todos
                    const copilotTodos = content.match(/[-*]\s*\[.\]\s*.*$/gm) || [];
                    todos.push(...copilotTodos);
                    
                    // Extract agent-style todo lists (like mine)
                    const agentTodoSections = content.match(/# Todo List[\s\S]*?(?=\n#|$)/g) || [];
                    agentTodoSections.forEach(section => {
                        // Extract individual todo items from agent format
                        const agentTodos = section.match(/- \[[x\s-]\] .+/g) || [];
                        todos.push(...agentTodos);
                        
                        // Also extract the descriptive text under each todo
                        const todoDescriptions = section.match(/  - .+/g) || [];
                        lastActions.push(...todoDescriptions);
                    });
                    
                    // Extract simple bullet point todos
                    const simpleTodos = content.match(/^[-*]\s*(?!\[)\w.+$/gm) || [];
                    todos.push(...simpleTodos.slice(0, 5));
                    
                    // Extract numbered action items
                    const actionMatches = content.match(/^\d+\.\s+.*$/gm) || [];
                    lastActions.push(...actionMatches);
                    
                    // Extract planning steps and implementation details
                    const planningSteps = content.match(/^(\d+\.|\*\*Step \d+\*\*|\*\*\d+\.\*\*).+/gm) || [];
                    lastActions.push(...planningSteps.slice(0, 3));
                    
                    // Extract agent's structured responses (What I've Added, Changes Made, etc.)
                    const structuredSections = content.match(/^## .+|^\*\*[^*]+\*\*:/gm) || [];
                    lastActions.push(...structuredSections.slice(0, 3));
                    
                    // Extract ✅ completed items and 🔄 in-progress items
                    const statusItems = content.match(/[✅🔄❌⚠️🎯📝🚀].+/gm) || [];
                    lastActions.push(...statusItems.slice(0, 5));
                    
                    // Extract bullet points that might be tasks
                    const bulletMatches = content.match(/^[-*]\s+(?!.*\[.\]).*$/gm) || [];
                    lastActions.push(...bulletMatches.slice(0, 3)); // Reduced to avoid noise
                }
            });
        }
    });

    return {
        previousMessages: previousMessages.slice(-3), // Last 3 user messages
        todos: todos.slice(-10), // Last 10 todos
        projectContext: projectContext.slice(-2), // Last 2 project contexts
        lastActions: lastActions.slice(-5) // Last 5 actions
    };
}

/**
 * Show a visual diff between original and enhanced prompts
 */
function showDiffView(stream: vscode.ChatResponseStream, original: string, enhanced: string) {
    stream.markdown('## 📊 Prompt Comparison\n\n');
    
    // Calculate improvement metrics
    const stats = calculateImprovementStats(original, enhanced);
    
    // Show metrics
    stream.markdown('### 📈 Improvements:\n\n');
    if (stats.wordsAdded > 0) {
        stream.markdown(`- ✅ **${stats.wordsAdded}** words added for clarity\n`);
    }
    if (stats.structureAdded) {
        stream.markdown(`- 📋 **Structure** added (headings, bullet points)\n`);
    }
    if (stats.specificityAdded) {
        stream.markdown(`- 🎯 **Specificity** improved (types, requirements, examples)\n`);
    }
    if (stats.lengthIncrease > 50) {
        stream.markdown(`- 📝 **${stats.lengthIncrease}%** more detailed\n`);
    }
    
    stream.markdown('\n---\n\n');
    
    // Show before/after
    stream.markdown('### Before (Original):\n\n');
    stream.markdown('```\n' + original + '\n```\n\n');
    
    stream.markdown('### After (Enhanced):\n\n');
    stream.markdown('```\n' + enhanced + '\n```\n\n');
    
    // Highlight key additions if possible
    const keyAdditions = extractKeyAdditions(original, enhanced);
    if (keyAdditions.length > 0) {
        stream.markdown('### 🔑 Key Additions:\n\n');
        keyAdditions.forEach(addition => {
            stream.markdown(`- ${addition}\n`);
        });
        stream.markdown('\n');
    }
}

/**
 * Calculate improvement statistics
 */
function calculateImprovementStats(original: string, enhanced: string) {
    const originalWords = original.split(/\s+/).length;
    const enhancedWords = enhanced.split(/\s+/).length;
    const wordsAdded = enhancedWords - originalWords;
    const lengthIncrease = Math.round(((enhanced.length - original.length) / original.length) * 100);
    
    return {
        wordsAdded,
        lengthIncrease,
        structureAdded: enhanced.includes('\n-') || enhanced.includes('\n*') || enhanced.includes('#'),
        specificityAdded: 
            (enhanced.match(/TypeScript|types|interface|error handling|validation/gi)?.length || 0) >
            (original.match(/TypeScript|types|interface|error handling|validation/gi)?.length || 0)
    };
}

/**
 * Extract key additions from enhanced prompt
 */
function extractKeyAdditions(original: string, enhanced: string): string[] {
    const additions: string[] = [];
    const originalLower = original.toLowerCase();
    
    // Look for common patterns that were added
    const patterns = [
        { regex: /TypeScript|types?|interface/gi, label: 'TypeScript types specified' },
        { regex: /error handling|try[- ]catch|exception/gi, label: 'Error handling mentioned' },
        { regex: /validation|validate|sanitiz/gi, label: 'Validation requirements' },
        { regex: /test|spec|jest|vitest/gi, label: 'Testing considerations' },
        { regex: /accessibility|ARIA|a11y|screen reader/gi, label: 'Accessibility requirements' },
        { regex: /responsive|mobile|tablet|desktop/gi, label: 'Responsive design' },
        { regex: /comment|JSDoc|documentation/gi, label: 'Documentation requirements' },
        { regex: /performance|optimiz|efficient/gi, label: 'Performance considerations' }
    ];
    
    for (const pattern of patterns) {
        const inOriginal = originalLower.match(pattern.regex);
        const inEnhanced = enhanced.toLowerCase().match(pattern.regex);
        
        if ((!inOriginal || inOriginal.length === 0) && inEnhanced && inEnhanced.length > 0) {
            additions.push(pattern.label);
        }
    }
    
    return additions.slice(0, 5); // Limit to top 5
}

/**
 * Handle template listing request
 */
async function handleListTemplates(stream: vscode.ChatResponseStream): Promise<vscode.ChatResult> {
    stream.markdown('# 📚 Available Prompt Templates\n\n');
    stream.markdown('Use templates with `@clarity template:template-id` or `@clarity t:template-id`\n\n');
    
    // Group by category
    const categories = Object.values(TEMPLATE_CATEGORIES);
    for (const category of categories) {
        const templates = PROMPT_TEMPLATES.filter(t => t.category === category);
        if (templates.length > 0) {
            stream.markdown(`## ${category}\n\n`);
            for (const template of templates) {
                stream.markdown(`- **${template.id}**: ${template.description}\n`);
            }
            stream.markdown('\n');
        }
    }
    
    stream.markdown('\n💡 **Example:** `@clarity template:rest-api` or `@clarity t:react-component`');
    
    return { metadata: { command: 'clarity', result: 'templates_listed' } };
}

/**
 * Handle template request and fill it with user input
 */
async function handleTemplateRequest(
    userPrompt: string,
    stream: vscode.ChatResponseStream
): Promise<vscode.ChatResult> {
    // Extract template ID
    const match = userPrompt.match(/^(?:template:|t:)(\S+)(?:\s+(.*))?$/);
    if (!match) {
        stream.markdown('❌ Invalid template syntax. Use: `@clarity template:template-id` or `@clarity t:template-id`\n\n');
        stream.markdown('Use `@clarity templates` to see all available templates.');
        return { metadata: { command: 'clarity', error: 'invalid_template_syntax' } };
    }
    
    const [, templateId, params] = match;
    const template = getTemplate(templateId);
    
    if (!template) {
        stream.markdown(`❌ Template '${templateId}' not found.\n\n`);
        stream.markdown('Use `@clarity templates` to see all available templates.');
        return { metadata: { command: 'clarity', error: 'template_not_found' } };
    }
    
    stream.markdown(`# ✨ Using Template: ${template.name}\n\n`);
    stream.markdown(`${template.description}\n\n`);
    
    // If template has variables, ask for them or use defaults
    if (template.variables && template.variables.length > 0 && !params) {
        stream.markdown('**This template needs the following variables:**\n\n');
        template.variables.forEach(v => {
            stream.markdown(`- \`{${v}}\`\n`);
        });
        stream.markdown('\n**Usage:** `@clarity template:' + templateId + ' param1=value1 param2=value2`\n\n');
        stream.markdown('Or I can use smart defaults. Send this prompt to enhance it further!\n\n');
        
        // Return template with placeholders
        stream.markdown('```\n' + template.template + '\n```');
        lastEnhancedPrompt = template.template;
        
        return { metadata: { command: 'clarity', result: 'template_shown_with_variables' } };
    }
    
    // Parse parameters if provided
    let variables: Record<string, string> = {};
    if (params) {
        const paramPairs = params.match(/(\w+)=([^\s]+)/g) || [];
        paramPairs.forEach(pair => {
            const [key, value] = pair.split('=');
            variables[key] = value;
        });
    }
    
    // Fill template
    const filledPrompt = fillTemplate(template, variables);
    
    stream.markdown('**Enhanced Prompt:**\n\n');
    stream.markdown('```\n' + filledPrompt + '\n```\n\n');
    
    // Store for followup
    lastEnhancedPrompt = filledPrompt;
    
    // Show action buttons
    stream.button({
        command: 'clarity.forwardToCopilot',
        title: '🤖 Send to Copilot',
        arguments: [filledPrompt]
    });
    
    return { metadata: { command: 'clarity', result: 'template_used' } };
}

/**
 * Handles incoming chat requests to @clarity
 */
async function handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    _token: vscode.CancellationToken
): Promise<vscode.ChatResult> {
    try {
        // Get user's prompt from the request
        let userPrompt = request.prompt.trim();
        
        // Handle edge case: empty prompt
        if (!userPrompt) {
            stream.markdown('❌ **No prompt detected.** Please provide text to improve.');
            return { metadata: { command: 'clarity', error: 'empty_prompt' } };
        }

        // Check if user is requesting a template
        if (userPrompt.startsWith('template:') || userPrompt.startsWith('t:')) {
            return await handleTemplateRequest(userPrompt, stream);
        }

        // Check if user wants to list templates
        if (userPrompt === 'templates' || userPrompt === 'list templates') {
            return await handleListTemplates(stream);
        }

        // Inject project context automatically
        userPrompt = await injectContextIfEnabled(userPrompt);

        // Extract conversation context and todos for better enhancement
        const conversationContext = extractConversationContext(context);
        
        // Get current configuration
        const config = getConfig();
        
        // Validate API key exists
        if (!config.geminiApiKey || config.geminiApiKey.trim() === '') {
            stream.markdown('❌ **No API key configured!** Please set your Gemini API key in settings.\n\n');
            stream.markdown('Go to Settings → Search "clarity" → Add your API key from [Google AI Studio](https://aistudio.google.com/app/apikey)');
            return { metadata: { command: 'clarity', error: 'no_api_key' } };
        }
        
        // Debug configuration
        console.log('🔧 Clarity Configuration:', {
            hasApiKey: !!config.geminiApiKey,
            apiKeyLength: config.geminiApiKey.length,
            apiKeyPrefix: config.geminiApiKey.substring(0, 10) + '...',
            contextMessages: conversationContext.previousMessages.length,
            foundTodos: conversationContext.todos.length,
            foundActions: conversationContext.lastActions.length,
            foundProjectContext: conversationContext.projectContext.length
        });
        
        // Debug: Log detected context for troubleshooting
        if (conversationContext.todos.length > 0) {
            console.log('📋 Detected todos:', conversationContext.todos);
        }
        if (conversationContext.lastActions.length > 0) {
            console.log('🎯 Detected actions:', conversationContext.lastActions);
        }

        // Show processing indicator with context info
        const contextCount = conversationContext.todos.length + conversationContext.lastActions.length + conversationContext.projectContext.length;
        if (contextCount > 0) {
            stream.markdown(`� **ClarityAI is analyzing ${contextCount} context items (todos, actions, project info) and enhancing your prompt...**\n\n`);
        } else {
            stream.markdown('🤖 **ClarityAI is enhancing your prompt...**\n\n');
        }
        
        // Improve the prompt using context-aware enhancement
        let improvedPrompt: string;
        let enhancementFailed = false;
        
        try {
            improvedPrompt = await improvePrompt(userPrompt, conversationContext);
        } catch (error) {
            enhancementFailed = true;
            improvedPrompt = userPrompt;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            stream.markdown(`⚠️ **AI enhancement failed:** ${errorMessage}\n\n`);
            stream.markdown('Using basic typo corrections only.\n\n');
            console.error('Enhancement error:', error);
        }
        
        if (!enhancementFailed) {
            // Show success message
            stream.markdown('✅ **ClarityAI enhancement complete!**\n\n');
        }
        
        // Check if any improvements were made
        if (improvedPrompt === userPrompt) {
            stream.markdown('✅ **Your prompt looks good!** No changes needed.\n\n');
            stream.markdown(`**Original:** ${userPrompt}`);
            return { metadata: { command: 'clarity', result: 'no_changes' } };
        }

        // Show diff view with improvements
        showDiffView(stream, userPrompt, improvedPrompt);

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