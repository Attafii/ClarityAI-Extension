import { analyzePromptQuality } from './autocorrect';
import { analyzePromptComplexity, ComplexityAnalysis, getComplexityDescription } from './complexityAnalyzer';
import { extractProjectContext, generateContextString, ProjectContext } from './contextInjection';
import { ClarityConfig, getConfig } from './config';
import { scanForSecrets, SecretDetection } from './privacyGuard';
import {
    fillTemplate,
    getTemplate,
    getTemplatesByCategory,
    PromptTemplate,
    PROMPT_TEMPLATES,
    searchTemplates,
} from './templates';
import {
    PromptSuggestion,
    PromptSuggestionsManager,
    SuggestionCategory,
} from './promptSuggestions';
import { QuotaManager, QuotaStatus } from './quotaManager';
import { TeamVaultManager, VaultPrompt } from './teamVault';
import { ConsentManager } from './consent';
import { OnboardingManager, OnboardingStep } from './onboarding';

export interface PromptQualityReport {
    score: number;
    issues: string[];
    isStale: boolean;
}

export interface VaultStatistics {
    total: number;
    draft: number;
    pending: number;
    approved: number;
    rejected: number;
    totalUsage: number;
    mostUsed: VaultPrompt | null;
}

export type CLICommandName =
    | 'enhance'
    | 'suggest'
    | 'analyze'
    | 'quota'
    | 'template'
    | 'templates'
    | 'vault'
    | 'context'
    | 'consent'
    | 'onboarding'
    | 'help';

export type CLIFlagValue = string | boolean;

export interface ParsedCLICommand {
    command: CLICommandName;
    rawInput: string;
    isPrefixed: boolean;
    args: string[];
    variables: Record<string, string>;
    flags: Record<string, CLIFlagValue>;
}

export interface CLICommandResult {
    command: CLICommandName;
    success: boolean;
    summary: string;
    output: string;
    enhancedPrompt?: string;
    suggestions?: PromptSuggestion[];
    analysis?: ComplexityAnalysis;
    quality?: PromptQualityReport;
    quota?: QuotaStatus;
    template?: PromptTemplate;
    vaultPrompt?: VaultPrompt | null;
    context?: ProjectContext;
    consent?: {
        consented: boolean;
        shown: boolean;
    };
    onboarding?: {
        shouldShow: boolean;
        steps: Array<Pick<OnboardingStep, 'id' | 'title' | 'description'>>;
    };
    warnings?: string[];
    data?: Record<string, unknown>;
}

export type PromptSuggestionsService = Pick<
    PromptSuggestionsManager,
    | 'getCategories'
    | 'getDebuggingSuggestions'
    | 'getFeatureSuggestions'
    | 'getOptimizationSuggestions'
    | 'getArchitectureSuggestions'
    | 'getSecuritySuggestions'
    | 'getSuggestionsForFileType'
>;

export type QuotaService = Pick<
    QuotaManager,
    'isAllowed' | 'recordRequest' | 'getRemainingQuota' | 'getQuotaString' | 'isApproachingLimit'
>;

export type TeamVaultService = Pick<
    TeamVaultManager,
    'saveToDraft' | 'submitForApproval' | 'approvePrompt' | 'rejectPrompt' | 'getPrompts' | 'getStatistics' | 'recordUsage' | 'exportVault'
>;

export type ConsentService = Pick<ConsentManager, 'hasConsent' | 'hasConsentBannerBeenShown' | 'setConsent' | 'getStatus'>;

export type OnboardingService = Pick<OnboardingManager, 'shouldShowOnboarding' | 'getSteps' | 'completeOnboarding' | 'resetOnboarding'>;

export interface CLIManagerDependencies {
    quotaManager: QuotaService;
    promptSuggestionsManager: PromptSuggestionsService;
    teamVaultManager?: TeamVaultService;
    consentManager?: ConsentService;
    onboardingManager?: OnboardingService;
    contextResolver?: () => Promise<ProjectContext>;
    configProvider?: () => ClarityConfig;
    templateSearcher?: typeof searchTemplates;
    templateGetter?: typeof getTemplate;
    templateFiller?: typeof fillTemplate;
    templateCategoryGetter?: typeof getTemplatesByCategory;
    contextFormatter?: typeof generateContextString;
    complexityAnalyzer?: typeof analyzePromptComplexity;
    qualityAnalyzer?: typeof analyzePromptQuality;
    secretScanner?: typeof scanForSecrets;
}

const PREFIXES = new Set(['clarity', 'clarityai', 'cli']);
const BOOLEAN_FLAGS = new Set([
    'json',
    'save',
    'submit',
    'approve',
    'reject',
    'dryRun',
    'help',
    'noContext',
    'context',
    'quiet',
]);

const COMMAND_ALIASES: Record<string, CLICommandName> = {
    enhance: 'enhance',
    improve: 'enhance',
    rewrite: 'enhance',
    polish: 'enhance',
    suggest: 'suggest',
    suggestion: 'suggest',
    suggestions: 'suggest',
    recommend: 'suggest',
    analyze: 'analyze',
    analyse: 'analyze',
    inspect: 'analyze',
    quality: 'analyze',
    quota: 'quota',
    usage: 'quota',
    limits: 'quota',
    template: 'template',
    tpl: 'template',
    templates: 'templates',
    library: 'templates',
    vault: 'vault',
    prompts: 'vault',
    context: 'context',
    'context-injection': 'context',
    consent: 'consent',
    privacy: 'consent',
    analytics: 'consent',
    onboarding: 'onboarding',
    welcome: 'onboarding',
    help: 'help',
    h: 'help',
    '?': 'help',
};

const PERSONA_GUIDANCE: Record<string, string> = {
    none: 'Act as a senior software engineer and focus on clarity, correctness, and practical delivery.',
    architect: 'Act as a systems architect and optimize for scalability, design quality, and maintainability.',
    security: 'Act as a security engineer and harden the request against vulnerabilities and unsafe assumptions.',
    reviewer: 'Act as a senior reviewer and surface logic gaps, hidden risks, and implementation trade-offs.',
    tester: 'Act as a QA engineer and push for edge cases, coverage, and verifiable acceptance criteria.',
    documentation: 'Act as a technical writer and make the request easy to understand, follow, and document.',
    performance: 'Act as a performance engineer and emphasize runtime efficiency, latency, and resource usage.',
    frontend: 'Act as a frontend engineer and emphasize UX, accessibility, and responsive behavior.',
};

