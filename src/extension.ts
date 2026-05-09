import * as vscode from 'vscode';
import { getConfig } from './config';
import { improvePrompt, ConversationContext, analyzePromptQuality, scanForVulnerabilities } from './autocorrect';
import { forwardToCopilot, debugAvailableCommands } from './forward';
import { PROMPT_TEMPLATES, getTemplate, fillTemplate, searchTemplates, TEMPLATE_CATEGORIES } from './templates';
import { injectContextIfEnabled } from './contextInjection';
import { analyzePromptComplexity, getComplexityDescription } from './complexityAnalyzer';
import { scanForSecrets } from './privacyGuard';
import { TeamVaultManager } from './teamVault';
import { PromptSuggestionsManager } from './promptSuggestions';
import { CloudSyncManager } from './cloudSync';
import { DashboardProvider } from './dashboard/dashboardProvider';
import { DashboardDataManager } from './dashboard/dashboardData';
import { AdvancedWorkflowManager } from './advancedWorkflows';
import { ClarityLogger } from './logger';
import { ErrorTracker } from './errorTracking';
import { AnalyticsManager } from './analytics';
import { OnboardingManager } from './onboarding';
import { OnboardingProvider } from './onboarding/onboardingProvider';

/**
 * Clarity VS Code Extension - Entry Point
 * 
 * This extension registers three Chat Participants:
 * - @clarity: Smart routing (chooses fast or thinking based on complexity)
 * - @clarity-fast: Always uses ClarityAI fast mode
 * - @clarity-thinking: Always uses ClarityAI advanced reasoning mode
 * - @clarity /skills: Generates a reusable skills.md workflow starter
 */

let clarityParticipant: vscode.ChatParticipant | undefined;
let clarityFastParticipant: vscode.ChatParticipant | undefined;
let clarityThinkingParticipant: vscode.ChatParticipant | undefined;
let lastEnhancedPrompt: string = '';
let extensionContext: vscode.ExtensionContext;
let teamVaultManager: TeamVaultManager;
let suggestionsManager: PromptSuggestionsManager;
let cloudSyncManager: CloudSyncManager;
let dashboardProvider: DashboardProvider;
let dashboardDataManager: DashboardDataManager;
let workflowManager: AdvancedWorkflowManager;
let clarityLogger: ClarityLogger;
let errorTracker: ErrorTracker;
let analyticsManager: AnalyticsManager;
let onboardingManager: OnboardingManager;
let onboardingProvider: OnboardingProvider;

