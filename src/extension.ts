import * as vscode from 'vscode';
import { getConfig } from './config';
import { improvePrompt, ConversationContext, analyzePromptQuality } from './autocorrect';
import { forwardToCopilot, debugAvailableCommands } from './forward';
import { PROMPT_TEMPLATES, getTemplate, fillTemplate, searchTemplates, TEMPLATE_CATEGORIES } from './templates';
import { injectContextIfEnabled } from './contextInjection';
import { analyzePromptComplexity, getComplexityDescription } from './complexityAnalyzer';
import { scanForSecrets } from './privacyGuard';

/**
 * Clarity VS Code Extension - Entry Point
 * 
 * This extension registers three Chat Participants:
 * - @clarity: Smart routing (chooses fast or thinking based on complexity)
 * - @clarity-fast: Always uses ClarityAI fast mode
 * - @clarity-thinking: Always uses ClarityAI advanced reasoning mode
 */

let clarityParticipant: vscode.ChatParticipant | undefined;
let clarityFastParticipant: vscode.ChatParticipant | undefined;
let clarityThinkingParticipant: vscode.ChatParticipant | undefined;
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
 * Registers the chat participants: @clarity, @clarity-fast, @clarity-thinking
 */
function registerChatParticipant(context: vscode.ExtensionContext) {
    const iconPath = vscode.Uri.joinPath(context.extensionUri, 'img', 'ClarityAI-logo.png');
    
    // Create and register the main @clarity participant (smart routing)
    clarityParticipant = vscode.chat.createChatParticipant('clarity', (request, chatContext, stream, token) => 
        handleChatRequest(request, chatContext, stream, token, 'smart')
    );
    clarityParticipant.iconPath = iconPath;
    clarityParticipant.followupProvider = {
        provideFollowups(_result: vscode.ChatResult, _context: vscode.ChatContext, _token: vscode.CancellationToken) {
            return getFollowupSuggestions();
        }
    };
    context.subscriptions.push(clarityParticipant);

    // Create and register the @clarity-fast participant (always fast)
    clarityFastParticipant = vscode.chat.createChatParticipant('clarity.fast', (request, chatContext, stream, token) => 
        handleChatRequest(request, chatContext, stream, token, 'fast')
    );
    clarityFastParticipant.iconPath = iconPath;
    clarityFastParticipant.followupProvider = {
        provideFollowups(_result: vscode.ChatResult, _context: vscode.ChatContext, _token: vscode.CancellationToken) {
            return getFollowupSuggestions();
        }
    };
    context.subscriptions.push(clarityFastParticipant);

    // Create and register the @clarity-thinking participant (always thinking)
    clarityThinkingParticipant = vscode.chat.createChatParticipant('clarity.thinking', (request, chatContext, stream, token) => 
        handleChatRequest(request, chatContext, stream, token, 'thinking')
    );
    clarityThinkingParticipant.iconPath = iconPath;
    clarityThinkingParticipant.followupProvider = {
        provideFollowups(_result: vscode.ChatResult, _context: vscode.ChatContext, _token: vscode.CancellationToken) {
            return getFollowupSuggestions();
        }
    };
    context.subscriptions.push(clarityThinkingParticipant);
}

/**
 * Gets followup suggestions based on last enhanced prompt
 */