const VAULT_STATUS_ALIASES: Record<string, VaultPrompt['status']> = {
    draft: 'draft',
    pending: 'pending_approval',
    pending_approval: 'pending_approval',
    approved: 'approved',
    rejected: 'rejected',
};

export class CLIManager {
    private readonly deps: {
        quotaManager: QuotaService;
        promptSuggestionsManager: PromptSuggestionsService;
        teamVaultManager?: TeamVaultService;
        consentManager?: ConsentService;
        onboardingManager?: OnboardingService;
        contextResolver: () => Promise<ProjectContext>;
        configProvider: () => ClarityConfig;
        templateSearcher: typeof searchTemplates;
        templateGetter: typeof getTemplate;
        templateFiller: typeof fillTemplate;
        templateCategoryGetter: typeof getTemplatesByCategory;
        contextFormatter: typeof generateContextString;
        complexityAnalyzer: typeof analyzePromptComplexity;
        qualityAnalyzer: typeof analyzePromptQuality;
        secretScanner: typeof scanForSecrets;
    };

    constructor(dependencies: CLIManagerDependencies) {
        if (!dependencies.quotaManager) {
            throw new Error('CLIManager requires a quota manager.');
        }

        if (!dependencies.promptSuggestionsManager) {
            throw new Error('CLIManager requires a prompt suggestions manager.');
        }

        this.deps = {
            quotaManager: dependencies.quotaManager,
            promptSuggestionsManager: dependencies.promptSuggestionsManager,
            teamVaultManager: dependencies.teamVaultManager,
            consentManager: dependencies.consentManager,
            onboardingManager: dependencies.onboardingManager,
            contextResolver: dependencies.contextResolver ?? extractProjectContext,
            configProvider: dependencies.configProvider ?? getConfig,
            templateSearcher: dependencies.templateSearcher ?? searchTemplates,
            templateGetter: dependencies.templateGetter ?? getTemplate,
            templateFiller: dependencies.templateFiller ?? fillTemplate,
            templateCategoryGetter: dependencies.templateCategoryGetter ?? getTemplatesByCategory,
            contextFormatter: dependencies.contextFormatter ?? generateContextString,
            complexityAnalyzer: dependencies.complexityAnalyzer ?? analyzePromptComplexity,
            qualityAnalyzer: dependencies.qualityAnalyzer ?? analyzePromptQuality,
            secretScanner: dependencies.secretScanner ?? scanForSecrets,
        };
    }

    /**
     * Parse a raw CLI string into a structured command.
     */
    parseCommand(input: string): ParsedCLICommand {
        const rawInput = input.trim();
        const tokens = tokenizeCommandLine(rawInput);

        if (tokens.length === 0) {
            return {
                command: 'help',
                rawInput,
                isPrefixed: false,
                args: [],
                variables: {},
                flags: {},
            };
        }

        const isPrefixed = PREFIXES.has(normalizePrefixToken(tokens[0]));
        const prefixOffset = isPrefixed ? 1 : 0;
        const candidate = tokens[prefixOffset]?.toLowerCase();
        const command = isPrefixed && candidate && COMMAND_ALIASES[candidate]
            ? COMMAND_ALIASES[candidate]
            : 'enhance';

        const argsStart = isPrefixed && COMMAND_ALIASES[candidate || ''] ? prefixOffset + 1 : isPrefixed ? prefixOffset : 0;
        const { args, flags, variables } = this.parseArguments(tokens.slice(argsStart));

        return {
            command,
            rawInput,
            isPrefixed,
            args,
            variables,
            flags,
        };
    }

    /**
     * Execute a raw CLI command and return the formatted response.
     */
    async execute(input: string): Promise<CLICommandResult> {
        const parsed = this.parseCommand(input);

        if (this.requiresQuota(parsed)) {
            const quota = await this.deps.quotaManager.isAllowed();
            if (!quota.allowed) {
                return this.formatResult({
                    command: parsed.command,
                    success: false,
                    summary: quota.reason || 'Quota limit reached.',
                    output: this.formatQuotaStatus(quota),
                    quota,
                    warnings: quota.reason ? [quota.reason] : undefined,
                    data: { parsed },
                }, parsed);
            }
        }

        const result = await this.dispatch(parsed);

        if (this.requiresQuota(parsed) && result.success) {
            await this.deps.quotaManager.recordRequest(this.estimateUsage(parsed, result));
            result.quota = await this.deps.quotaManager.isAllowed();

            if (this.deps.quotaManager.isApproachingLimit()) {
                result.warnings = [...(result.warnings || []), 'Quota usage is approaching the configured limit.'];
            }
        }

        return this.formatResult(result, parsed);
    }

    /**
     * Return a command guide for help output.
     */
    getCommandGuide(): string {
        const templateCount = PROMPT_TEMPLATES.length;
        const categoryCount = new Set(PROMPT_TEMPLATES.map((template) => template.category)).size;
        const suggestionCategories = this.deps.promptSuggestionsManager.getCategories().join(', ');

        return [
            'ClarityAI CLI',
            '',
            'Usage:',
            '  clarity <prompt>                         Enhance a prompt (default)',
            '  clarity enhance <prompt>                 Enhance a prompt',
            '  clarity suggest <prompt>                 Show improvement suggestions',
            '  clarity analyze <prompt>                 Analyze complexity and quality',
            '  clarity template <id> [k=v ...]          Fill a template',
            '  clarity templates [query]                Search or list templates',
            '  clarity quota                             Show usage and limits',
            '  clarity context                           Show workspace context',
            '  clarity vault <subcommand>                Manage saved prompts',
            '  clarity consent <status|enable|disable>   Manage analytics consent',
            '  clarity onboarding [status|complete|reset]',
            '  clarity help                              Show this guide',
            '',
            'Flags:',
            '  --json     Return JSON output',
            '  --save     Save enhanced output to the vault when supported',
            '  --limit N  Limit suggestion count',
            '  --persona  Override the default persona',
            '',
            `Templates available: ${templateCount} across ${categoryCount} categories`,
            `Suggestion categories: ${suggestionCategories}`,
            '',
            'Examples:',
            '  clarity enhance build a login flow with validation',
            '  clarity suggest secure api endpoint with auth',
            '  clarity template rest-api resource=users method=POST',
            '  clarity vault save --title "Login flow" --prompt "build login" --enhanced "..."',
        ].join('\n');
    }