/**
 * Extension activation function
 * Called when VS Code activates the extension
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Clarity extension is now active!');
    extensionContext = context;

    // Initialize Phase 1-3 infrastructure
    clarityLogger = new ClarityLogger();
    const outputChannel = vscode.window.createOutputChannel('ClarityAI');
    clarityLogger.initialize(outputChannel);
    errorTracker = new ErrorTracker();
    errorTracker.initialize('posthog-key-placeholder', false);
    analyticsManager = new AnalyticsManager('posthog-key-placeholder');

    // Initialize Phase 2 managers
    teamVaultManager = new TeamVaultManager(context, clarityLogger);
    suggestionsManager = new PromptSuggestionsManager(clarityLogger);

    // Initialize Phase 3 managers
    cloudSyncManager = new CloudSyncManager(context);
    dashboardDataManager = new DashboardDataManager(context, teamVaultManager, analyticsManager);
    dashboardProvider = new DashboardProvider(context, teamVaultManager, analyticsManager);
    workflowManager = new AdvancedWorkflowManager(context);
    onboardingManager = new OnboardingManager(context, clarityLogger);
    onboardingProvider = new OnboardingProvider(context);

    // Register dashboard webview
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'clarity-dashboard',
            dashboardProvider
        )
    );

    // Register onboarding webview
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'clarity-onboarding',
            onboardingProvider
        )
    );

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

    // We use action buttons in the response for follow-up refinement
    return [];
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
    
    // Highlight key additions with explanations (v1.3.1: Configurable)
    const keyAdditions = extractKeyAdditions(original, enhanced);
    if (keyAdditions.length > 0 && config.get<boolean>('showEducationalInsights', true)) {
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
    
    let enhancedTextToDisplay = enhanced;

    // Feature: Visual Preview for Mermaid.js (v1.3.1: Configurable)
    if (enhanced.includes('```mermaid') && config.enableMermaid) {
        const mermaidMatch = enhanced.match(/```mermaid([\s\S]*?)(?:```|$)/);
        if (mermaidMatch) {
            const mermaidCode = mermaidMatch[1].trim();
            // Strip the mermaid block from the text so it's not duplicated below
            enhancedTextToDisplay = enhanced.replace(mermaidMatch[0], '').trim();

            stream.markdown('### 🖼️ Visual Architecture Preview\n\n');
            // Ensure the block is strictly isolated and correctly closed
            stream.markdown('```mermaid\n' + mermaidCode + '\n```\n\n');
            
            // Add a "View in Mermaid Live" action button and link
            const encodedMermaid = Buffer.from(mermaidCode).toString('base64');
            const mermaidLiveUrl = `https://mermaid.live/edit#base64:${encodedMermaid}`;
            
            stream.markdown(`🔗 **[Open in Mermaid Live Editor](${mermaidLiveUrl})**\n\n`);
            stream.markdown(`> 💡 **Tip:** If the diagram above doesn't render, use the button below or the link above.\n\n`);
            
            stream.button({
                command: 'clarity.openUrl',
                title: '🌐 Open in Mermaid Live',
                arguments: [mermaidLiveUrl]
            });
            
            stream.markdown('\n\n---\n\n');
        }
    }

    const formattedEnhanced = formatEnhancedPrompt(enhancedTextToDisplay);
    stream.markdown(formattedEnhanced + '\n\n');
}

/**
 * Format enhanced prompt for better readability with line breaks and structure
 * Ensures code blocks (like Mermaid) are left untouched
 */
