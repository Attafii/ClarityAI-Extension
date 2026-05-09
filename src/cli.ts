#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DEFAULT_CONFIG } from './defaultConfig';
import { analyzePromptComplexity, ComplexityAnalysis, getComplexityDescription } from './complexityAnalyzer';
import { analyzePromptQuality, improvePrompt, ConversationContext } from './autocorrect';
import { scanForSecrets, SecretDetection } from './privacyGuard';
import { PROMPT_TEMPLATES, PromptTemplate, fillTemplate, getTemplate, searchTemplates } from './templates';
import { PromptSuggestion, PromptSuggestionsManager, SuggestionCategory } from './promptSuggestions';
import { QuotaManager, QuotaPresets, QuotaStatus } from './quotaManager';
import { TeamMember, TeamVaultManager, VaultPrompt } from './teamVault';
import { runInit, runMap, runCheckpoint, runDistill, runGenerate, runBlueprints } from './cli/commands';
import { printHeader, printVersion, printTagline } from './cli/ui/header';
import { createBox, createDimBox, createSuccessBox, createWarningBox, createErrorBox } from './cli/ui/boxes';
import { createSpinner, successSpin, failSpin } from './cli/ui/spinner';
import { THEME } from './cli/ui/theme';

interface CliIO {
    stdout: (text: string) => void;
    stderr: (text: string) => void;
}

interface CliRunOptions {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    stdin?: string;
    io?: CliIO;
}

interface CliParsedArgs {
    command: string;
    flags: Record<string, string | boolean>;
    positionals: string[];
    variables: Record<string, string>;
    rawPrompt: string;
}

interface CliProjectContext {
    cwd: string;
    language?: string;
    framework?: string;
    buildTool?: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
    activeFile?: {
        path: string;
        language: string;
        isTest: boolean;
    };
    hasTypeScript: boolean;
    hasTests: boolean;
    workspaceMap: string[];
    customRules?: string;
}

interface CliExecutionResult {
    command: string;
    success: boolean;
    summary: string;
    output: string;
    enhancedPrompt?: string;
    analysis?: ComplexityAnalysis;
    quality?: ReturnType<typeof analyzePromptQuality>;
    suggestions?: PromptSuggestion[];
    quota?: QuotaStatus;
    template?: PromptTemplate;
    vaultPrompt?: VaultPrompt | null;
    context?: CliProjectContext;
    consent?: {
        consented: boolean;
        shown: boolean;
    };
    onboarding?: {
        shouldShow: boolean;
        steps: Array<{ id: string; title: string; description: string }>;
    };
    warnings?: string[];
    exitCode: number;
}

class JsonKeyValueStore {
    private data: Record<string, unknown> = {};

    constructor(private readonly filePath: string) {
        this.load();
    }

    get<T>(key: string, defaultValue?: T): T {
        if (Object.prototype.hasOwnProperty.call(this.data, key)) {
            return this.data[key] as T;
        }

        return defaultValue as T;
    }

    async update(key: string, value: unknown): Promise<void> {
        this.data[key] = value;
        this.save();
    }

    private load(): void {
        try {
            if (!fs.existsSync(this.filePath)) {
                return;
            }

            const text = fs.readFileSync(this.filePath, 'utf8');
            this.data = JSON.parse(text) as Record<string, unknown>;
        } catch {
            this.data = {};
        }
    }

    private save(): void {
        try {
            fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
            fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
        } catch {
            // Persisting CLI state should never block command execution.
        }
    }
}

class CliConsentManager {
    private readonly consentKey = 'clarity.cli.consent';
    private readonly consentShownKey = 'clarity.cli.consent_shown';

    constructor(private readonly store: JsonKeyValueStore) {}

    hasConsent(): boolean {
        return this.store.get<boolean>(this.consentKey, false) === true;
    }

    hasConsentBannerBeenShown(): boolean {
        return this.store.get<boolean>(this.consentShownKey, false) === true;
    }

    async setConsent(consented: boolean): Promise<void> {
        await this.store.update(this.consentKey, consented);
        await this.store.update(this.consentShownKey, true);
    }

    getStatus(): { consented: boolean; shown: boolean } {
        return {
            consented: this.hasConsent(),
            shown: this.hasConsentBannerBeenShown(),
        };
    }
}

class CliOnboardingManager {
    private readonly onboardedKey = 'clarity.cli.onboarded';

    constructor(private readonly store: JsonKeyValueStore) {}

    shouldShowOnboarding(): boolean {
        return this.store.get<boolean>(this.onboardedKey, false) !== true;
    }

    getSteps(): Array<{ id: string; title: string; description: string }> {
        return [
            {
                id: 'welcome',
                title: 'Welcome to ClarityAI CLI',
                description: 'Learn how to enhance prompts from the terminal',
            },
            {
                id: 'quick-start',
                title: 'Quick Start',
                description: 'Enhance, analyze, and save prompts from Bash, Zsh, Fish, or PowerShell',
            },
            {
                id: 'copilot',
                title: 'Copilot Mode',
                description: 'Emit copy/paste-ready prompts for Copilot CLI and chat flows',
            },
            {
                id: 'context',
                title: 'Workspace Context',
                description: 'Read package metadata, source layout, and .clarityrules automatically',
            },
            {
                id: 'privacy',
                title: 'Privacy Guardrails',
                description: 'Mask secrets before they leave your machine',
            },
            {
                id: 'done',
                title: 'You Are Ready',
                description: 'Use the CLI as a fast prompt workstation',
            },
        ];
    }

    async completeOnboarding(): Promise<void> {
        await this.store.update(this.onboardedKey, true);
    }

    async resetOnboarding(): Promise<void> {
        await this.store.update(this.onboardedKey, false);
    }
}

interface CliRuntime {
    store: JsonKeyValueStore;
    quotaManager: QuotaManager;
    suggestionsManager: PromptSuggestionsManager;
    vaultManager: TeamVaultManager;
    consentManager: CliConsentManager;
    onboardingManager: CliOnboardingManager;
}

const COMMAND_ALIASES: Record<string, string> = {
    enhance: 'enhance',
    improve: 'enhance',
    suggest: 'suggest',
    suggestions: 'suggest',
    analyze: 'analyze',
    analyse: 'analyze',
    quota: 'quota',
    template: 'template',
    templates: 'templates',
    vault: 'vault',
    context: 'context',
    consent: 'consent',
    onboarding: 'onboarding',
    help: 'help',
    h: 'help',
    version: 'version',
    init: 'init',
    map: 'map',
    checkpoint: 'checkpoint',
    distill: 'distill',
    generate: 'generate',
    blueprints: 'blueprints',
};

const BOOLEAN_FLAGS = new Set([
    'json',
    'copilot',
    'remote',
    'save',
    'help',
    'version',
    'noContext',
    'quiet',
]);

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