function getFollowupSuggestions(): vscode.ChatFollowup[] {
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
            label: '📋 Make Step-by-Step',
            command: 'clarity'
        }
    ];
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
    // Check if diff view is enabled
    const config = vscode.workspace.getConfiguration('clarity');
    const showDiff = config.get<boolean>('showDiffView', true);
    
    if (!showDiff) {
        // Simple view without detailed comparison
        stream.markdown('✨ **Enhanced Prompt:**\n\n');
        stream.markdown('```\n' + enhanced + '\n```\n\n');
        return;
    }
    
    // Full diff view with educational insights
    stream.markdown('## 📊 What ClarityAI Improved\n\n');
    
    // Calculate improvement metrics
    const stats = calculateImprovementStats(original, enhanced);
    
    // Show quality score
    const qualityScore = calculateQualityScore(stats);
    stream.markdown(`### 🎯 Prompt Quality Score: **${qualityScore}/10**\n\n`);
    
    if (qualityScore >= 8) {
        stream.markdown('🌟 **Excellent!** This prompt is highly detailed and specific.\n\n');
    } else if (qualityScore >= 6) {
        stream.markdown('✅ **Good!** Solid improvements for better AI responses.\n\n');
    } else {
        stream.markdown('📝 **Enhanced!** Added important details and structure.\n\n');
    }
    
    // Show metrics with educational explanations
    stream.markdown('### 📈 Improvements Made:\n\n');
    
    if (stats.wordsAdded > 0) {
        stream.markdown(`- ✅ **+${stats.wordsAdded} words** - More context helps AI understand exactly what you need\n`);
    }
    if (stats.structureAdded) {
        stream.markdown(`- 📋 **Structure added** - Organized requirements make responses more accurate\n`);
    }
    if (stats.specificityAdded) {
        stream.markdown(`- 🎯 **Specificity improved** - Detailed requirements reduce back-and-forth\n`);
    }
    if (stats.lengthIncrease > 50) {
        stream.markdown(`- 📝 **${stats.lengthIncrease}% more detailed** - Comprehensive prompts = better code\n`);
    }
    if (enhanced.includes('```mermaid')) {
        stream.markdown(`- 🗺️ **Visual Roadmap added** - Mermaid.js diagram included for architectural clarity\n`);
    }
    if (original.toLowerCase().includes('USER-DEFINED PROJECT RULES')) {
        stream.markdown(`- 📜 **Custom Rules applied** - Injected constraints from your .clarityrules file\n`);
    }
    
    // Highlight key additions with explanations
    const keyAdditions = extractKeyAdditions(original, enhanced);
    if (keyAdditions.length > 0) {
        stream.markdown('\n### 🔑 Key Additions (Why They Matter):\n\n');
        const explanations: Record<string, string> = {
            'TypeScript types specified': 'Type safety prevents bugs and improves code quality',
            'Error handling mentioned': 'Robust error handling makes production-ready code',
            'Validation requirements': 'Input validation prevents security vulnerabilities',
            'Testing considerations': 'Tests ensure code reliability and catch regressions',
            'Accessibility requirements': 'A11y makes your app usable for everyone',
            'Responsive design': 'Mobile-first approach reaches all users',
            'Documentation requirements': 'Good docs help future maintainers',
            'Performance considerations': 'Optimized code provides better UX'
        };
        
        keyAdditions.forEach(addition => {
            const explanation = explanations[addition] || 'Improves code quality';
            stream.markdown(`- **${addition}**\n  - *${explanation}*\n`);
        });
        stream.markdown('\n');
    }
    
    stream.markdown('---\n\n');
    
    // Show side-by-side comparison
    stream.markdown('### 📝 Before → After Comparison\n\n');
    
    // Show original (truncated if too long)
    stream.markdown('**Your Original Prompt:**\n\n');
    const originalDisplay = original.length > 200 ? original.substring(0, 200) + '...' : original;
    stream.markdown(`> ${originalDisplay}\n\n`);
    
    // Show enhanced with formatting
    stream.markdown('**ClarityAI Enhanced Version:**\n\n');
    
    // Feature: Visual Preview for Mermaid.js
    if (enhanced.includes('```mermaid')) {
        const mermaidMatch = enhanced.match(/```mermaid([\s\S]*?)```/);
        if (mermaidMatch) {
            stream.markdown('### 🖼️ Visual Architecture Preview\n');
            stream.markdown(mermaidMatch[0] + '\n\n'); // This renders the diagram
            
            // Add a "View in Mermaid Live" action button
            const encodedMermaid = Buffer.from(mermaidMatch[1].trim()).toString('base64');
            const mermaidLiveUrl = `https://mermaid.live/edit#base64:${encodedMermaid}`;
            
            stream.markdown(`> 💡 **Tip:** If the diagram above doesn't render, use the button below to view it in the live editor.\n\n`);
            
            stream.button({
                command: 'clarity.openUrl',
                title: '🌐 Open in Mermaid Live',
                arguments: [mermaidLiveUrl]
            });
            
            stream.markdown('\n\n--- \n\n');
        }
    }

    const formattedEnhanced = formatEnhancedPrompt(enhanced);
    stream.markdown(formattedEnhanced + '\n\n');
    
    // Educational tip
    stream.markdown('💡 **Pro Tip:** ' + getRandomTip() + '\n\n');
}

/**
 * Format enhanced prompt for better readability with line breaks and structure
 * Ensures code blocks (like Mermaid) are left untouched
 */
