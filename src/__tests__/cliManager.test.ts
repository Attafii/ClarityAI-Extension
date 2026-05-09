import { describe, expect, it, jest } from '@jest/globals';
import { CLIManager } from '../cliManager';

function createConfig(overrides: Partial<any> = {}): any {
    return {
        apiKey: 'local-test-key',
        apiBaseUrl: 'https://example.com',
        apiModel: 'z-ai/glm4.7',
        fastModel: 'meta/llama-3.3-70b-instruct',
        thinkingModel: 'z-ai/glm4.7',
        autoInjectContext: true,
        showDiffView: true,
        enableMermaid: true,
        showEducationalInsights: true,
        defaultPersona: 'architect',
        ...overrides,
    };
}

function createSuggestion(id: string, category: string, confidence = 80) {
    return {
        id,
        title: `${category} suggestion ${id}`,
        description: `${category} description ${id}`,
        prompt: `${category} prompt ${id}`,
        category,
        context: [category],
        confidence,
    };
}

function createManager(options: {
    config?: Partial<any>;
    quota?: Partial<any>;
    context?: any;
    consent?: any;
    onboarding?: any;
    vault?: any;
} = {}) {
    const config = createConfig(options.config);
    const quotaState = {
        allowed: true,
        reason: undefined,
        remainingToday: 20,
        remainingThisHour: 10,
        nextResetTime: new Date('2026-04-28T00:00:00.000Z'),
        cooldownUntil: undefined,
        ...options.quota,
    };

    const quotaManager = {
        isAllowed: jest.fn(async () => quotaState),
        recordRequest: jest.fn(async () => undefined),
        getRemainingQuota: jest.fn(() => ({
            hour: 10,
            day: 20,
            percentage: 10,
        })),
        getQuotaString: jest.fn(() => '20 requests remaining today (10% used)'),
        isApproachingLimit: jest.fn(() => false),
    };

    const promptSuggestionsManager = {
        getCategories: jest.fn(() => ['testing', 'documentation', 'refactoring', 'optimization', 'architecture', 'security', 'debugging', 'feature']),
        getDebuggingSuggestions: jest.fn(() => [createSuggestion('debug-1', 'debugging')]),
        getFeatureSuggestions: jest.fn(() => [createSuggestion('feature-1', 'feature')]),
        getOptimizationSuggestions: jest.fn(() => [createSuggestion('opt-1', 'optimization')]),
        getArchitectureSuggestions: jest.fn(() => [createSuggestion('arch-1', 'architecture')]),
        getSecuritySuggestions: jest.fn(() => [createSuggestion('sec-1', 'security')]),
        getSuggestionsForFileType: jest.fn(() => [createSuggestion('file-1', 'documentation', 70)]),
    };

    const context = options.context || {
        framework: 'Next.js',
        language: 'typescript',
        dependencies: { next: '14.0.0' },
        devDependencies: { typescript: '5.4.5' },
        activeFile: {
            language: 'typescript',
            relativePath: 'src/app.ts',
            isTest: false,
        },
        buildTool: 'Vite',
        hasTypeScript: true,
        hasTests: false,
        workspaceMap: ['src/app.ts exports: App'],
        customRules: 'No secrets',
    };

    const consentState = options.consent || { consented: false, shown: false };
    const consentManager = {
        hasConsent: jest.fn(() => consentState.consented),
        hasConsentBannerBeenShown: jest.fn(() => consentState.shown),
        setConsent: jest.fn(async (value: boolean) => {
            consentState.consented = value;
            consentState.shown = true;
        }),
        getStatus: jest.fn(() => ({
            consented: consentState.consented,
            shown: consentState.shown,
        })),
    };

    const onboardingState = options.onboarding || { shouldShow: true };
    const onboardingManager = {
        shouldShowOnboarding: jest.fn(() => onboardingState.shouldShow),
        getSteps: jest.fn(() => [
            { id: 'welcome', title: 'Welcome', description: 'Intro', content: 'Welcome' },
            { id: 'quick-start', title: 'Quick Start', description: 'Start quickly', content: 'Quick start' },
        ]),
        completeOnboarding: jest.fn(async () => {
            onboardingState.shouldShow = false;
        }),
        resetOnboarding: jest.fn(async () => {
            onboardingState.shouldShow = true;
        }),
    };

    const vaultState = {
        prompts: [] as any[],
        statistics: {
            total: 1,
            draft: 1,
            pending: 0,
            approved: 0,
            rejected: 0,
            totalUsage: 0,
            mostUsed: null,
        },
        ...options.vault,
    };

    const teamVaultManager = {
        saveToDraft: jest.fn(async (title: string, prompt: string, enhancedPrompt: string, tags: string[]) => {
            return {
                id: 'vault-1',
                title,
                prompt,
                enhancedPrompt,
                author: 'Tester',
                createdAt: '2026-04-27T00:00:00.000Z',
                status: 'draft',
                tags,
                usage: 0,
            };
        }),
        submitForApproval: jest.fn(async () => true),
        approvePrompt: jest.fn(async () => true),
        rejectPrompt: jest.fn(async () => true),
        getPrompts: jest.fn(() => vaultState.prompts),
        getStatistics: jest.fn(() => vaultState.statistics),
        recordUsage: jest.fn(async () => undefined),
        exportVault: jest.fn(() => vaultState.prompts),
    };

    const manager = new CLIManager({
        quotaManager: quotaManager as any,
        promptSuggestionsManager: promptSuggestionsManager as any,
        teamVaultManager: teamVaultManager as any,
        consentManager: consentManager as any,
        onboardingManager: onboardingManager as any,
        contextResolver: jest.fn(async () => context),
        configProvider: jest.fn(() => config as any),
    } as any);

    return {
        manager,
        quotaManager,
        promptSuggestionsManager,
        teamVaultManager,
        consentManager,
        onboardingManager,
        context,
        config,
        quotaState,
        consentState,
        onboardingState,
        vaultState,
    };
}