export async function runCli(argv: string[] = process.argv.slice(2), options: CliRunOptions = {}): Promise<CliExecutionResult> {
    const cwd = options.cwd || process.cwd();
    const env = options.env || process.env;
    const io = options.io || {
        stdout: (text: string) => process.stdout.write(text),
        stderr: (text: string) => process.stderr.write(text),
    };
    const stdinText = normalizeStdinText(options.stdin);

    const runtime = createRuntime(cwd);
    const parsed = parseArgs(argv);

    if (parsed.command === 'version' || parsed.flags.version === true) {
        const version = readPackageVersion(cwd);
        const output = `${printHeader()}\n${printVersion(version)}\n${printTagline()}`;
        io.stdout(`${output}\n`);
        return {
            command: 'version',
            success: true,
            summary: 'Printed version.',
            output,
            exitCode: 0,
        };
    }

    if (parsed.flags.help === true || parsed.command === 'help') {
        const result = buildHelpResult(runtime, cwd);
        writeResult(result, io, parsed.flags);
        return result;
    }

    const cliContext = await resolveWorkspaceContext(cwd, parsed.flags, options.stdin, env);
    const result = await executeCommand(parsed, runtime, cliContext, env, stdinText, cwd);
    writeResult(result, io, parsed.flags);
    return result;
}

function createRuntime(cwd: string): CliRuntime {
    const statePath = path.join(cwd, '.clarity', 'cli-state.json');
    const store = new JsonKeyValueStore(statePath);
    const context = { globalState: store } as any;

    const quotaManager = new QuotaManager(QuotaPresets.FREE);
    quotaManager.initialize(context);

    const silentLogger = {
        debug: () => undefined,
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
    } as unknown as import('./logger').ClarityLogger;

    const suggestionsManager = new PromptSuggestionsManager(silentLogger);
    const vaultManager = new TeamVaultManager(context, silentLogger);
    vaultManager.setCurrentUser({
        id: 'cli-user',
        name: 'ClarityAI CLI',
        email: 'cli@clarity.local',
        role: 'admin',
        canApprove: true,
    } satisfies TeamMember);

    return {
        store,
        quotaManager,
        suggestionsManager,
        vaultManager,
        consentManager: new CliConsentManager(store),
        onboardingManager: new CliOnboardingManager(store),
    };
}

function parseArgs(argv: string[]): CliParsedArgs {
    const flags: Record<string, string | boolean> = {};
    const positionals: string[] = [];
    const variables: Record<string, string> = {};

    let index = 0;
    let command = 'enhance';

    if (argv.length > 0 && !argv[0].startsWith('-') && COMMAND_ALIASES[argv[0].toLowerCase()]) {
        command = COMMAND_ALIASES[argv[0].toLowerCase()];
        index = 1;
    }

    for (; index < argv.length; index++) {
        const token = argv[index];

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
            const nextToken = argv[index + 1];

            if (BOOLEAN_FLAGS.has(key)) {
                flags[key] = true;
                continue;
            }

            if (nextToken && !nextToken.startsWith('-')) {
                flags[key] = nextToken;
                index++;
                continue;
            }

            flags[key] = true;
            continue;
        }

        if (token.startsWith('-') && token.length > 1) {
            const key = normalizeFlagName(token.slice(1));
            flags[key] = true;
            continue;
        }

        if (token.includes('=') && !token.startsWith('@')) {
            const [key, ...rest] = token.split('=');
            variables[key] = rest.join('=');
            positionals.push(token);
            continue;
        }

        positionals.push(token);
    }

    if (positionals.length > 0 && command === 'enhance' && !positionals[0].startsWith('@')) {
        const firstToken = positionals[0].toLowerCase();
        if (COMMAND_ALIASES[firstToken]) {
            command = COMMAND_ALIASES[firstToken];
            positionals.shift();
        }
    }

    const rawPrompt = positionals.join(' ').trim();

    return {
        command,
        flags,
        positionals,
        variables,
        rawPrompt,
    };
}