function formatEnhancedPrompt(prompt: string): string {
    // If the prompt contains code blocks, we need to be careful
    if (prompt.includes('```')) {
        // Split by code blocks
        const parts = prompt.split(/(```[\s\S]*?```)/g);
        return parts.map(part => {
            if (part.startsWith('```')) {
                return part; // Don't format code blocks
            }
            return formatTextOnly(part);
        }).join('');
    }
    
    return formatTextOnly(prompt);
}

/**
 * Internal helper to format regular text sections
 */
function formatTextOnly(text: string): string {
    return text
        // Add line break after periods followed by capital letters (new sentences)
        .replace(/\.\s+([A-Z])/g, '.\n\n$1')
        // Add line break after colons (usually introduces lists or details)
        .replace(/:\s+/g, ':\n')
        // Add line break before numbered lists
        .replace(/\s+(\d+\))/g, '\n$1')
        // Add line break before bullet points
        .replace(/\s+-\s+/g, '\n- ')
        // Clean up multiple consecutive newlines
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

/**
 * Calculate quality score from stats
 */
function calculateQualityScore(stats: any): number {
    let score = 5; // Base score
    
    if (stats.wordsAdded > 20) score += 2;
    else if (stats.wordsAdded > 10) score += 1;
    
    if (stats.structureAdded) score += 1;
    if (stats.specificityAdded) score += 1;
    
    if (stats.lengthIncrease > 100) score += 1;
    
    return Math.min(10, score);
}

/**
 * Get random educational tip
 */