    private async dispatch(parsed: ParsedCLICommand): Promise<CLICommandResult> {
        switch (parsed.command) {
            case 'enhance':
                return this.handleEnhance(parsed);
            case 'suggest':
                return this.handleSuggest(parsed);
            case 'analyze':
                return this.handleAnalyze(parsed);
            case 'quota':
                return this.handleQuota(parsed);
            case 'template':
                return this.handleTemplate(parsed);
            case 'templates':
                return this.handleTemplates(parsed);
            case 'vault':
                return this.handleVault(parsed);
            case 'context':
                return this.handleContext(parsed);
            case 'consent':
                return this.handleConsent(parsed);
            case 'onboarding':
                return this.handleOnboarding(parsed);
            case 'help':
            default:
                return this.handleHelp(parsed);
        }
    }

    private async handleHelp(parsed: ParsedCLICommand): Promise<CLICommandResult> {
        const consentSummary = this.deps.consentManager ? this.deps.consentManager.getStatus() : undefined;
        const onboardingSummary = this.deps.onboardingManager
            ? {
                  shouldShow: this.deps.onboardingManager.shouldShowOnboarding(),
                  steps: this.deps.onboardingManager.getSteps().map((step) => ({
                      id: step.id,
                      title: step.title,
                      description: step.description,
                  })),
              }
            : undefined;

        const sections: string[] = [this.getCommandGuide()];

        if (consentSummary) {
            sections.push('', `Analytics consent: ${consentSummary.consented ? 'enabled' : 'disabled'}`, `Consent banner shown: ${consentSummary.shown ? 'yes' : 'no'}`);
        }

        if (onboardingSummary) {
            sections.push('', `Onboarding pending: ${onboardingSummary.shouldShow ? 'yes' : 'no'}`, `Onboarding steps: ${onboardingSummary.steps.length}`);
        }

        return {
            command: 'help',
            success: true,
            summary: 'Displayed CLI help.',
            output: sections.join('\n'),
            consent: consentSummary,
            onboarding: onboardingSummary,
            data: { parsed },
        };
    }

    private async handleQuota(parsed: ParsedCLICommand): Promise<CLICommandResult> {
        const status = await this.deps.quotaManager.isAllowed();
        const remaining = this.deps.quotaManager.getRemainingQuota();

        return {
            command: 'quota',
            success: true,
            summary: status.allowed ? 'Quota status retrieved.' : status.reason || 'Quota limit reached.',
            output: [
                `Allowed: ${status.allowed ? 'yes' : 'no'}`,
                `Remaining today: ${remaining.day}`,
                `Remaining this hour: ${remaining.hour}`,
                `Usage: ${remaining.percentage}%`,
                `Next reset: ${status.nextResetTime.toISOString()}`,
                status.cooldownUntil ? `Cooldown until: ${status.cooldownUntil.toISOString()}` : undefined,
                `Quota string: ${this.deps.quotaManager.getQuotaString()}`,
            ]
                .filter(Boolean)
                .join('\n'),
            quota: status,
            data: { parsed, remaining },
        };
    }

    private async handleContext(parsed: ParsedCLICommand): Promise<CLICommandResult> {
        const context = await this.resolveContext();
        const config = this.deps.configProvider();

        return {
            command: 'context',
            success: true,
            summary: 'Workspace context gathered.',
            output: [
                this.deps.contextFormatter(context, true),
                '',
                `Auto inject context: ${config.autoInjectContext ? 'yes' : 'no'}`,
                `Default persona: ${config.defaultPersona}`,
            ].join('\n'),
            context,
            data: { parsed, context, config },
        };
    }

    private async handleConsent(parsed: ParsedCLICommand): Promise<CLICommandResult> {
        if (!this.deps.consentManager) {
            return {
                command: 'consent',
                success: false,
                summary: 'Consent manager is not configured.',
                output: 'Consent manager is not available in this CLI session.',
                data: { parsed },
            };
        }

        const action = (parsed.args[0] || 'status').toLowerCase();

        if (action === 'enable') {
            await this.deps.consentManager.setConsent(true);
        } else if (action === 'disable') {
            await this.deps.consentManager.setConsent(false);
        }

        const status = this.deps.consentManager.getStatus();

        return {
            command: 'consent',
            success: true,
            summary: `Consent ${action}.`,
            output: [
                `Consent enabled: ${status.consented ? 'yes' : 'no'}`,
                `Consent banner shown: ${status.shown ? 'yes' : 'no'}`,
            ].join('\n'),
            consent: status,
            data: { parsed, action, status },
        };
    }

    private async handleOnboarding(parsed: ParsedCLICommand): Promise<CLICommandResult> {
        if (!this.deps.onboardingManager) {
            return {
                command: 'onboarding',
                success: false,
                summary: 'Onboarding manager is not configured.',
                output: 'Onboarding manager is not available in this CLI session.',
                data: { parsed },
            };
        }

        const action = (parsed.args[0] || 'status').toLowerCase();

        if (action === 'complete') {
            await this.deps.onboardingManager.completeOnboarding();
        } else if (action === 'reset') {
            await this.deps.onboardingManager.resetOnboarding();
        }

        const shouldShow = this.deps.onboardingManager.shouldShowOnboarding();
        const steps = this.deps.onboardingManager.getSteps().map((step) => ({
            id: step.id,
            title: step.title,
            description: step.description,
        }));

        return {
            command: 'onboarding',
            success: true,
            summary: `Onboarding ${action}.`,
            output: [
                `Show onboarding: ${shouldShow ? 'yes' : 'no'}`, 
                `Total steps: ${steps.length}`,
                ...steps.map((step, index) => `${index + 1}. ${step.title} - ${step.description}`),
            ].join('\n'),
            onboarding: {
                shouldShow,
                steps,
            },
            data: { parsed, action, steps, shouldShow },
        };
    }