async function executeCommand(
    parsed: CliParsedArgs,
    runtime: CliRuntime,
    context: CliProjectContext,
    env: NodeJS.ProcessEnv,
    stdinText: string | undefined,
    cwd: string
): Promise<CliExecutionResult> {
    const command = parsed.command;
    const format = resolveFormat(parsed.flags);
    const isCopilotMode = format === 'copilot';
    const prompt = extractPrompt(parsed);
    const persona = resolvePersona(parsed.flags, env);
    const consumingCommand = ['enhance', 'suggest', 'analyze', 'template', 'vault'].includes(command);

    if (consumingCommand) {
        const quota = await runtime.quotaManager.isAllowed();
        if (!quota.allowed) {
            return {
                command,
                success: false,
                summary: quota.reason || 'Quota limit reached.',
                output: formatQuotaStatus(quota),
                quota,
                exitCode: 1,
            };
        }
    }

    switch (command) {
        case 'enhance': {
            const resolvedPrompt = extractPrompt(parsed, stdinText);

            if (!resolvedPrompt) {
                return {
                    command,
                    success: false,
                    summary: 'No prompt provided.',
                    output: 'Provide a prompt to enhance, or pipe text via stdin.',
                    exitCode: 1,
                };
            }

            const remoteMode = parsed.flags.remote === true || env.CLARITY_CLI_REMOTE === 'true';
            const result = await buildEnhancementResult(resolvedPrompt, persona, context, runtime.suggestionsManager, parsed, remoteMode);

            if (parsed.flags.save === true) {
                const saved = await runtime.vaultManager.saveToDraft(
                    stringFlag(parsed.flags, 'title') || deriveTitle(prompt),
                    prompt,
                    result.enhancedPrompt || result.output,
                    parseTags(stringFlag(parsed.flags, 'tags'))
                );
                result.vaultPrompt = saved;
                if (saved) {
                    result.output = `${result.output}\n\nSaved to vault: ${saved.title}`;
                }
            }

            await runtime.quotaManager.recordRequest(estimateUsage(result.enhancedPrompt || result.output));
            result.quota = await runtime.quotaManager.isAllowed();
            result.exitCode = 0;
            return result;
        }

        case 'suggest': {
            const resolvedPrompt = extractPrompt(parsed, stdinText);

            if (!resolvedPrompt) {
                return {
                    command,
                    success: false,
                    summary: 'No prompt provided.',
                    output: 'Provide a prompt to get suggestions.',
                    exitCode: 1,
                };
            }

            const result = buildSuggestionResult(resolvedPrompt, context, runtime.suggestionsManager, parsed);
            await runtime.quotaManager.recordRequest(estimateUsage(result.output));
            result.quota = await runtime.quotaManager.isAllowed();
            result.exitCode = 0;
            return result;
        }

        case 'analyze': {
            const resolvedPrompt = extractPrompt(parsed, stdinText);

            if (!resolvedPrompt) {
                return {
                    command,
                    success: false,
                    summary: 'No prompt provided.',
                    output: 'Provide a prompt to analyze.',
                    exitCode: 1,
                };
            }

            const result = buildAnalysisResult(resolvedPrompt, context, runtime.suggestionsManager, parsed);
            await runtime.quotaManager.recordRequest(estimateUsage(result.output));
            result.quota = await runtime.quotaManager.isAllowed();
            result.exitCode = 0;
            return result;
        }

        case 'template': {
            const result = buildTemplateResult(parsed, context);
            await runtime.quotaManager.recordRequest(estimateUsage(result.output));
            result.quota = await runtime.quotaManager.isAllowed();
            result.exitCode = result.success ? 0 : 1;
            return result;
        }

        case 'templates': {
            return {
                command,
                success: true,
                summary: 'Listed templates.',
                output: buildTemplatesOutput(parsed),
                exitCode: 0,
            };
        }

        case 'quota': {
            const quota = await runtime.quotaManager.isAllowed();
            const remaining = runtime.quotaManager.getRemainingQuota();
            return {
                command,
                success: true,
                summary: 'Quota status retrieved.',
                output: [
                    `Allowed: ${quota.allowed ? 'yes' : 'no'}`,
                    `Remaining today: ${remaining.day}`,
                    `Remaining this hour: ${remaining.hour}`,
                    `Usage: ${remaining.percentage}%`,
                    `Next reset: ${quota.nextResetTime.toISOString()}`,
                    runtime.quotaManager.getQuotaString(),
                ].join('\n'),
                quota,
                exitCode: 0,
            };
        }

        case 'context': {
            return {
                command,
                success: true,
                summary: 'Workspace context gathered.',
                output: formatContextSummary(context),
                context,
                exitCode: 0,
            };
        }

        case 'consent': {
            const action = (parsed.positionals[0] || 'status').toLowerCase();
            if (action === 'enable') {
                await runtime.consentManager.setConsent(true);
            } else if (action === 'disable') {
                await runtime.consentManager.setConsent(false);
            }
            const status = runtime.consentManager.getStatus();
            return {
                command,
                success: true,
                summary: `Consent ${action}.`,
                output: [`Consent enabled: ${status.consented ? 'yes' : 'no'}`, `Consent banner shown: ${status.shown ? 'yes' : 'no'}`].join('\n'),
                consent: status,
                exitCode: 0,
            };
        }

        case 'onboarding': {
            const action = (parsed.positionals[0] || 'status').toLowerCase();
            if (action === 'complete') {
                await runtime.onboardingManager.completeOnboarding();
            } else if (action === 'reset') {
                await runtime.onboardingManager.resetOnboarding();
            }
            const shouldShow = runtime.onboardingManager.shouldShowOnboarding();
            const steps = runtime.onboardingManager.getSteps();
            return {
                command,
                success: true,
                summary: `Onboarding ${action}.`,
                output: [
                    `Show onboarding: ${shouldShow ? 'yes' : 'no'}`,
                    `Total steps: ${steps.length}`,
                    ...steps.map((step, index) => `${index + 1}. ${step.title} - ${step.description}`),
                ].join('\n'),
                onboarding: { shouldShow, steps },
                exitCode: 0,
            };
        }

        case 'vault': {
            return buildVaultResult(parsed, runtime.vaultManager, command);
        }

        case 'init': {
            await runInit({ cwd, json: parsed.flags.json === true });
            return {
                command,
                success: true,
                summary: 'Protocol initialized.',
                output: 'Protocol files created in .clarity/',
                exitCode: 0,
            };
        }

        case 'map': {
            await runMap({ cwd, json: parsed.flags.json === true });
            return {
                command,
                success: true,
                summary: 'Map updated.',
                output: 'Dependency map updated.',
                exitCode: 0,
            };
        }

        case 'checkpoint': {
            await runCheckpoint({ cwd, json: parsed.flags.json === true });
            return {
                command,
                success: true,
                summary: 'Checkpoint synced.',
                output: 'Checkpoint state saved.',
                exitCode: 0,
            };
        }

        case 'distill': {
            const prompt = extractPrompt(parsed, stdinText);
            if (!prompt) {
                return {
                    command,
                    success: false,
                    summary: 'No prompt provided.',
                    output: 'Provide a prompt to distill, or pipe text via stdin.',
                    exitCode: 1,
                };
            }
            const maxTokens = numberFlag(parsed.flags, 'maxTokens', 100000);
            await runDistill(prompt, { cwd, json: parsed.flags.json === true, maxTokens });
            return {
                command,
                success: true,
                summary: 'Prompt distilled.',
                output: 'Distilled output shown.',
                exitCode: 0,
            };
        }

        case 'generate': {
            const blueprintName = parsed.positionals[0] || '';
            if (!blueprintName) {
                return {
                    command,
                    success: false,
                    summary: 'Blueprint name missing.',
                    output: 'Provide a blueprint name: clarity generate <blueprint> [key=value ...]',
                    exitCode: 1,
                };
            }
            await runGenerate(blueprintName, parsed.variables, { cwd, json: parsed.flags.json === true });
            return {
                command,
                success: true,
                summary: 'Blueprint generated.',
                output: `Blueprint "${blueprintName}" loaded.`,
                exitCode: 0,
            };
        }

        case 'blueprints': {
            await runBlueprints({ cwd, json: parsed.flags.json === true });
            return {
                command,
                success: true,
                summary: 'Blueprints listed.',
                output: 'Available blueprints shown.',
                exitCode: 0,
            };
        }

        default: {
            return {
                command: 'help',
                success: true,
                summary: 'Displayed help.',
                output: buildHelpText(runtime, context),
                exitCode: 0,
            };
        }
    }
}