function getRandomTip(): string {
    const tips = [
        'Specific prompts with requirements lists get better results than vague requests',
        'Including tech stack details (React, TypeScript) helps AI generate compatible code',
        'Mentioning error handling and edge cases leads to production-ready code',
        'Adding "with tests" or "with comments" improves code quality significantly',
        'Structured prompts with sections (REQUIREMENTS, FEATURES) organize AI responses better',
        'Specifying file structure helps AI generate organized, maintainable code',
        'Including accessibility requirements ensures your app works for everyone',
        'Mentioning performance needs upfront prevents costly refactoring later'
    ];
    
    return tips[Math.floor(Math.random() * tips.length)];
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
 * Detects if the user prompt contains Clarity/Stacks smart contract code
 */
function detectClaritySmartContract(prompt: string): boolean {
    const clarityKeywords = [
        'define-public', 'define-read-only', 'define-private', 'define-map',
        'define-data-var', 'ft-mint!', 'ft-transfer!', 'nft-mint!',
        'nft-transfer!', 'contract-call?', 'as-contract', 'contract-caller'
    ];
    
    const promptLower = prompt.toLowerCase();
    return clarityKeywords.some(keyword => promptLower.includes(keyword));
}

/**
 * Handles incoming chat requests to @clarity
 */
async function handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    _token: vscode.CancellationToken,
    mode: 'smart' | 'fast' | 'thinking' = 'smart'
): Promise<vscode.ChatResult> {
    try {
        // Get user's prompt from the request
        let userPrompt = request.prompt.trim();

        // v1.2.0: Quality Analysis & Stale Check
        const quality = analyzePromptQuality(userPrompt);
        if (quality.score < 60) {
            stream.markdown(`⚠️ **Low Quality Prompt Detected (Score: ${quality.score}/100)**\n`);
            quality.issues.forEach(issue => stream.markdown(`- ${issue}\n`));
            stream.markdown(`\n*I will still try to enhance this, but adding more detail will give better results.*\n\n---\n\n`);
        }

        // v1.2.x: Secret Shield (Privacy Guardrail)
        const privacyCheck = scanForSecrets(userPrompt);
        if (privacyCheck.found) {
            stream.markdown(`🛡️ **Secret Shield Alert!**\n\n`);
            stream.markdown(`I detected potential sensitive data in your prompt:\n`);
            privacyCheck.details.forEach(detail => stream.markdown(`- ⚠️ **${detail}** detected\n`));
            stream.markdown(`\n**Action Taken:** To protect your privacy, I have **masked** these values before sending them to the AI engine.\n\n---\n\n`);
            
            // Use the masked prompt for all subsequent operations
            userPrompt = privacyCheck.maskedPrompt;
        }
        
        // Handle edge case: empty prompt
        if (!userPrompt) {
            stream.markdown('❌ **No prompt detected.** Please provide text to improve.');
            return { metadata: { command: 'clarity', error: 'empty_prompt' } };
        }

        // Check if user is requesting a template
        if (userPrompt.startsWith('template:') || userPrompt.startsWith('t:')) {
            return await handleTemplateRequest(userPrompt, stream);
        }

        // Check for Language Collision (Clarity smart contracts)
        if (detectClaritySmartContract(userPrompt)) {
            stream.markdown('⚠️ **Note:** It looks like you might be writing a [Clarity smart contract](https://docs.stacks.co/docs/write-smart-contracts/overview) (Bitcoin/Stacks). \n\n');
            stream.markdown('ClarityAI is a **prompt enhancement tool** for VS Code Copilot. We\'ll still try to improve your prompt, but we aren\'t a blockchain-specific tool! 🚀\n\n ---\n\n');
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
        if (!config.apiKey || config.apiKey.trim() === '') {
            stream.markdown('❌ **No API key configured!** Please set your API key in settings.\n\n');
            stream.markdown('Go to Settings → Search "clarity" → Configure your API settings');
            return { metadata: { command: 'clarity', error: 'no_api_key' } };
        }
        
        // Determine which model to use based on mode
        let modelToUse: string;
        let modeDescription: string;
        
        if (mode === 'fast') {
            modelToUse = config.fastModel;
            modeDescription = '⚡ **ClarityAI Fast Mode** - Optimized for quick response';
        } else if (mode === 'thinking') {
            modelToUse = config.thinkingModel;
            modeDescription = '🧠 **ClarityAI Reasoning Mode** - Optimized for complex analysis';
        } else {
            // Smart mode: analyze complexity and choose
            const complexity = analyzePromptComplexity(userPrompt);
            const complexityDesc = getComplexityDescription(complexity);
            
            if (complexity.level === 'complex') {
                modelToUse = config.thinkingModel;
                modeDescription = `🤖 **ClarityAI Smart Mode** - ${complexityDesc}`;
                if (complexity.reasons.length > 0) {
                    modeDescription += `\n*Reasons: ${complexity.reasons.join(', ')}*`;
                }
            } else {
                modelToUse = config.fastModel;
                modeDescription = `🤖 **ClarityAI Smart Mode** - ${complexityDesc}`;
            }
        }
        
        stream.markdown(`${modeDescription}\n\n`);
        
        // Debug configuration
        console.log('🔧 Clarity Configuration:', {
            mode,
            modelToUse,
            hasApiKey: !!config.apiKey,
            apiKeyLength: config.apiKey.length,
            apiKeyPrefix: config.apiKey.substring(0, 10) + '...',
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
            stream.markdown(`🔍 **Analyzing ${contextCount} context items and enhancing your prompt...**\n\n`);
        } else {
            stream.markdown('🔍 **Enhancing your prompt...**\n\n');
        }
        
        // Improve the prompt using context-aware enhancement with selected model
        let improvedPrompt: string;
        let enhancementFailed = false;
        
        try {
            improvedPrompt = await improvePrompt(userPrompt, conversationContext, modelToUse);
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
        stream.markdown('---\n\n');
        stream.markdown('## 🎯 Quick Actions\n\n');
        
        // Primary actions
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
        
        stream.markdown('\n\n**Refine Further:**\n\n');
        
        // Refinement actions - these create new enhanced prompts
        stream.button({
            title: '🔍 Add More Details',
            command: 'clarity.refinePrompt',
            arguments: [improvedPrompt, 'detail']
        });
        stream.button({
            title: '✂️ Simplify',
            command: 'clarity.refinePrompt',
            arguments: [improvedPrompt, 'simplify']
        });
        stream.button({
            title: '📋 Step-by-Step',
            command: 'clarity.refinePrompt',
            arguments: [improvedPrompt, 'steps']
        });
        stream.button({
            title: '🎓 Beginner-Friendly',
            command: 'clarity.refinePrompt',
            arguments: [improvedPrompt, 'beginner']
        });
        stream.button({
            title: '⚡ Production-Ready',
            command: 'clarity.refinePrompt',
            arguments: [improvedPrompt, 'production']
        });
        stream.button({
            title: '🧪 Add Tests',
            command: 'clarity.refinePrompt',
            arguments: [improvedPrompt, 'tests']
        });

        stream.button({
            title: '🏗️ Generate Test Cases',
            command: 'clarity.generateTests',
            arguments: [improvedPrompt]
        });
        
        stream.button({
            title: '💬 Tweak Enhancement',
            command: 'clarity.tweakEnhancement',
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

    // Command: Refine prompt with specific action
    const refinePromptCommand = vscode.commands.registerCommand('clarity.refinePrompt', async (prompt: string, action: string) => {
        try {
            const refinementPrompts: Record<string, string> = {
                'detail': `Make this prompt more detailed and specific:\n\n${prompt}`,
                'simplify': `Simplify this prompt and make it more concise while keeping key requirements:\n\n${prompt}`,
                'steps': `Break this into clear step-by-step instructions:\n\n${prompt}`,
                'beginner': `Rewrite this prompt in beginner-friendly terms with explanations:\n\n${prompt}`,
                'production': `Add production-ready requirements (error handling, testing, logging, security):\n\n${prompt}`,
                'tests': `Add comprehensive testing requirements to this prompt:\n\n${prompt}`
            };

            const refinedRequest = refinementPrompts[action] || prompt;
            
            // Open chat and send the refinement request to @clarity
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: `@clarity ${refinedRequest}`
            });
            
        } catch (error) {
            // Fallback: copy to clipboard
            const refinementPrompts: Record<string, string> = {
                'detail': `Make this prompt more detailed and specific:\n\n${prompt}`,
                'simplify': `Simplify this prompt:\n\n${prompt}`,
                'steps': `Break this into steps:\n\n${prompt}`,
                'beginner': `Make this beginner-friendly:\n\n${prompt}`,
                'production': `Add production requirements:\n\n${prompt}`,
                'tests': `Add testing requirements:\n\n${prompt}`
            };
            
            await vscode.env.clipboard.writeText(refinementPrompts[action] || prompt);
            vscode.window.showInformationMessage('📋 Refinement prompt copied! Paste in @clarity chat.');
            console.error('Failed to auto-refine:', error);
        }
    });

    // Command: Tweak enhancement (Interactive Refinement)
    const tweakEnhancementCommand = vscode.commands.registerCommand('clarity.tweakEnhancement', async (currentEnhancedPrompt: string) => {
        try {
            const tweakRequest = await vscode.window.showInputBox({
                prompt: 'How would you like to tweak this enhancement?',
                placeHolder: 'e.g., "Make it more focused on security" or "Make it more concise"'
            });

            if (tweakRequest) {
                const combinedRequest = `Tweak this enhanced prompt according to these instructions: "${tweakRequest}"\n\nCURRENT ENHANCED PROMPT:\n${currentEnhancedPrompt}`;
                
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                await vscode.commands.executeCommand('workbench.action.chat.open', {
                    query: `@clarity ${combinedRequest}`
                });
            }
        } catch (error) {
            vscode.window.showErrorMessage('❌ Failed to trigger tweak.');
            console.error('Failed to tweak:', error);
        }
    });

    // Command: Generate Test Cases
    const generateTestsCommand = vscode.commands.registerCommand('clarity.generateTests', async (currentEnhancedPrompt: string) => {
        try {
            const testRequest = `Based on this implementation plan, generate a comprehensive set of test cases (unit, integration, and edge cases). Include expected inputs and outputs.\n\nPLAN:\n${currentEnhancedPrompt}`;
            
            await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
            await vscode.commands.executeCommand('workbench.action.chat.open', {
                query: `@clarity ${testRequest}`
            });
        } catch (error) {
            vscode.window.showErrorMessage('❌ Failed to generate tests.');
            console.error('Failed to generate tests:', error);
        }
    });

    // Command: Open URL in external browser
    const openUrlCommand = vscode.commands.registerCommand('clarity.openUrl', async (url: string) => {
        try {
            await vscode.env.openExternal(vscode.Uri.parse(url));
        } catch (error) {
            vscode.window.showErrorMessage('❌ Failed to open URL.');
            console.error('Failed to open URL:', error);
        }
    });

    // Add commands to subscriptions for proper cleanup
    context.subscriptions.push(
        forwardToCopilotCommand,
        copyPromptCommand,
        refinePromptCommand,
        tweakEnhancementCommand,
        generateTestsCommand,
        openUrlCommand
    );
}

/**
 * Extension deactivation function
 * Called when VS Code deactivates the extension
 */
export function deactivate() {
    console.log('Clarity extension deactivated');
    
    // Clean up all chat participants
    if (clarityParticipant) {
        clarityParticipant.dispose();
    }
    if (clarityFastParticipant) {
        clarityFastParticipant.dispose();
    }
    if (clarityThinkingParticipant) {
        clarityThinkingParticipant.dispose();
    }
}