    private async handleTemplates(parsed: ParsedCLICommand): Promise<CLICommandResult> {
        const query = this.extractFreeText(parsed).trim();
        const category = this.getFlagString(parsed.flags, 'category');

        if (!query && !category) {
            const grouped = new Map<string, number>();

            for (const template of PROMPT_TEMPLATES) {
                grouped.set(template.category, (grouped.get(template.category) || 0) + 1);
            }

            return {
                command: 'templates',
                success: true,
                summary: 'Listed template categories.',
                output: [
                    `Templates available: ${PROMPT_TEMPLATES.length}`,
                    ...Array.from(grouped.entries())
                        .sort(([left], [right]) => left.localeCompare(right))
                        .map(([group, count]) => `- ${group}: ${count}`),
                    '',
                    'Tip: use "clarity template <id> key=value" to fill one.',
                ].join('\n'),
                data: { parsed, grouped },
            };
        }

        const searchResults = category
            ? this.deps.templateCategoryGetter(category)
            : this.deps.templateSearcher(query);

        return {
            command: 'templates',
            success: searchResults.length > 0,
            summary: searchResults.length > 0 ? 'Template search completed.' : 'No template matches found.',
            output: searchResults.length > 0
                ? searchResults.map((template, index) => this.formatTemplatePreview(template, index + 1)).join('\n\n')
                : `No templates matched "${query || category || ''}".`,
            data: { parsed, searchResults },
        };
    }

    private async handleTemplate(parsed: ParsedCLICommand): Promise<CLICommandResult> {
        const templateId = this.getFlagString(parsed.flags, 'template') || parsed.args[0];

        if (!templateId) {
            return {
                command: 'template',
                success: false,
                summary: 'Template id missing.',
                output: 'Provide a template id, for example: clarity template rest-api resource=users method=POST',
                data: { parsed },
            };
        }

        const template = this.deps.templateGetter(templateId);

        if (!template) {
            const matches = this.deps.templateSearcher(templateId);
            return {
                command: 'template',
                success: matches.length > 0,
                summary: matches.length > 0 ? 'Template not found exactly, showing close matches.' : 'Template not found.',
                output: matches.length > 0
                    ? matches.map((item, index) => this.formatTemplatePreview(item, index + 1)).join('\n\n')
                    : `No template found for "${templateId}".`,
                data: { parsed, matches },
            };
        }

        const variables = this.collectVariables(parsed);
        const filled = this.deps.templateFiller(template, variables);
        const missing = (template.variables || []).filter((variable) => !(variable in variables));

        return {
            command: 'template',
            success: true,
            summary: 'Template filled successfully.',
            output: [
                `Template: ${template.name}`,
                `Category: ${template.category}`,
                `Description: ${template.description}`,
                '',
                filled,
                missing.length > 0 ? '' : undefined,
                missing.length > 0 ? `Missing variables: ${missing.join(', ')}` : undefined,
            ]
                .filter(Boolean)
                .join('\n'),
            template,
            data: { parsed, variables, missing },
        };
    }

    private async handleVault(parsed: ParsedCLICommand): Promise<CLICommandResult> {
        if (!this.deps.teamVaultManager) {
            return {
                command: 'vault',
                success: false,
                summary: 'Team vault manager is not configured.',
                output: 'Team vault manager is not available in this CLI session.',
                data: { parsed },
            };
        }

        const subcommand = (parsed.args[0] || 'stats').toLowerCase();

        if (subcommand === 'save') {
            const prompt = this.getFlagString(parsed.flags, 'prompt') || this.extractFreeText(parsed, 1);

            if (!prompt) {
                return {
                    command: 'vault',
                    success: false,
                    summary: 'Prompt text missing.',
                    output: 'Provide prompt text to save to the vault.',
                    data: { parsed },
                };
            }

            const title = this.getFlagString(parsed.flags, 'title') || this.deriveTitle(prompt);
            const enhancedPrompt = this.getFlagString(parsed.flags, 'enhanced') || prompt;
            const tags = this.parseTags(this.getFlagString(parsed.flags, 'tags'));
            const saved = await this.deps.teamVaultManager.saveToDraft(title, prompt, enhancedPrompt, tags);

            return {
                command: 'vault',
                success: Boolean(saved),
                summary: saved ? 'Prompt saved to the vault.' : 'Failed to save prompt to the vault.',
                output: saved
                    ? `Saved prompt ${saved.id} as "${saved.title}" with ${saved.tags.length} tag(s).`
                    : 'Vault save failed.',
                vaultPrompt: saved,
                data: { parsed, saved },
            };
        }

        if (subcommand === 'submit' || subcommand === 'approve' || subcommand === 'reject' || subcommand === 'use') {
            const promptId = this.getFlagString(parsed.flags, 'id') || parsed.args[1];

            if (!promptId) {
                return {
                    command: 'vault',
                    success: false,
                    summary: 'Prompt id missing.',
                    output: 'Provide a prompt id.',
                    data: { parsed },
                };
            }

            if (subcommand === 'submit') {
                const notes = this.getFlagString(parsed.flags, 'notes') || this.extractFreeText(parsed, 2);
                const submitted = await this.deps.teamVaultManager.submitForApproval(promptId, notes);

                return {
                    command: 'vault',
                    success: submitted,
                    summary: submitted ? 'Prompt submitted for approval.' : 'Failed to submit prompt for approval.',
                    output: submitted ? `Submitted prompt ${promptId} for approval.` : 'Submission failed.',
                    data: { parsed, promptId, notes, submitted },
                };
            }

            if (subcommand === 'approve') {
                const approved = await this.deps.teamVaultManager.approvePrompt(promptId);

                return {
                    command: 'vault',
                    success: approved,
                    summary: approved ? 'Prompt approved.' : 'Failed to approve prompt.',
                    output: approved ? `Approved prompt ${promptId}.` : 'Approval failed.',
                    data: { parsed, promptId, approved },
                };
            }

            if (subcommand === 'reject') {
                const reason = this.getFlagString(parsed.flags, 'reason') || this.extractFreeText(parsed, 2) || 'No reason provided.';
                const rejected = await this.deps.teamVaultManager.rejectPrompt(promptId, reason);

                return {
                    command: 'vault',
                    success: rejected,
                    summary: rejected ? 'Prompt rejected.' : 'Failed to reject prompt.',
                    output: rejected ? `Rejected prompt ${promptId}.` : 'Rejection failed.',
                    data: { parsed, promptId, reason, rejected },
                };
            }

            await this.deps.teamVaultManager.recordUsage(promptId);
            return {
                command: 'vault',
                success: true,
                summary: 'Usage recorded.',
                output: `Recorded usage for prompt ${promptId}.`,
                data: { parsed, promptId },
            };
        }

        if (subcommand === 'list' || subcommand === 'approved' || subcommand === 'pending' || subcommand === 'draft' || subcommand === 'rejected') {
            const status = this.resolveVaultStatus(subcommand);
            const prompts = this.deps.teamVaultManager.getPrompts(status);

            return {
                command: 'vault',
                success: true,
                summary: 'Retrieved vault prompts.',
                output: this.formatVaultPromptList(prompts),
                data: { parsed, prompts },
            };
        }

        const statistics = this.deps.teamVaultManager.getStatistics();

        return {
            command: 'vault',
            success: true,
            summary: 'Vault statistics retrieved.',
            output: this.formatVaultStatistics(statistics),
            data: { parsed, statistics },
        };
    }