async function buildEnhancementResult(
    prompt: string,
    persona: string,
    context: CliProjectContext,
    suggestionsManager: PromptSuggestionsManager,
    parsed: CliParsedArgs,
    remoteMode: boolean
): Promise<CliExecutionResult> {
    const secretDetection = scanForSecrets(prompt);
    const sanitizedPrompt = secretDetection.maskedPrompt.trim();
    const analysis = analyzePromptComplexity(sanitizedPrompt);
    const quality = analyzePromptQuality(sanitizedPrompt);
    const suggestions = collectSuggestions(prompt, context, suggestionsManager, parsed);
    const templateMatches = searchTemplates(sanitizedPrompt).slice(0, 3);
    const recommendedModel = analysis.level === 'complex' ? 'thinking' : 'fast';
    const contextSummary = formatContextSummary(context);

    let enhancedPrompt: string | undefined;
    if (remoteMode) {
        try {
            const remoteContext: ConversationContext = {
                previousMessages: [prompt],
                todos: [],
                projectContext: context.workspaceMap.slice(0, 5),
                lastActions: context.activeFile ? [`Current file: ${context.activeFile.path}`] : [],
            };
            enhancedPrompt = await improvePrompt(sanitizedPrompt, remoteContext, undefined, persona, true);
        } catch {
            enhancedPrompt = undefined;
        }
    }

    if (!enhancedPrompt) {
        enhancedPrompt = buildLocalEnhancement(
            sanitizedPrompt,
            persona,
            contextSummary,
            analysis,
            quality,
            templateMatches,
            suggestions,
            secretDetection,
            recommendedModel
        );
    }

    return {
        command: 'enhance',
        success: true,
        summary: 'Prompt enhanced successfully.',
        output: enhancedPrompt,
        enhancedPrompt,
        analysis,
        quality,
        suggestions,
        warnings: buildWarnings(secretDetection, quality, analysis),
        exitCode: 0,
    };
}

function buildLocalEnhancement(
    prompt: string,
    persona: string,
    contextSummary: string,
    analysis: ComplexityAnalysis,
    quality: ReturnType<typeof analyzePromptQuality>,
    templateMatches: PromptTemplate[],
    suggestions: PromptSuggestion[],
    secretDetection: SecretDetection,
    recommendedModel: string
): string {
    const lines: string[] = [];
    lines.push(PERSONA_GUIDANCE[persona] || PERSONA_GUIDANCE.none);
    lines.push('');
    lines.push('User request:');
    lines.push(prompt);
    lines.push('');
    lines.push('Workspace context:');
    lines.push(contextSummary);

    if (templateMatches.length > 0) {
        lines.push('');
        lines.push('Relevant template hints:');
        lines.push(templateMatches.map((template) => `- ${template.name} (${template.id}): ${template.description}`).join('\n'));
    }

    lines.push('');
    lines.push('Enhancement goals:');
    lines.push(`- Optimize for ${analysis.level === 'complex' ? 'deep reasoning' : 'fast delivery'}.`);
    lines.push(`- Prepare for ${recommendedModel}.`);
    lines.push('- Make acceptance criteria, edge cases, and output format explicit.');
    lines.push('- Keep the prompt aligned with the TypeScript workspace and existing ClarityAI features.');

    if (suggestions.length > 0) {
        lines.push('');
        lines.push('Suggested follow-up directions:');
        lines.push(suggestions.slice(0, 3).map((suggestion) => `- ${suggestion.title}: ${suggestion.prompt}`).join('\n'));
    }

    if (secretDetection.found) {
        lines.push('');
        lines.push(`Privacy note: ${secretDetection.details.join(', ')} was masked before enhancement.`);
    }

    if (quality.issues.length > 0) {
        lines.push('');
        lines.push('Quality issues to address:');
        lines.push(quality.issues.map((issue) => `- ${issue}`).join('\n'));
    }

    lines.push('');
    lines.push(`Complexity: ${getComplexityDescription(analysis)}`);
    return lines.join('\n');
}

function buildSuggestionResult(
    prompt: string,
    context: CliProjectContext,
    suggestionsManager: PromptSuggestionsManager,
    parsed: CliParsedArgs
): CliExecutionResult {
    const analysis = analyzePromptComplexity(prompt);
    const categories = resolveSuggestionCategories(prompt, analysis);
    const language = context.activeFile?.language || context.language || 'typescript';
    const unique = new Map<string, PromptSuggestion>();

    const addItems = (items: PromptSuggestion[]) => {
        for (const item of items) {
            if (!unique.has(item.id)) {
                unique.set(item.id, item);
            }
        }
    };

    addItems(suggestionsManager.getSuggestionsForFileType(context.activeFile?.isTest ? 'test' : 'code', language));

    if (categories.has('security')) {
        addItems(suggestionsManager.getSecuritySuggestions());
    }

    if (categories.has('architecture')) {
        addItems(suggestionsManager.getArchitectureSuggestions());
    }

    if (categories.has('optimization')) {
        addItems(suggestionsManager.getOptimizationSuggestions());
    }

    if (categories.has('debugging')) {
        addItems(suggestionsManager.getDebuggingSuggestions());
    }

    addItems(suggestionsManager.getFeatureSuggestions(prompt));

    const suggestions = Array.from(unique.values()).sort((left, right) => right.confidence - left.confidence).slice(0, numberFlag(parsed.flags, 'limit', 5));

    return {
        command: 'suggest',
        success: true,
        summary: 'Prompt suggestions generated.',
        output: suggestions.length > 0 ? formatSuggestionsOutput(suggestions) : 'No suggestions found.',
        suggestions,
        analysis,
        exitCode: 0,
    };
}

function buildAnalysisResult(
    prompt: string,
    context: CliProjectContext,
    suggestionsManager: PromptSuggestionsManager,
    parsed: CliParsedArgs
): CliExecutionResult {
    const secretDetection = scanForSecrets(prompt);
    const analysis = analyzePromptComplexity(secretDetection.maskedPrompt);
    const quality = analyzePromptQuality(secretDetection.maskedPrompt);
    const language = context.activeFile?.language || context.language || 'typescript';
    const suggestions = suggestionsManager.getSuggestionsForFileType(context.activeFile?.isTest ? 'test' : 'code', language).slice(0, 3);
    const recommendedModel = analysis.level === 'complex' ? 'thinking' : 'fast';

    return {
        command: 'analyze',
        success: true,
        summary: 'Prompt analysis completed.',
        output: [
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
            suggestions.length > 0 ? ['Suggested follow-ups:', ...suggestions.map((suggestion) => `- ${suggestion.title}`)].join('\n') : 'Suggested follow-ups: none',
        ].join('\n'),
        analysis,
        quality,
        suggestions,
        exitCode: 0,
    };
}

function buildTemplateResult(parsed: CliParsedArgs, context: CliProjectContext): CliExecutionResult {
    const templateId = stringFlag(parsed.flags, 'template') || parsed.positionals[0];

    if (!templateId) {
        return {
            command: 'template',
            success: false,
            summary: 'Template id missing.',
            output: 'Provide a template id, for example: clarity template rest-api resource=users method=POST',
            exitCode: 1,
        };
    }

    const template = getTemplate(templateId);
    if (!template) {
        const matches = searchTemplates(templateId);
        return {
            command: 'template',
            success: matches.length > 0,
            summary: matches.length > 0 ? 'Template search results shown.' : 'Template not found.',
            output: matches.length > 0 ? matches.map((item, index) => formatTemplatePreview(item, index + 1)).join('\n\n') : `No template found for \"${templateId}\".`,
            exitCode: matches.length > 0 ? 0 : 1,
        };
    }

    const variables = collectVariables(parsed);
    const missing = (template.variables || []).filter((variable) => !(variable in variables));
    const filled = fillTemplate(template, variables);

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
        exitCode: 0,
    };
}