describe('CLIManager', () => {
    it('defaults bare input to prompt enhancement', async () => {
        const { manager } = createManager();

        const result = await manager.execute('build a login flow with validation');

        expect(result.command).toBe('enhance');
        expect(result.success).toBe(true);
        expect(result.enhancedPrompt).toContain('User request:');
        expect(result.enhancedPrompt).toContain('build a login flow with validation');
        expect(result.output).toContain('Recommended model: meta/llama-3.3-70b-instruct');
    });

    it('enhances prompts with context, privacy masking, and insights', async () => {
        const { manager } = createManager();

        const result = await manager.execute(
            'clarity enhance build an api using token=abcdefghijklmnopqrstuvwxyz1234 to manage users'
        );

        expect(result.command).toBe('enhance');
        expect(result.success).toBe(true);
        expect(result.enhancedPrompt).toContain('Workspace context:');
        expect(result.enhancedPrompt).toContain('REDACTED');
        expect(result.warnings?.some((warning: string) => warning.includes('Sensitive data was masked'))).toBe(true);
        expect(result.output).toContain('Insights:');
        expect(result.output).toContain('Recommended model:');
        expect(result.suggestions?.length).toBeGreaterThan(0);
    });

    it('routes prompt suggestions by category and limits the results', async () => {
        const { manager, promptSuggestionsManager } = createManager();

        const result = await manager.execute('clarity suggest secure architecture for auth tokens');

        expect(result.command).toBe('suggest');
        expect(result.success).toBe(true);
        expect(result.suggestions?.some((suggestion) => suggestion.category === 'security')).toBe(true);
        expect(result.suggestions?.some((suggestion) => suggestion.category === 'architecture')).toBe(true);
        expect(promptSuggestionsManager.getSecuritySuggestions).toHaveBeenCalled();
        expect(promptSuggestionsManager.getArchitectureSuggestions).toHaveBeenCalled();
        expect(result.output).toContain('Suggestions:');
    });

    it('analyzes complexity and returns a model recommendation', async () => {
        const { manager } = createManager();

        const result = await manager.execute(
            'clarity analyze design a scalable authentication platform with database schema, security reviews, testing strategy, and error handling'
        );

        expect(result.command).toBe('analyze');
        expect(result.success).toBe(true);
        expect(result.analysis?.level).toBe('complex');
        expect(result.output).toContain('Complexity: complex');
        expect(result.output).toContain('Recommended model: z-ai/glm4.7');
        expect(result.quality?.score).toBeLessThanOrEqual(100);
    });

    it('blocks consuming commands when quota is exhausted', async () => {
        const { manager, quotaManager } = createManager({
            quota: {
                allowed: false,
                reason: 'Daily limit reached.',
            },
        });

        const result = await manager.execute('clarity enhance write a fast api');

        expect(result.success).toBe(false);
        expect(result.command).toBe('enhance');
        expect(result.output).toContain('Allowed: no');
        expect(result.warnings?.[0]).toBe('Daily limit reached.');
        expect(quotaManager.recordRequest).not.toHaveBeenCalled();
    });

    it('fills templates with provided variables', async () => {
        const { manager } = createManager();

        const result = await manager.execute('clarity template rest-api resource=users method=POST');

        expect(result.command).toBe('template');
        expect(result.success).toBe(true);
        expect(result.template?.id).toBe('rest-api');
        expect(result.output).toContain('Create a REST API endpoint for users');
        expect(result.output).toContain('HTTP Method: POST');
    });

    it('delegates vault commands to the team vault manager', async () => {
        const { manager, teamVaultManager } = createManager();

        const result = await manager.execute(
            'clarity vault save --title "Login prompt" --prompt "build login" --enhanced "build login better" --tags auth,forms'
        );

        expect(result.command).toBe('vault');
        expect(result.success).toBe(true);
        expect(teamVaultManager.saveToDraft).toHaveBeenCalledWith(
            'Login prompt',
            'build login',
            'build login better',
            ['auth', 'forms']
        );
        expect(result.vaultPrompt?.title).toBe('Login prompt');
    });

    it('reports consent and onboarding state', async () => {
        const { manager, consentManager, onboardingManager } = createManager();

        const consentResult = await manager.execute('clarity consent enable');
        const onboardingResult = await manager.execute('clarity onboarding status');

        expect(consentResult.command).toBe('consent');
        expect(consentResult.consent?.consented).toBe(true);
        expect(consentManager.setConsent).toHaveBeenCalledWith(true);
        expect(onboardingResult.command).toBe('onboarding');
        expect(onboardingResult.onboarding?.steps.length).toBeGreaterThan(0);
        expect(onboardingManager.getSteps).toHaveBeenCalled();
    });

    it('shows help and command guidance', async () => {
        const { manager } = createManager();

        const result = await manager.execute('clarity help');

        expect(result.command).toBe('help');
        expect(result.output).toContain('ClarityAI CLI');
        expect(result.output).toContain('clarity template <id>');
        expect(result.output).toContain('Templates available:');
    });
});