    private async handleAnalyze(parsed: ParsedCLICommand): Promise<CLICommandResult> {
        const prompt = this.extractPrompt(parsed);

        if (!prompt) {
            return {
                command: 'analyze',
                success: false,
                summary: 'No prompt provided.',
                output: 'Provide a prompt to analyze.',
                data: { parsed },
            };
        }

        const config = this.deps.configProvider();
        const context = await this.resolveContextIfNeeded(parsed, config);
        const language = context?.activeFile?.language || context?.language || 'typescript';
        const secretDetection = this.deps.secretScanner(prompt);
        const analysis = this.deps.complexityAnalyzer(secretDetection.maskedPrompt);
        const quality = this.deps.qualityAnalyzer(secretDetection.maskedPrompt);
        const recommendedModel = analysis.level === 'complex' ? config.thinkingModel : config.fastModel;
        const suggestions = this.collectSuggestions(secretDetection.maskedPrompt, language, analysis, 3);

        return {
            command: 'analyze',
            success: true,
            summary: 'Prompt analysis completed.',
            output: this.formatAnalysisOutput(analysis, quality, recommendedModel, secretDetection, suggestions),
            analysis,
            quality,
            suggestions,
            data: { parsed, recommendedModel, secretDetection, context },
        };
    }

    private async handleSuggest(parsed: ParsedCLICommand): Promise<CLICommandResult> {
        const prompt = this.extractPrompt(parsed);

        if (!prompt) {
            return {
                command: 'suggest',
                success: false,
                summary: 'No prompt provided.',
                output: 'Provide a prompt to get suggestions.',
                data: { parsed },
            };
        }

        const config = this.deps.configProvider();
        const context = await this.resolveContextIfNeeded(parsed, config);
        const language = context?.activeFile?.language || context?.language || 'typescript';
        const secretDetection = this.deps.secretScanner(prompt);
        const analysis = this.deps.complexityAnalyzer(secretDetection.maskedPrompt);
        const limit = this.getNumberFlag(parsed.flags, 'limit') || 5;
        const suggestions = this.collectSuggestions(secretDetection.maskedPrompt, language, analysis, limit);
        const category = this.getFlagString(parsed.flags, 'category');
        const filtered = category ? suggestions.filter((suggestion) => suggestion.category === category) : suggestions;

        return {
            command: 'suggest',
            success: true,
            summary: 'Prompt suggestions generated.',
            output: this.formatSuggestionsOutput(filtered),
            suggestions: filtered,
            data: { parsed, secretDetection, analysis, context },
        };
    }

    private async handleEnhance(parsed: ParsedCLICommand): Promise<CLICommandResult> {
        const prompt = this.extractPrompt(parsed);

        if (!prompt) {
            return {
                command: 'enhance',
                success: false,
                summary: 'No prompt provided.',
                output: 'Provide a prompt to enhance.',
                data: { parsed },
            };
        }

        const config = this.deps.configProvider();
        const secretDetection = this.deps.secretScanner(prompt);
        const sanitizedPrompt = secretDetection.maskedPrompt.trim();
        const analysis = this.deps.complexityAnalyzer(sanitizedPrompt);
        const quality = this.deps.qualityAnalyzer(sanitizedPrompt);
        const context = await this.resolveContextIfNeeded(parsed, config);
        const contextString = context && this.shouldInjectContext(parsed, config)
            ? this.deps.contextFormatter(context, true)
            : undefined;
        const language = context?.activeFile?.language || context?.language || 'typescript';
        const templateMatches = this.deps.templateSearcher(sanitizedPrompt).slice(0, 3);
        const suggestions = this.collectSuggestions(sanitizedPrompt, language, analysis, this.getNumberFlag(parsed.flags, 'limit') || 5);
        const persona = this.resolvePersona(parsed, config);
        const recommendedModel = analysis.level === 'complex' ? config.thinkingModel : config.fastModel;
        const enhancedPrompt = this.composeEnhancedPrompt({
            prompt: sanitizedPrompt,
            persona,
            contextString,
            analysis,
            quality,
            templateMatches,
            suggestions,
            config,
            secretDetection,
            recommendedModel,
        });
        const warnings = this.buildWarnings(secretDetection, quality, analysis);
        const outputParts = [
            'Enhanced prompt',
            '',
            enhancedPrompt,
            '',
            `Recommended model: ${recommendedModel}`,
            config.showEducationalInsights ? this.buildInsightSummary(analysis, quality, contextString, templateMatches) : undefined,
            suggestions.length > 0 ? this.formatSuggestionsOutput(suggestions.slice(0, 3)) : undefined,
            warnings.length > 0 ? ['Warnings:', ...warnings.map((warning) => `- ${warning}`)].join('\n') : undefined,
        ]
            .filter(Boolean)
            .join('\n');

        const result: CLICommandResult = {
            command: 'enhance',
            success: true,
            summary: 'Prompt enhanced successfully.',
            output: outputParts,
            enhancedPrompt,
            suggestions,
            analysis,
            quality,
            context,
            warnings,
            data: {
                parsed,
                persona,
                recommendedModel,
                templateMatches,
                secretDetection,
            },
        };

        if (this.getBooleanFlag(parsed.flags, 'save') && this.deps.teamVaultManager) {
            const title = this.getFlagString(parsed.flags, 'title') || this.deriveTitle(sanitizedPrompt);
            const tags = this.parseTags(this.getFlagString(parsed.flags, 'tags'));
            const saved = await this.deps.teamVaultManager.saveToDraft(title, prompt, enhancedPrompt, tags);
            result.vaultPrompt = saved;
            result.data = {
                ...(result.data || {}),
                saved,
            };

            if (saved) {
                result.output = `${result.output}\n\nSaved to vault: ${saved.title}`;
            }
        }

        return result;
    }