function buildTemplatesOutput(parsed: CliParsedArgs): string {
    const query = parsed.positionals.join(' ').trim();
    const category = stringFlag(parsed.flags, 'category');

    if (!query && !category) {
        const grouped = new Map<string, number>();
        for (const template of PROMPT_TEMPLATES) {
            grouped.set(template.category, (grouped.get(template.category) || 0) + 1);
        }

        return [
            `Templates available: ${PROMPT_TEMPLATES.length}`,
            ...Array.from(grouped.entries())
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([group, count]) => `- ${group}: ${count}`),
            '',
            'Tip: use \"clarity template <id> key=value\" to fill one.',
        ].join('\n');
    }

    const results = category ? PROMPT_TEMPLATES.filter((template) => template.category.toLowerCase().includes(category.toLowerCase())) : searchTemplates(query);
    if (results.length === 0) {
        return `No templates matched \"${query || category || ''}\".`;
    }

    return results.map((template, index) => formatTemplatePreview(template, index + 1)).join('\n\n');
}

async function buildVaultResult(parsed: CliParsedArgs, vaultManager: TeamVaultManager, command: string): Promise<CliExecutionResult> {
    const subcommand = (parsed.positionals[0] || 'stats').toLowerCase();

    if (subcommand === 'save') {
        const prompt = stringFlag(parsed.flags, 'prompt') || parsed.positionals.slice(1).join(' ').trim();
        if (!prompt) {
            return {
                command,
                success: false,
                summary: 'Prompt text missing.',
                output: 'Provide prompt text to save to the vault.',
                exitCode: 1,
            };
        }

        const enhancedPrompt = stringFlag(parsed.flags, 'enhanced') || prompt;
        const title = stringFlag(parsed.flags, 'title') || deriveTitle(prompt);
        const tags = parseTags(stringFlag(parsed.flags, 'tags'));
        const saved = await vaultManager.saveToDraft(title, prompt, enhancedPrompt, tags);
        return {
            command,
            success: Boolean(saved),
            summary: saved ? 'Prompt saved to the vault.' : 'Failed to save prompt.',
            output: saved ? `Saved prompt ${saved.id} as \"${saved.title}\" with ${saved.tags.length} tag(s).` : 'Vault save failed.',
            vaultPrompt: saved,
            exitCode: saved ? 0 : 1,
        };
    }

    if (subcommand === 'submit' || subcommand === 'approve' || subcommand === 'reject' || subcommand === 'use') {
        const promptId = stringFlag(parsed.flags, 'id') || parsed.positionals[1];
        if (!promptId) {
            return {
                command,
                success: false,
                summary: 'Prompt id missing.',
                output: 'Provide a prompt id.',
                exitCode: 1,
            };
        }

        if (subcommand === 'submit') {
            const notes = stringFlag(parsed.flags, 'notes') || parsed.positionals.slice(2).join(' ').trim();
            const submitted = await vaultManager.submitForApproval(promptId, notes);
            return {
                command,
                success: submitted,
                summary: submitted ? 'Prompt submitted for approval.' : 'Failed to submit prompt.',
                output: submitted ? `Submitted prompt ${promptId} for approval.` : 'Submission failed.',
                exitCode: submitted ? 0 : 1,
            };
        }

        if (subcommand === 'approve') {
            const approved = await vaultManager.approvePrompt(promptId);
            return {
                command,
                success: approved,
                summary: approved ? 'Prompt approved.' : 'Failed to approve prompt.',
                output: approved ? `Approved prompt ${promptId}.` : 'Approval failed.',
                exitCode: approved ? 0 : 1,
            };
        }

        if (subcommand === 'reject') {
            const reason = stringFlag(parsed.flags, 'reason') || parsed.positionals.slice(2).join(' ').trim() || 'No reason provided.';
            const rejected = await vaultManager.rejectPrompt(promptId, reason);
            return {
                command,
                success: rejected,
                summary: rejected ? 'Prompt rejected.' : 'Failed to reject prompt.',
                output: rejected ? `Rejected prompt ${promptId}.` : 'Rejection failed.',
                exitCode: rejected ? 0 : 1,
            };
        }

        await vaultManager.recordUsage(promptId);
        return {
            command,
            success: true,
            summary: 'Usage recorded.',
            output: `Recorded usage for prompt ${promptId}.`,
            exitCode: 0,
        };
    }

    if (subcommand === 'list' || subcommand === 'approved' || subcommand === 'pending' || subcommand === 'draft' || subcommand === 'rejected') {
        const status = subcommand === 'list' ? undefined : (subcommand === 'pending' ? 'pending_approval' : subcommand);
        const prompts = vaultManager.getPrompts(status as VaultPrompt['status'] | undefined);
        return {
            command,
            success: true,
            summary: 'Retrieved vault prompts.',
            output: formatVaultPromptList(prompts),
            exitCode: 0,
        };
    }

    const statistics = vaultManager.getStatistics();
    return {
        command,
        success: true,
        summary: 'Vault statistics retrieved.',
        output: [
            `Total: ${statistics.total}`,
            `Draft: ${statistics.draft}`,
            `Pending: ${statistics.pending}`,
            `Approved: ${statistics.approved}`,
            `Rejected: ${statistics.rejected}`,
            `Total usage: ${statistics.totalUsage}`,
            statistics.mostUsed ? `Most used: ${statistics.mostUsed.title}` : 'Most used: none',
        ].join('\n'),
        exitCode: 0,
    };
}

function buildHelpResult(runtime: CliRuntime, cwd: string): CliExecutionResult {
    return {
        command: 'help',
        success: true,
        summary: 'Displayed help.',
        output: buildHelpText(runtime, { cwd, dependencies: {}, devDependencies: {}, workspaceMap: [] , hasTypeScript: false, hasTests: false }),
        exitCode: 0,
    };
}

function buildHelpText(runtime: CliRuntime, context: CliProjectContext): string {
    const templateCount = PROMPT_TEMPLATES.length;
    const categoryCount = new Set(PROMPT_TEMPLATES.map((template) => template.category)).size;
    const suggestionCategories = runtime.suggestionsManager.getCategories().join(', ');

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
        '  --json       Return JSON output',
        '  --copilot    Emit a copy/paste-ready Copilot prompt',
        '  --remote     Use the remote enhancement engine when available',
        '  --save       Save the enhanced prompt to the local vault',
        '  --limit N    Limit suggestion count',
        '  --file PATH  Use a specific file for workspace context',
        '',
        `Templates available: ${templateCount} across ${categoryCount} categories`,
        `Suggestion categories: ${suggestionCategories}`,
        `Default environment: ${DEFAULT_CONFIG.ENVIRONMENT}`,
        `Proxy endpoint: ${DEFAULT_CONFIG.PROXY_URL}`,
        '',
        'Copilot compatibility:',
        '  clarity enhance "build a login form" --copilot',
        '  clarity enhance "write tests for this API" --remote --copilot',
        '',
        'Examples:',
        '  clarity enhance build a login flow with validation',
        '  clarity suggest secure api endpoint with auth',
        '  clarity template rest-api resource=users method=POST',
        '  clarity vault save --title "Login flow" --prompt "build login" --enhanced "..."',
        '',
        `Workspace: ${context.cwd}`,
    ].join('\n');
}