function formatEnhancedPrompt(prompt: string): string {
    // If the prompt contains code blocks, we need to be careful
    if (prompt.includes('```')) {
        // v1.3.x: Better splitting that handles unclosed blocks
        const parts = prompt.split(/(```[\s\S]*?(?:```|$))/g);
        return parts.map(part => {
            if (part.startsWith('```')) {
                // Ensure it's closed if the LLM forgot
                if (!part.endsWith('```') && !part.includes('\n```')) {
                    return part + '\n```';
                }
                return part;
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

        // v1.3.x: Vulnerability Scanner (Logic Checks)
        const vulnerabilities = scanForVulnerabilities(userPrompt);
        if (vulnerabilities.length > 0) {
            stream.markdown(`🚨 **Logic Security Warning!**\n\n`);
            stream.markdown(`Your prompt contains instructions that could lead to insecure code:\n`);
            vulnerabilities.forEach(v => stream.markdown(`- ❌ ${v}\n`));
            stream.markdown(`\n*I will still enhance this, but please review the final output carefully for security best practices.*\n\n---\n\n`);
        }
        
        // Handle help sub-command
        if (request.command === 'help') {
            return await handleHelpRequest(stream);
        }

        // Handle onboarding sub-command
        if (request.command === 'onboarding') {
            return await handleOnboardingRequest(stream);
        }

        // Handle Vault sub-command
        if (request.command === 'vault') {
            return await handleVaultRequest(stream);
        }

        // Handle skills sub-command
        if (request.command === 'skills') {
            return await handleTemplateRequest('template:skills-md', stream);
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
        
        // Validate configuration (Built-in key check)
        if (!config.apiKey || config.apiKey.trim() === '') {
            stream.markdown('❌ **Engine initialization failed.** Please reinstall the extension or contact support.');
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
        
        // Show persona info if subcommand used
        if (request.command && ['architect', 'security', 'reviewer', 'tester', 'documentation', 'performance', 'frontend'].includes(request.command)) {
            const personaLabel = request.command.charAt(0).toUpperCase() + request.command.slice(1);
            stream.markdown(`🎭 **Persona Active:** Enhanced as a **${personaLabel}**\n\n`);
        }

        // Debug configuration (Internal only)
        console.log('🔧 Clarity Engine Status:', {
            mode,
            contextMessages: conversationContext.previousMessages.length,
            foundTodos: conversationContext.todos.length,
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
        
        // v1.3.x: Pass command as persona (or default if no command)
        let effectivePersona = request.command;
        if (!effectivePersona && config.defaultPersona !== 'none') {
            effectivePersona = config.defaultPersona;
            const personaLabel = config.defaultPersona.charAt(0).toUpperCase() + config.defaultPersona.slice(1);
            stream.markdown(`🎭 **Default Persona Applied:** **${personaLabel}**\n\n`);
        }

        try {
            improvedPrompt = await improvePrompt(userPrompt, conversationContext, modelToUse, effectivePersona, config.enableMermaid);
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

        // Explicitly break out of any previous markdown context
        stream.markdown('\n\n<br/>\n\n');

        // Educational tip
        stream.markdown('💡 **Pro Tip:** ' + getRandomTip() + '\n\n');

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
            title: '🏺 Save to Vault',
            command: 'clarity.saveToVault',
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

    // v1.3.x: Command: Save to Prompt Vault
    const saveToVaultCommand = vscode.commands.registerCommand('clarity.saveToVault', async (prompt: string) => {
        try {
            const name = await vscode.window.showInputBox({
                prompt: 'Enter a name for this prompt in your vault',
                placeHolder: 'e.g., "Full-stack Auth Component"'
            });

            if (!name) return;

            const storageOption = await vscode.window.showQuickPick(
                [
                    { label: '🏠 Local Vault', description: 'Saved only on this machine', value: 'local' },
                    { label: '👥 Team Vault', description: 'Saved to .clarity/vault.json in this project', value: 'team' }
                ],
                { placeHolder: 'Where would you like to save this prompt?' }
            );

            if (!storageOption) return;

            if (storageOption.value === 'local') {
                const vault = context.globalState.get<any[]>('clarity.vault', []);
                vault.push({
                    name,
                    prompt,
                    timestamp: new Date().toISOString(),
                    type: 'local'
                });
                await context.globalState.update('clarity.vault', vault);
                vscode.window.showInformationMessage(`🏺 Prompt "${name}" saved to Local Vault!`);
            } else {
                // Save to Team Vault (.clarity/vault.json)
                const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
                if (!workspaceFolder) {
                    vscode.window.showErrorMessage('❌ No workspace open. Team Vault requires an open project.');
                    return;
                }

                const clarityDir = vscode.Uri.joinPath(workspaceFolder.uri, '.clarity');
                const vaultUri = vscode.Uri.joinPath(clarityDir, 'vault.json');

                let teamVault: any[] = [];
                try {
                    const data = await vscode.workspace.fs.readFile(vaultUri);
                    teamVault = JSON.parse(data.toString());
                } catch {
                    // File doesn't exist, start new
                    await vscode.workspace.fs.createDirectory(clarityDir);
                }

                teamVault.push({
                    name,
                    prompt,
                    timestamp: new Date().toISOString(),
                    author: vscode.env.machineId.substring(0, 8), // Basic ID for team attribution
                    type: 'team'
                });

                await vscode.workspace.fs.writeFile(vaultUri, Buffer.from(JSON.stringify(teamVault, null, 2)));
                vscode.window.showInformationMessage(`👥 Prompt "${name}" added to Team Vault (.clarity/vault.json)!`);
            }
        } catch (error) {
            vscode.window.showErrorMessage('❌ Failed to save to vault.');
            console.error('Vault error:', error);
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

    // Command: Open Vault in Chat
    const openVaultCommand = vscode.commands.registerCommand('clarity.openVault', async () => {
        await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
        await vscode.commands.executeCommand('workbench.action.chat.open', {
            query: '@clarity /vault'
        });
    });

    // Command: Show Help in Chat
    const showHelpCommand = vscode.commands.registerCommand('clarity.showHelp', async () => {
        await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
        await vscode.commands.executeCommand('workbench.action.chat.open', {
            query: '@clarity /help'
        });
    });

    // Command: Show Skills.md Builder in Chat
    const showSkillsCommand = vscode.commands.registerCommand('clarity.showSkills', async () => {
        await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
        await vscode.commands.executeCommand('workbench.action.chat.open', {
            query: '@clarity /skills'
        });
    });

    // Command: Submit prompt to vault for team approval
    const submitToVaultCommand = vscode.commands.registerCommand('clarity.vault.submit', async (title: string, enhancedPrompt: string) => {
        try {
            const result = await teamVaultManager.saveToDraft(title, '', enhancedPrompt, ['user-submitted']);
            if (result) {
                await teamVaultManager.submitForApproval(result.id, 'User-submitted prompt for team review');
                vscode.window.showInformationMessage('📬 Prompt submitted to team vault for approval!');
            }
        } catch (error) {
            vscode.window.showErrorMessage('❌ Failed to submit prompt to vault.');
            console.error('Vault submission failed:', error);
        }
    });

    // Command: Show prompt suggestions
    const suggestionsCommand = vscode.commands.registerCommand('clarity.suggestions.show', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor. Open a file to get suggestions.');
            return;
        }

        try {
            const suggestions = await suggestionsManager.getSuggestions(editor, 5);
            if (suggestions.length === 0) {
                vscode.window.showInformationMessage('No suggestions available for this file.');
                return;
            }

            const selected = await vscode.window.showQuickPick(
                suggestions.map((s) => ({
                    label: `$(sparkle) ${s.title}`,
                    description: s.description,
                    detail: s.prompt.substring(0, 60) + '...',
                    suggestion: s
                })),
                { placeHolder: 'Choose a suggestion to use in @clarity' }
            );

            if (selected) {
                await vscode.env.clipboard.writeText(selected.suggestion.prompt);
                await vscode.commands.executeCommand('workbench.panel.chat.view.copilot.focus');
                vscode.window.showInformationMessage('💡 Suggestion copied to clipboard. Paste in @clarity chat!');
            }
        } catch (error) {
            vscode.window.showErrorMessage('❌ Failed to generate suggestions.');
            console.error('Suggestions error:', error);
        }
    });

    // Command: Setup Cloud Sync (Phase 3)
    const setupCloudSyncCommand = vscode.commands.registerCommand('clarity.setupCloudSync', async () => {
        try {
            const selected = await vscode.window.showQuickPick(
                ['Azure Blob Storage', 'AWS S3', 'Firebase', 'None (Disable)'],
                { placeHolder: 'Select cloud provider for vault sync' }
            );

            if (!selected) return;

            const providerMap: { [key: string]: 'azure' | 'aws' | 'firebase' | 'none' } = {
                'Azure Blob Storage': 'azure',
                'AWS S3': 'aws',
                'Firebase': 'firebase',
                'None (Disable)': 'none'
            };

            const provider = providerMap[selected];
            await cloudSyncManager.initializeSync(provider);

            if (provider !== 'none') {
                vscode.window.showInformationMessage(`✅ Cloud sync configured for ${selected}`);
            } else {
                vscode.window.showInformationMessage('Cloud sync disabled');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to setup cloud sync: ${error}`);
        }
    });

    // Command: Open Dashboard (Phase 3)
    const openDashboardCommand = vscode.commands.registerCommand('clarity.openDashboard', async () => {
        try {
            await vscode.commands.executeCommand('clarity-dashboard.focus');
            vscode.window.showInformationMessage('📊 Dashboard opened');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to open dashboard');
        }
    });

    // Command: Show Cloud Sync Status (Phase 3)
    const showSyncStatusCommand = vscode.commands.registerCommand('clarity.showSyncStatus', async () => {
        try {
            const status = cloudSyncManager.getStatus();
            const message = `Cloud Sync Status:\nEnabled: ${status.enabled}\nProvider: ${status.provider}\nOnline: ${status.isOnline}\nSyncing: ${status.isSyncing}`;
            await vscode.window.showInformationMessage(message);
        } catch (error) {
            vscode.window.showErrorMessage('Failed to get sync status');
        }
    });

    // Command: Submit to Workflow (Phase 3)
    const submitToWorkflowCommand = vscode.commands.registerCommand('clarity.submitToWorkflow', async (promptId: string, reviewerIds: string[]) => {
        try {
            const success = await workflowManager.createApprovalRequest(promptId, reviewerIds, 24); // 24-hour SLA
            if (success) {
                vscode.window.showInformationMessage('✅ Prompt submitted to approval workflow');
            }
        } catch (error) {
            vscode.window.showErrorMessage('Failed to submit to workflow');
        }
    });

    // Add commands to subscriptions for proper cleanup
    context.subscriptions.push(
        forwardToCopilotCommand,
        copyPromptCommand,
        refinePromptCommand,
        tweakEnhancementCommand,
        generateTestsCommand,
        saveToVaultCommand,
        openUrlCommand,
        openVaultCommand,
        showHelpCommand,
        showSkillsCommand,
        submitToVaultCommand,
        suggestionsCommand,
        setupCloudSyncCommand,
        openDashboardCommand,
        showSyncStatusCommand,
        submitToWorkflowCommand
    );
}

/**
 * Handles the /help subcommand to show a dashboard of features
 */
async function handleHelpRequest(stream: vscode.ChatResponseStream): Promise<vscode.ChatResult> {
    stream.markdown('# 🚀 Welcome to ClarityAI v1.5.0\n\n');
    stream.markdown('I’m your intelligent prompt orchestration layer. I transform basic thoughts into production-ready instructions.\n\n');
    
    stream.markdown('### 🎭 Expert Personas\n');
    stream.markdown('- **`/architect`**: Focuses on scalability, design patterns, and system structure.\n');
    stream.markdown('- **`/security`**: Focuses on vulnerability prevention and secure coding.\n');
    stream.markdown('- **`/reviewer`**: Critically analyzes logic and suggests improvements.\n');
    stream.markdown('- **`/tester`**: Focuses on test coverage, edge cases, and quality.\n');
    stream.markdown('- **`/documentation`**: Focuses on JSDoc, READMEs, and clarity.\n');
    stream.markdown('- **`/performance`**: Focuses on optimization and memory management.\n');
    stream.markdown('- **`/frontend`**: Focuses on UI/UX, A11y, and CSS.\n\n');
    stream.markdown('- **Thinking Mode Resilience**: Transient upstream 524/timeout failures retry automatically on the fallback model.\n\n');
    
    stream.markdown('### 🛡️ Security & Privacy\n');
    stream.markdown('- **Secret Shield**: Automatically masks keys/PII locally.\n');
    stream.markdown('- **Vulnerability Scanner**: Alerts you to insecure logic (eval, SQLi, http).\n\n');
    
    stream.markdown('### 🏺 Persistence\n');
    stream.markdown('- **`/vault`**: Access your private and team-shared prompts.\n');
    stream.markdown('- **Save Buttons**: Click "Save to Vault" after any enhancement to keep it forever.\n\n');

    stream.markdown('### 🧩 Agent Workflow Skills\n');
    stream.markdown('- **`/skills`**: Generates a project-specific `skills.md` starter with 7 reference files, 21 commands, anti-patterns, and a `.clarity.md` protocol.\n');
    stream.markdown('- **`template:skills-md`**: Opens the full starter prompt if you want to customize it first.\n\n');
    
    stream.markdown('### ⚙️ Optimization\n');
    stream.markdown('- **Tech Stack Sync**: Auto-detects versions from `package.json`.\n');
    stream.markdown('- **Context Compressor**: Prunes workspace metadata to save tokens.\n\n');
    
    stream.markdown('---\n');
    stream.markdown('**Try it now:** Just type your coding request or use `@clarity /skills` to build a reusable workflow skill, or start with `template:rest-api`.\n\n');
    stream.button({
        title: '🧩 Open Skills.md Builder',
        command: 'clarity.showSkills'
    });

    return { metadata: { command: 'help' } };
}

/**
 * Handles the /onboarding subcommand to show the interactive onboarding
 */
async function handleOnboardingRequest(stream: vscode.ChatResponseStream): Promise<vscode.ChatResult> {
    stream.markdown('# ClarityAI Onboarding\n\n');
    stream.markdown('Opening the interactive onboarding guide in the sidebar...\n\n');
    
    // Focus on the onboarding view in the sidebar
    await vscode.commands.executeCommand('clarity-onboarding.focus');
    
    stream.markdown('The onboarding guide is now open in the ClarityAI sidebar. Follow the steps to get started!\n');
    
    return { metadata: { command: 'onboarding' } };
}

/**
 * Handles the /vault subcommand to list and recall saved prompts
 */
async function handleVaultRequest(stream: vscode.ChatResponseStream): Promise<vscode.ChatResult> {
    const localVault = extensionContext.globalState.get<any[]>('clarity.vault', []);
    let teamVault: any[] = [];

    // Try to load team vault from workspace
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        try {
            const vaultUri = vscode.Uri.joinPath(workspaceFolder.uri, '.clarity', 'vault.json');
            const data = await vscode.workspace.fs.readFile(vaultUri);
            teamVault = JSON.parse(data.toString());
        } catch {
            // No team vault found
        }
    }
    
    if (localVault.length === 0 && teamVault.length === 0) {
        stream.markdown('### 🏺 Your Prompt Vault is Empty\n\n');
        stream.markdown('Save an enhanced prompt by clicking the **Save to Vault** button after any optimization.');
        return { metadata: { command: 'vault', count: 0 } };
    }

    if (teamVault.length > 0) {
        stream.markdown(`### 👥 Team Vault (${teamVault.length} items)\n Shared in this repository via \`.clarity/vault.json\`\n\n`);
        teamVault.forEach((item, index) => {
            const date = new Date(item.timestamp).toLocaleDateString();
            const author = item.author ? ` (by ${item.author})` : '';
            stream.markdown(`#### ${index + 1}. ${item.name}${author} — ${date}\n`);
            
            const preview = item.prompt.length > 200 ? item.prompt.substring(0, 200) + '...' : item.prompt;
            stream.markdown('```\n' + preview + '\n```\n\n');
            
            stream.button({
                title: `🦾 Use Team: "${item.name}"`,
                command: 'clarity.forwardToCopilot',
                arguments: [item.prompt]
            });
            stream.markdown('\n\n');
        });
    }

    if (localVault.length > 0) {
        stream.markdown(`### 🏠 Local Vault (${localVault.length} items)\n Only visible on this machine\n\n`);
        localVault.forEach((item, index) => {
            const date = new Date(item.timestamp).toLocaleDateString();
            stream.markdown(`#### ${index + 1}. ${item.name} — ${date}\n`);
            
            const preview = item.prompt.length > 200 ? item.prompt.substring(0, 200) + '...' : item.prompt;
            stream.markdown('```\n' + preview + '\n```\n\n');
            
            stream.button({
                title: `🦾 Use Local: "${item.name}"`,
                command: 'clarity.forwardToCopilot',
                arguments: [item.prompt]
            });
            stream.markdown('\n\n');
        });
    }

    return { metadata: { command: 'vault', count: localVault.length + teamVault.length } };
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

    // Clean up Phase 3 managers
    if (cloudSyncManager) {
        cloudSyncManager.dispose();
    }
    if (dashboardProvider) {
        dashboardProvider.dispose();
    }
}