    private formatResult(result: CLICommandResult, parsed: ParsedCLICommand): CLICommandResult {
        if (this.getBooleanFlag(parsed.flags, 'json')) {
            return {
                ...result,
                output: JSON.stringify(this.toSerializableResult(result), null, 2),
            };
        }

        return result;
    }

    private toSerializableResult(result: CLICommandResult): Record<string, unknown> {
        return {
            command: result.command,
            success: result.success,
            summary: result.summary,
            output: result.output,
            enhancedPrompt: result.enhancedPrompt,
            suggestions: result.suggestions,
            analysis: result.analysis,
            quality: result.quality,
            quota: result.quota,
            template: result.template,
            vaultPrompt: result.vaultPrompt,
            context: result.context,
            consent: result.consent,
            onboarding: result.onboarding,
            warnings: result.warnings,
            data: result.data,
        };
    }

    private requiresQuota(parsed: ParsedCLICommand): boolean {
        return parsed.command === 'enhance' || parsed.command === 'suggest' || parsed.command === 'analyze' || parsed.command === 'template';
    }

    private async resolveContext(): Promise<ProjectContext> {
        try {
            return await this.deps.contextResolver();
        } catch {
            return {} as ProjectContext;
        }
    }

    private async resolveContextIfNeeded(parsed: ParsedCLICommand, config: ClarityConfig): Promise<ProjectContext | undefined> {
        if (!this.shouldInjectContext(parsed, config)) {
            return undefined;
        }

        return this.resolveContext();
    }

    private shouldInjectContext(parsed: ParsedCLICommand, config: ClarityConfig): boolean {
        const explicitContextFlag = this.getFlagValue(parsed.flags, 'context');
        if (explicitContextFlag !== undefined) {
            return this.interpretBooleanFlag(explicitContextFlag);
        }

        const noContextFlag = this.getFlagValue(parsed.flags, 'noContext');
        if (noContextFlag !== undefined) {
            return !this.interpretBooleanFlag(noContextFlag);
        }

        return config.autoInjectContext;
    }

    private resolvePersona(parsed: ParsedCLICommand, config: ClarityConfig): string {
        const override = this.getFlagString(parsed.flags, 'persona');
        const persona = (override || config.defaultPersona || 'none').toLowerCase();
        return PERSONA_GUIDANCE[persona] ? persona : 'none';
    }

    private composeEnhancedPrompt(options: {
        prompt: string;
        persona: string;
        contextString?: string;
        analysis: ComplexityAnalysis;
        quality: PromptQualityReport;
        templateMatches: PromptTemplate[];
        suggestions: PromptSuggestion[];
        config: ClarityConfig;
        secretDetection: SecretDetection;
        recommendedModel: string;
    }): string {
        const lines: string[] = [];
        lines.push(PERSONA_GUIDANCE[options.persona] || PERSONA_GUIDANCE.none);
        lines.push('');
        lines.push('User request:');
        lines.push(options.prompt);

        if (options.contextString) {
            lines.push('');
            lines.push('Workspace context:');
            lines.push(options.contextString);
        }

        if (options.templateMatches.length > 0) {
            lines.push('');
            lines.push('Relevant templates to consider:');
            lines.push(options.templateMatches.map((template) => `- ${template.id}: ${template.name} (${template.description})`).join('\n'));
        }

        lines.push('');
        lines.push('Enhancement goals:');
        lines.push(`- Optimize for ${options.analysis.level === 'complex' ? 'depth and multi-step reasoning' : 'speed and clarity'}.`);
        lines.push(`- Prepare for the ${options.recommendedModel} model.`);
        lines.push('- Make acceptance criteria, edge cases, and validation explicit.');
        lines.push('- Keep the prompt grounded in the current TypeScript extension stack.');

        if (options.config.enableMermaid && options.analysis.level === 'complex') {
            lines.push('- Include a Mermaid diagram when it will clarify the flow or architecture.');
        }

        if (options.suggestions.length > 0) {
            lines.push('');
            lines.push('Suggested follow-up angles:');
            lines.push(options.suggestions.slice(0, 3).map((suggestion) => `- ${suggestion.title}: ${suggestion.prompt}`).join('\n'));
        }

        if (options.secretDetection.found) {
            lines.push('');
            lines.push('Privacy note: secrets were detected and masked before enhancement.');
        }

        if (options.quality.score < 100) {
            lines.push('');
            lines.push(`Quality score: ${options.quality.score}/100`);
        }

        return lines.join('\n');
    }

    private buildWarnings(secretDetection: SecretDetection, quality: PromptQualityReport, analysis: ComplexityAnalysis): string[] {
        const warnings: string[] = [];

        if (secretDetection.found) {
            warnings.push(`Sensitive data was masked (${secretDetection.details.join(', ')}).`);
        }

        if (quality.issues.length > 0) {
            warnings.push(...quality.issues);
        }

        if (analysis.score >= 80) {
            warnings.push('High complexity detected; consider splitting the request if the result is too broad.');
        }

        return warnings.slice(0, 5);
    }