async function resolveWorkspaceContext(
    cwd: string,
    flags: Record<string, string | boolean>,
    stdin?: string,
    env?: NodeJS.ProcessEnv
): Promise<CliProjectContext> {
    const filePath = stringFlag(flags, 'file') || stringFlag(flags, 'path');
    const packageJson = readJsonFile(path.join(cwd, 'package.json')) as Record<string, any> | null;
    const tsconfig = readJsonFile(path.join(cwd, 'tsconfig.json')) as Record<string, any> | null;
    const tsconfigTest = readJsonFile(path.join(cwd, 'tsconfig.test.json')) as Record<string, any> | null;
    const dependencies = packageJson?.dependencies || {};
    const devDependencies = packageJson?.devDependencies || {};
    const activeFile = filePath ? resolveActiveFile(path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath)) : undefined;
    const workspaceMap = collectWorkspaceMap(cwd);

    return {
        cwd,
        language: activeFile?.language || detectLanguageFromDependencies(dependencies, devDependencies),
        framework: detectFramework(dependencies, devDependencies),
        buildTool: detectBuildTool(packageJson?.scripts || {}),
        dependencies,
        devDependencies,
        activeFile,
        hasTypeScript: Boolean(devDependencies.typescript || dependencies.typescript || tsconfig || tsconfigTest),
        hasTests: detectTestFramework(devDependencies),
        workspaceMap,
        customRules: readTextFileIfExists(path.join(cwd, '.clarityrules')),
    };
}

function resolveActiveFile(filePath: string): CliProjectContext['activeFile'] {
    if (!fs.existsSync(filePath)) {
        return undefined;
    }

    const language = detectLanguageFromPath(filePath);
    return {
        path: filePath,
        language,
        isTest: isTestFile(filePath),
    };
}

function collectWorkspaceMap(cwd: string): string[] {
    const results: string[] = [];
    const srcDir = path.join(cwd, 'src');
    const roots = [srcDir, cwd];

    for (const root of roots) {
        if (!fs.existsSync(root)) {
            continue;
        }

        walkFiles(root, (filePath) => {
            if (results.length >= 10) {
                return;
            }

            const relativePath = path.relative(cwd, filePath).replace(/\\/g, '/');
            if (/node_modules|out\//.test(relativePath)) {
                return;
            }

            if (/\.(ts|tsx|js|jsx)$/.test(filePath)) {
                const content = readTextFileIfExists(filePath) || '';
                const exports = content.match(/export (?:class|function|const|interface|type) (\w+)/g);
                if (exports && exports.length > 0) {
                    const names = exports.map((entry) => entry.split(' ').pop()).filter(Boolean) as string[];
                    results.push(`${relativePath} exports: ${names.join(', ')}`);
                } else {
                    results.push(relativePath);
                }
                return;
            }

            if (/\.(md|json)$/.test(filePath)) {
                results.push(relativePath);
            }
        }, 2);

        if (results.length >= 10) {
            break;
        }
    }

    return results.slice(0, 10);
}

function walkFiles(root: string, onFile: (filePath: string) => void, maxDepth = 3, currentDepth = 0): void {
    if (currentDepth > maxDepth || !fs.existsSync(root)) {
        return;
    }

    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const fullPath = path.join(root, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', 'out', '.git', '.clarity'].includes(entry.name)) {
                continue;
            }
            walkFiles(fullPath, onFile, maxDepth, currentDepth + 1);
            continue;
        }

        if (entry.isFile()) {
            onFile(fullPath);
        }
    }
}

function detectFramework(dependencies: Record<string, string>, devDependencies: Record<string, string>): string | undefined {
    const allDeps = new Set([...Object.keys(dependencies), ...Object.keys(devDependencies)]);
    if (allDeps.has('next')) return 'Next.js';
    if (allDeps.has('react')) return 'React';
    if (allDeps.has('vue')) return 'Vue';
    if (allDeps.has('@angular/core')) return 'Angular';
    if (allDeps.has('svelte')) return 'Svelte';
    if (allDeps.has('express')) return 'Express';
    if (allDeps.has('@nestjs/core')) return 'NestJS';
    if (allDeps.has('fastify')) return 'Fastify';
    return undefined;
}

function detectLanguageFromDependencies(dependencies: Record<string, string>, devDependencies: Record<string, string>): string | undefined {
    if (dependencies.typescript || devDependencies.typescript) {
        return 'typescript';
    }

    if (dependencies.react || devDependencies.react) {
        return 'tsx';
    }

    return undefined;
}

function detectBuildTool(scripts: Record<string, string>): string | undefined {
    const scriptValues = Object.values(scripts).join(' ');
    if (scriptValues.includes('vite')) return 'Vite';
    if (scriptValues.includes('webpack')) return 'Webpack';
    if (scriptValues.includes('rollup')) return 'Rollup';
    if (scriptValues.includes('esbuild')) return 'esbuild';
    if (scriptValues.includes('turbo')) return 'Turbo';
    return undefined;
}

function detectTestFramework(devDependencies: Record<string, string>): boolean {
    return Object.keys(devDependencies).some((dep) => dep.includes('jest') || dep.includes('vitest') || dep.includes('mocha') || dep.includes('@testing-library'));
}

function formatContextSummary(context: CliProjectContext): string {
    const lines: string[] = [];
    lines.push(`Workspace: ${context.cwd}`);
    if (context.activeFile) {
        lines.push(`Active file: ${path.relative(context.cwd, context.activeFile.path).replace(/\\/g, '/')} (${context.activeFile.language})`);
    }
    if (context.framework) {
        lines.push(`Framework: ${context.framework}`);
    }
    if (context.language) {
        lines.push(`Language: ${context.language}`);
    }
    if (context.buildTool) {
        lines.push(`Build tool: ${context.buildTool}`);
    }
    lines.push(`TypeScript: ${context.hasTypeScript ? 'yes' : 'no'}`);
    lines.push(`Tests: ${context.hasTests ? 'yes' : 'no'}`);
    if (context.workspaceMap.length > 0) {
        lines.push('Workspace map:');
        lines.push(...context.workspaceMap.map((entry) => `- ${entry}`));
    }
    if (context.customRules) {
        lines.push('Custom rules:');
        lines.push(context.customRules);
    }
    return lines.join('\n');
}

function buildWarnings(secretDetection: SecretDetection, quality: ReturnType<typeof analyzePromptQuality>, analysis: ComplexityAnalysis): string[] {
    const warnings: string[] = [];
    if (secretDetection.found) {
        warnings.push(`Sensitive data was masked (${secretDetection.details.join(', ')}).`);
    }
    warnings.push(...quality.issues);
    if (analysis.score >= 80) {
        warnings.push('High complexity detected; consider splitting the request if it becomes too broad.');
    }
    return warnings.slice(0, 5);
}

function collectSuggestions(
    prompt: string,
    context: CliProjectContext,
    suggestionsManager: PromptSuggestionsManager,
    parsed: CliParsedArgs
): PromptSuggestion[] {
    const analysis = analyzePromptComplexity(prompt);
    const categories = resolveSuggestionCategories(prompt, analysis);
    const language = context.activeFile?.language || context.language || 'typescript';
    const unique = new Map<string, PromptSuggestion>();

    const addItems = (items: PromptSuggestion[]) => {
        for (const item of items) {
            if (!unique.has(item.id)) {
                unique.set(item.id, item);
            }
        }
    };

    addItems(suggestionsManager.getSuggestionsForFileType(context.activeFile?.isTest ? 'test' : 'code', language));

    if (categories.has('security')) {
        addItems(suggestionsManager.getSecuritySuggestions());
    }
    if (categories.has('architecture')) {
        addItems(suggestionsManager.getArchitectureSuggestions());
    }
    if (categories.has('optimization')) {
        addItems(suggestionsManager.getOptimizationSuggestions());
    }
    if (categories.has('debugging')) {
        addItems(suggestionsManager.getDebuggingSuggestions());
    }

    addItems(suggestionsManager.getFeatureSuggestions(prompt));

    return Array.from(unique.values())
        .sort((left, right) => right.confidence - left.confidence)
        .slice(0, numberFlag(parsed.flags, 'limit', 5));
}

function resolveSuggestionCategories(prompt: string, analysis: ComplexityAnalysis): Set<SuggestionCategory | 'security' | 'architecture' | 'optimization' | 'debugging' | 'feature'> {
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

function formatSuggestionsOutput(suggestions: PromptSuggestion[]): string {
    if (suggestions.length === 0) {
        return 'No suggestions found.';
    }

    return [
        `Suggestions: ${suggestions.length}`,
        ...suggestions.map((suggestion) => `- ${suggestion.title} [${suggestion.category}, confidence ${suggestion.confidence}%]: ${suggestion.description}`),
    ].join('\n');
}

function formatTemplatePreview(template: PromptTemplate, index: number): string {
    const variables = template.variables && template.variables.length > 0 ? template.variables.join(', ') : 'none';
    return [
        `${index}. ${template.name} (${template.id})`,
        `Category: ${template.category}`,
        `Description: ${template.description}`,
        `Variables: ${variables}`,
    ].join('\n');
}

function formatVaultPromptList(prompts: VaultPrompt[]): string {
    if (prompts.length === 0) {
        return 'No vault prompts found.';
    }

    return [
        `Vault prompts: ${prompts.length}`,
        ...prompts.map((prompt, index) => `${index + 1}. ${prompt.title} [${prompt.status}] by ${prompt.author} (usage: ${prompt.usage})`),
    ].join('\n');
}

function formatQuotaStatus(status: QuotaStatus): string {
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

function buildAnalysisSummary(analysis: ComplexityAnalysis, quality: ReturnType<typeof analyzePromptQuality>, secretDetection: SecretDetection, suggestions: PromptSuggestion[]): string {
    return [
        `Complexity: ${analysis.level} (${analysis.score}/100)`,
        `Recommended model: ${analysis.level === 'complex' ? 'thinking' : 'fast'}`,
        '',
        'Reasons:',
        ...analysis.reasons.map((reason) => `- ${reason}`),
        '',
        `Quality score: ${quality.score}/100`,
        ...quality.issues.map((issue) => `- ${issue}`),
        '',
        `Secrets detected: ${secretDetection.found ? secretDetection.details.join(', ') : 'none'}`,
        '',
        suggestions.length > 0 ? ['Suggested follow-ups:', ...suggestions.map((suggestion) => `- ${suggestion.title}`)].join('\n') : 'Suggested follow-ups: none',
    ].join('\n');
}

function extractPrompt(parsed: CliParsedArgs, stdinText?: string): string {
    const promptFlag = stringFlag(parsed.flags, 'prompt');
    if (promptFlag) {
        return promptFlag;
    }

    return parsed.rawPrompt || stdinText || '';
}

function resolvePersona(flags: Record<string, string | boolean>, env: NodeJS.ProcessEnv): string {
    const persona = stringFlag(flags, 'persona') || env.CLARITY_CLI_PERSONA || 'none';
    return PERSONA_GUIDANCE[persona] ? persona : 'none';
}

function resolveFormat(flags: Record<string, string | boolean>): 'text' | 'json' | 'copilot' {
    const explicit = stringFlag(flags, 'format');
    if (explicit === 'json' || explicit === 'copilot' || explicit === 'text') {
        return explicit;
    }

    if (flags.json === true) {
        return 'json';
    }

    if (flags.copilot === true) {
        return 'copilot';
    }

    return 'text';
}

function collectVariables(parsed: CliParsedArgs): Record<string, string> {
    return { ...parsed.variables };
}

function parseTags(value?: string): string[] {
    if (!value) {
        return [];
    }

    return value
        .split(/[,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean);
}

function deriveTitle(prompt: string): string {
    const compact = prompt.replace(/\s+/g, ' ').trim();
    if (compact.length <= 60) {
        return compact || 'Untitled prompt';
    }

    return `${compact.slice(0, 57)}...`;
}

function estimateUsage(text: string): number {
    const words = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words * 0.5));
}

function numberFlag(flags: Record<string, string | boolean>, key: string, fallback: number): number {
    const value = stringFlag(flags, key);
    if (!value) {
        return fallback;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function stringFlag(flags: Record<string, string | boolean>, key: string): string | undefined {
    const value = flags[normalizeFlagName(key)];
    return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
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

function isTestFile(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    return lower.includes('.test.') || lower.includes('.spec.') || lower.includes('__tests__') || lower.includes('/tests/') || lower.includes('\\tests\\');
}

function detectLanguageFromPath(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.ts':
            return 'typescript';
        case '.tsx':
            return 'tsx';
        case '.js':
            return 'javascript';
        case '.jsx':
            return 'jsx';
        case '.md':
            return 'markdown';
        case '.json':
            return 'json';
        case '.py':
            return 'python';
        default:
            return ext.replace('.', '') || 'text';
    }
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
    try {
        if (!fs.existsSync(filePath)) {
            return null;
        }

        const raw = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(raw) as Record<string, unknown>;
    } catch {
        return null;
    }
}

function readTextFileIfExists(filePath: string): string | undefined {
    try {
        if (!fs.existsSync(filePath)) {
            return undefined;
        }

        return fs.readFileSync(filePath, 'utf8').trim();
    } catch {
        return undefined;
    }
}

function readPackageVersion(cwd: string): string {
    const packageJson = readJsonFile(path.join(cwd, 'package.json'));
    const version = packageJson?.version;
    return typeof version === 'string' ? version : 'unknown';
}

function normalizeStdinText(stdin?: string): string | undefined {
    if (typeof stdin === 'string') {
        const trimmed = stdin.trim();
        return trimmed.length > 0 ? trimmed : undefined;
    }

    return undefined;
}

function readProcessStdin(): Promise<string | undefined> {
    if (process.stdin.isTTY) {
        return Promise.resolve(undefined);
    }

    return new Promise((resolve) => {
        let collected = '';

        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk: string) => {
            collected += chunk;
        });
        process.stdin.on('end', () => {
            const trimmed = collected.trim();
            resolve(trimmed.length > 0 ? trimmed : undefined);
        });
        process.stdin.on('error', () => resolve(undefined));
    });
}

function extractPromptInput(argv: string[], stdinText?: string): string {
    const commandTokens = argv.filter((token) => !token.startsWith('--') && !token.startsWith('-'));
    if (commandTokens.length === 0) {
        return stdinText || '';
    }

    return commandTokens.join(' ').trim();
}

function buildSuggestionsForFileType(context: CliProjectContext, suggestionsManager: PromptSuggestionsManager, prompt: string): PromptSuggestion[] {
    const language = context.activeFile?.language || context.language || 'typescript';
    const fileType = context.activeFile?.isTest ? 'test' : 'code';
    const categories = resolveSuggestionCategories(prompt, analyzePromptComplexity(prompt));
    const unique = new Map<string, PromptSuggestion>();

    const addItems = (items: PromptSuggestion[]) => {
        for (const item of items) {
            if (!unique.has(item.id)) {
                unique.set(item.id, item);
            }
        }
    };

    addItems(suggestionsManager.getSuggestionsForFileType(fileType, language));
    if (categories.has('security')) addItems(suggestionsManager.getSecuritySuggestions());
    if (categories.has('architecture')) addItems(suggestionsManager.getArchitectureSuggestions());
    if (categories.has('optimization')) addItems(suggestionsManager.getOptimizationSuggestions());
    if (categories.has('debugging')) addItems(suggestionsManager.getDebuggingSuggestions());
    addItems(suggestionsManager.getFeatureSuggestions(prompt));

    return Array.from(unique.values()).sort((left, right) => right.confidence - left.confidence);
}

function buildResultForTextOutput(result: CliExecutionResult, flags: Record<string, string | boolean>): string {
    if (flags.copilot === true && result.enhancedPrompt) {
        return `@copilot ${result.enhancedPrompt}`;
    }

    return result.output;
}

function writeResult(result: CliExecutionResult, io: CliIO, flags: Record<string, string | boolean>): void {
    if (flags.json === true) {
        io.stdout(`${JSON.stringify(stripUndefined(result), null, 2)}\n`);
        return;
    }

    io.stdout(`${buildResultForTextOutput(result, flags)}\n`);
}

function stripUndefined<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
}