    private buildInsightSummary(
        analysis: ComplexityAnalysis,
        quality: PromptQualityReport,
        contextString: string | undefined,
        templateMatches: PromptTemplate[]
    ): string {
        const lines: string[] = [];
        lines.push('Insights:');
        lines.push(`- Complexity: ${getComplexityDescription(analysis)}`);
        lines.push(`- Quality score: ${quality.score}/100`);

        if (contextString) {
            lines.push('- Workspace context was injected into the prompt.');
        }

        if (templateMatches.length > 0) {
            lines.push(`- ${templateMatches.length} template match(es) found for the request.`);
        }

        if (quality.issues.length > 0) {
            lines.push(`- Quality issues identified: ${quality.issues.length}`);
        }

        return lines.join('\n');
    }

    private formatAnalysisOutput(
        analysis: ComplexityAnalysis,
        quality: PromptQualityReport,
        recommendedModel: string,
        secretDetection: SecretDetection,
        suggestions: PromptSuggestion[]
    ): string {
        return [
            `Complexity: ${analysis.level} (${analysis.score}/100)`,
            `Recommended model: ${recommendedModel}`,
            '',
            'Reasons:',
            ...analysis.reasons.map((reason) => `- ${reason}`),
            '',
            `Quality score: ${quality.score}/100`,
            ...quality.issues.map((issue) => `- ${issue}`),
            '',
            `Secrets detected: ${secretDetection.found ? secretDetection.details.join(', ') : 'none'}`,
            '',
            suggestions.length > 0
                ? ['Related suggestions:', ...suggestions.slice(0, 3).map((suggestion) => `- ${suggestion.title}`)].join('\n')
                : 'Related suggestions: none',
        ].join('\n');
    }

    private formatSuggestionsOutput(suggestions: PromptSuggestion[]): string {
        if (suggestions.length === 0) {
            return 'No suggestions found.';
        }

        return [
            `Suggestions: ${suggestions.length}`,
            ...suggestions.map(
                (suggestion) => `- ${suggestion.title} [${suggestion.category}, confidence ${suggestion.confidence}%]: ${suggestion.description}`
            ),
        ].join('\n');
    }

    private formatTemplatePreview(template: PromptTemplate, index: number): string {
        const variables = template.variables && template.variables.length > 0 ? template.variables.join(', ') : 'none';

        return [
            `${index}. ${template.name} (${template.id})`,
            `Category: ${template.category}`,
            `Description: ${template.description}`,
            `Variables: ${variables}`,
        ].join('\n');
    }

    private formatVaultPromptList(prompts: VaultPrompt[]): string {
        if (prompts.length === 0) {
            return 'No vault prompts found.';
        }

        return [
            `Vault prompts: ${prompts.length}`,
            ...prompts.map((prompt, index) => `${index + 1}. ${prompt.title} [${prompt.status}] by ${prompt.author} (usage: ${prompt.usage})`),
        ].join('\n');
    }

    private formatVaultStatistics(statistics: VaultStatistics): string {
        return [
            `Total: ${statistics.total}`,
            `Draft: ${statistics.draft}`,
            `Pending: ${statistics.pending}`,
            `Approved: ${statistics.approved}`,
            `Rejected: ${statistics.rejected}`,
            `Total usage: ${statistics.totalUsage}`,
            statistics.mostUsed ? `Most used: ${statistics.mostUsed.title}` : 'Most used: none',
        ].join('\n');
    }

    private formatQuotaStatus(status: QuotaStatus): string {
        return [
            `Allowed: ${status.allowed ? 'yes' : 'no'}`,
            `Remaining today: ${status.remainingToday}`,
            `Remaining this hour: ${status.remainingThisHour}`,
            `Next reset: ${status.nextResetTime.toISOString()}`,
            status.reason ? `Reason: ${status.reason}` : undefined,
            status.cooldownUntil ? `Cooldown until: ${status.cooldownUntil.toISOString()}` : undefined,
        ]
            .filter(Boolean)
            .join('\n');
    }

    private collectSuggestions(prompt: string, language: string, analysis: ComplexityAnalysis, limit: number): PromptSuggestion[] {
        const categories = this.resolveSuggestionCategories(prompt, analysis);
        const unique = new Map<string, PromptSuggestion>();

        const addSuggestions = (items: PromptSuggestion[]) => {
            for (const suggestion of items) {
                if (!unique.has(suggestion.id)) {
                    unique.set(suggestion.id, suggestion);
                }
            }
        };

        addSuggestions(this.deps.promptSuggestionsManager.getSuggestionsForFileType('code', language));
        addSuggestions(this.deps.promptSuggestionsManager.getFeatureSuggestions(prompt));

        if (categories.has('security')) {
            addSuggestions(this.deps.promptSuggestionsManager.getSecuritySuggestions());
        }

        if (categories.has('architecture')) {
            addSuggestions(this.deps.promptSuggestionsManager.getArchitectureSuggestions());
        }

        if (categories.has('optimization')) {
            addSuggestions(this.deps.promptSuggestionsManager.getOptimizationSuggestions());
        }

        if (categories.has('debugging')) {
            addSuggestions(this.deps.promptSuggestionsManager.getDebuggingSuggestions());
        }

        if (categories.has('feature')) {
            addSuggestions(this.deps.promptSuggestionsManager.getFeatureSuggestions(prompt));
        }

        return Array.from(unique.values())
            .sort((left, right) => right.confidence - left.confidence)
            .slice(0, Math.max(1, limit));
    }

    private resolveSuggestionCategories(prompt: string, analysis: ComplexityAnalysis): Set<SuggestionCategory | 'security' | 'architecture' | 'optimization' | 'debugging' | 'feature'> {
        const lower = prompt.toLowerCase();
        const categories = new Set<SuggestionCategory | 'security' | 'architecture' | 'optimization' | 'debugging' | 'feature'>();

        if (/security|auth|token|secret|password|vulnerability|owasp/.test(lower)) {
            categories.add('security');
        }

        if (/architecture|design|system|pattern|refactor|refinement/.test(lower) || analysis.level === 'complex') {
            categories.add('architecture');
        }

        if (/optimi[sz]e|performance|latency|cache|throughput/.test(lower) || analysis.score >= 50) {
            categories.add('optimization');
        }

        if (/debug|bug|error|fail|crash|broken/.test(lower)) {
            categories.add('debugging');
        }

        if (/feature|build|implement|add|enhance|create|design/.test(lower)) {
            categories.add('feature');
        }

        return categories;
    }