function formatHelpText(runtime: CliRuntime, context: CliProjectContext): string {
    const templateCount = PROMPT_TEMPLATES.length;
    const categoryCount = new Set(PROMPT_TEMPLATES.map((template) => template.category)).size;
    const suggestionCategories = runtime.suggestionsManager.getCategories().join(', ');

    return [
        'ClarityAI CLI',
        '',
        'Usage:',
        '  clarity <prompt>                         Enhance a prompt (default)',
        '  clarity enhance <prompt>                 Enhance a prompt',
        '  clarity suggest <prompt>                  Show improvement suggestions',
        '  clarity analyze <prompt>                  Analyze complexity and quality',
        '  clarity template <id> [k=v ...]          Fill a template',
        '  clarity templates [query]                 Search or list templates',
        '  clarity quota                             Show usage and limits',
        '  clarity context                           Show workspace context',
        '  clarity vault <subcommand>                Manage saved prompts',
        '  clarity consent <status|enable|disable>   Manage analytics consent',
        '  clarity onboarding [status|complete|reset]',
        '',
        '  ──────────────────────────────────────────────────────',
        '  Clarity Protocol (v1.5.0):',
        '  clarity init                              Initialize protocol files',
        '  clarity map                               Analyze and update dependency map',
        '  clarity checkpoint                        Show/update current state',
        '  clarity distill <prompt>                  Compress prompt to token budget',
        '  clarity generate <blueprint> [k=v ...]    Use a blueprint template',
        '  clarity blueprints                        List available blueprints',
        '',
        '  ──────────────────────────────────────────────────────',
        '  clarity help                              Show this guide',
        '  clarity version                           Show version and logo',
        '',
        'Flags:',
        '  --json       Return JSON output',
        '  --copilot    Emit a copy/paste-ready Copilot prompt',
        '  --remote     Use the remote enhancement engine when available',
        '  --save       Save the enhanced prompt to the local vault',
        '  --limit N    Limit suggestion count',
        '  --file PATH  Use a specific file for workspace context',
        '  --maxTokens N Token budget for distill (default: 100000)',
        '',
        `Templates available: ${templateCount} across ${categoryCount} categories`,
        `Suggestion categories: ${suggestionCategories}`,
        '',
        'Copilot compatibility:',
        '  clarity enhance "build a login form" --copilot',
        '  clarity enhance "write tests for this API" --remote --copilot',
        '',
        'Examples:',
        '  clarity enhance build a login flow with validation',
        '  clarity suggest secure api endpoint with auth',
        '  clarity template rest-api resource=users method=POST',
        '  clarity vault save --title "Login flow" --prompt "build login" --enhanced "..."',
        '  clarity init                              # Initialize Clarity Protocol',
        '  clarity map                              # Update dependency map',
        '  clarity distill "implement auth"         # Compress to token budget',
        '  clarity generate diagnose                # Use diagnose workflow',
        '',
        `Workspace: ${context.cwd}`,
    ].join('\n');
}

async function main(): Promise<void> {
    const argv = process.argv.slice(2);
    const result = await runCli(argv, {
        stdin: await readProcessStdin(),
    });
    if (result.exitCode !== 0) {
        process.exitCode = result.exitCode;
    }
}

if (require.main === module) {
    void main();
}