    private extractPrompt(parsed: ParsedCLICommand): string {
        const promptFromFlag = this.getFlagString(parsed.flags, 'prompt');
        if (promptFromFlag) {
            return promptFromFlag;
        }

        if (parsed.command === 'vault' && parsed.args.length > 1) {
            return parsed.args.slice(1).join(' ').trim();
        }

        return parsed.args.join(' ').trim();
    }

    private extractFreeText(parsed: ParsedCLICommand, startIndex = 0): string {
        return parsed.args.slice(startIndex).join(' ').trim();
    }

    private collectVariables(parsed: ParsedCLICommand): Record<string, string> {
        return { ...parsed.variables };
    }

    private getFlagValue(flags: Record<string, CLIFlagValue>, key: string): CLIFlagValue | undefined {
        return flags[normalizeFlagName(key)];
    }

    private getFlagString(flags: Record<string, CLIFlagValue>, key: string): string | undefined {
        const value = this.getFlagValue(flags, key);
        return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
    }

    private getBooleanFlag(flags: Record<string, CLIFlagValue>, key: string): boolean {
        const value = this.getFlagValue(flags, key);

        return this.interpretBooleanFlag(value);
    }

    private interpretBooleanFlag(value: CLIFlagValue | undefined): boolean {
        if (typeof value === 'boolean') {
            return value;
        }

        if (typeof value === 'string') {
            return !['false', '0', 'no', 'off'].includes(value.toLowerCase());
        }

        return false;
    }

    private getNumberFlag(flags: Record<string, CLIFlagValue>, key: string): number | undefined {
        const value = this.getFlagValue(flags, key);

        if (typeof value === 'string') {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : undefined;
        }

        return undefined;
    }

    private parseArguments(tokens: string[]): { args: string[]; flags: Record<string, CLIFlagValue>; variables: Record<string, string> } {
        const args: string[] = [];
        const flags: Record<string, CLIFlagValue> = {};
        const variables: Record<string, string> = {};

        for (let index = 0; index < tokens.length; index++) {
            const token = tokens[index];

            if (token.startsWith('--')) {
                const raw = token.slice(2);
                const equalsIndex = raw.indexOf('=');

                if (equalsIndex >= 0) {
                    const key = normalizeFlagName(raw.slice(0, equalsIndex));
                    const value = raw.slice(equalsIndex + 1);
                    flags[key] = BOOLEAN_FLAGS.has(key) ? toBooleanOrString(value) : value;
                    continue;
                }

                const key = normalizeFlagName(raw);
                const nextToken = tokens[index + 1];

                if (BOOLEAN_FLAGS.has(key)) {
                    flags[key] = true;
                    continue;
                }

                if (nextToken && !isFlagToken(nextToken)) {
                    flags[key] = nextToken;
                    index++;
                    continue;
                }

                flags[key] = true;
                continue;
            }

            if (token.startsWith('-') && token.length > 1) {
                const key = normalizeFlagName(token.slice(1));
                const nextToken = tokens[index + 1];

                if (nextToken && !isFlagToken(nextToken) && !BOOLEAN_FLAGS.has(key)) {
                    flags[key] = nextToken;
                    index++;
                    continue;
                }

                flags[key] = true;
                continue;
            }

            if (token.includes('=') && !isFlagToken(token)) {
                const [key, ...rest] = token.split('=');
                variables[key] = rest.join('=');
                args.push(token);
                continue;
            }

            args.push(token);
        }

        return { args, flags, variables };
    }

    private parseTags(value?: string): string[] {
        if (!value) {
            return [];
        }

        return value
            .split(/[,\s]+/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    private deriveTitle(prompt: string): string {
        const compact = prompt.replace(/\s+/g, ' ').trim();
        if (compact.length <= 60) {
            return compact || 'Untitled prompt';
        }

        return `${compact.slice(0, 57)}...`;
    }

    private estimateUsage(parsed: ParsedCLICommand, result: CLICommandResult): number {
        const source = result.enhancedPrompt || result.output || parsed.rawInput;
        const words = source.split(/\s+/).filter(Boolean).length;
        return Math.max(1, Math.ceil(words * 0.5));
    }

    private resolveVaultStatus(subcommand: string): VaultPrompt['status'] | undefined {
        return VAULT_STATUS_ALIASES[subcommand];
    }
}

function tokenizeCommandLine(input: string): string[] {
    const tokens: string[] = [];
    let current = '';
    let quote: 'single' | 'double' | null = null;

    for (let index = 0; index < input.length; index++) {
        const character = input[index];

        if (quote === 'single') {
            if (character === "'") {
                quote = null;
            } else {
                current += character;
            }
            continue;
        }

        if (quote === 'double') {
            if (character === '"') {
                quote = null;
            } else {
                current += character;
            }
            continue;
        }

        if (character === "'") {
            quote = 'single';
            continue;
        }

        if (character === '"') {
            quote = 'double';
            continue;
        }

        if (/\s/.test(character)) {
            if (current.length > 0) {
                tokens.push(current);
                current = '';
            }
            continue;
        }

        current += character;
    }

    if (current.length > 0) {
        tokens.push(current);
    }

    return tokens;
}

function normalizePrefixToken(token: string): string {
    return token.replace(/^@/, '').toLowerCase();
}

function normalizeFlagName(flag: string): string {
    return flag.replace(/^-+/, '').replace(/-([a-z0-9])/gi, (_, character: string) => character.toUpperCase());
}

function toBooleanOrString(value: string): boolean | string {
    const normalized = value.toLowerCase();

    if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true;
    }

    if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false;
    }

    return value;
}

function isFlagToken(token: string): boolean {
    return token.startsWith('-');
}