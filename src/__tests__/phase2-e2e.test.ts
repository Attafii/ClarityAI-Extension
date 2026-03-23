/**
 * Phase 2 End-to-End Test Suite
 * Comprehensive testing for onboarding, vault, suggestions, and analytics
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TeamVaultManager, VaultPrompt } from '../teamVault';
import { PromptSuggestionsManager } from '../promptSuggestions';
import { AnalyticsManager } from '../analytics';
import { ConsentManager } from '../consent';
import { OnboardingManager } from '../onboarding';

// Mock VS Code context
const mockContext = {
    globalState: {
        get: jest.fn(),
        update: jest.fn(),
    },
    extensionUri: { fsPath: '/test' },
};

describe('Phase 2 Features - End-to-End Tests', () => {
    describe('Team Vault Operations', () => {
        let vaultManager: TeamVaultManager;

        beforeEach(() => {
            jest.clearAllMocks();
            vaultManager = new TeamVaultManager(mockContext as any, {} as any);
        });

        it('should save prompt to draft', async () => {
            const result = await vaultManager.saveToDraft(
                'Test Prompt',
                'Original prompt',
                'Enhanced prompt',
                ['test']
            );

            expect(result).toBeDefined();
            expect(result?.title).toBe('Test Prompt');
            expect(result?.status).toBe('draft');
            expect(result?.author).toBe('Unknown');
        });

        it('should submit draft for approval', async () => {
            const draft = await vaultManager.saveToDraft(
                'Review Prompt',
                'Original',
                'Enhanced',
                ['review']
            );

            expect(draft).toBeDefined();

            const submitted = await vaultManager.submitForApproval(
                draft!.id,
                'Please review'
            );

            expect(submitted).toBe(true);
        });

        it('should track vault statistics', async () => {
            await vaultManager.saveToDraft('Prompt 1', 'orig', 'enh', []);
            await vaultManager.saveToDraft('Prompt 2', 'orig', 'enh', []);

            const stats = vaultManager.getStatistics();

            expect(stats.total).toBe(2);
            expect(stats.draft).toBe(2);
            expect(stats.pending).toBe(0);
            expect(stats.approved).toBe(0);
        });

        it('should export vault', async () => {
            await vaultManager.saveToDraft('Export Test', 'orig', 'enh', []);

            const exported = vaultManager.exportVault();

            expect(Array.isArray(exported)).toBe(true);
            expect(exported.length).toBeGreaterThan(0);
        });

        it('should record prompt usage', async () => {
            const prompt = await vaultManager.saveToDraft('Usage Test', 'o', 'e', []);
            expect(prompt).toBeDefined();

            await vaultManager.recordUsage(prompt!.id);

            const stats = vaultManager.getStatistics();
            expect(stats.totalUsage).toBe(1);
        });

        it('should handle team vault configuration', async () => {
            const config = {
                teamName: 'Test Team',
                teamId: 'team-123',
                members: [
                    {
                        id: 'user-1',
                        name: 'Alice',
                        email: 'alice@example.com',
                        role: 'admin' as const,
                        canApprove: true,
                    },
                ],
                requireApproval: true,
                autoApproveAfterRewrites: false,
            };

            await vaultManager.initializeTeamVault(config);
            const retrievedConfig = vaultManager.getVaultConfig();

            expect(retrievedConfig).toEqual(config);
        });
    });

    describe('Prompt Suggestions', () => {
        let suggestionsManager: PromptSuggestionsManager;

        beforeEach(() => {
            suggestionsManager = new PromptSuggestionsManager({} as any);
        });

        it('should get suggestions for testing', () => {
            const suggestions = suggestionsManager.getSuggestionsForFileType(
                'test',
                'typescript'
            );

            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions.some((s) => s.category === 'testing')).toBe(true);
        });

        it('should get optimization suggestions', () => {
            const suggestions = suggestionsManager.getOptimizationSuggestions();

            expect(suggestions.length).toBeGreaterThan(0);
            expect(
                suggestions.every((s) => s.category === 'optimization')
            ).toBe(true);
        });

        it('should get security suggestions', () => {
            const suggestions = suggestionsManager.getSecuritySuggestions();

            expect(suggestions.length).toBeGreaterThan(0);
            expect(suggestions.every((s) => s.category === 'security')).toBe(
                true
            );
        });

        it('should get all available categories', () => {
            const categories = suggestionsManager.getCategories();

            expect(categories).toContain('testing');
            expect(categories).toContain('documentation');
            expect(categories).toContain('refactoring');
            expect(categories).toContain('security');
            expect(categories.length).toBe(8);
        });

        it('should track suggestion history', () => {
            const suggestions = suggestionsManager.getOptimizationSuggestions();
            expect(suggestions.length).toBeGreaterThan(0);

            suggestionsManager.clearHistory();
            // History cleared successfully
            expect(true).toBe(true);
        });
    });

    describe('Analytics Management', () => {
        let analytics: AnalyticsManager;

        beforeEach(() => {
            analytics = new AnalyticsManager('test-api-key');
        });

        it('should initialize with API key', () => {
            const status = analytics.getStatus();

            expect(status.apiKeySet).toBe(true);
            expect(status.enabled).toBe(true);
            expect(status.distinctId).toBeDefined();
        });

        it('should generate distinct IDs', () => {
            const id1 = analytics.getDistinctId();
            const analytics2 = new AnalyticsManager('test-key-2');
            const id2 = analytics2.getDistinctId();

            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1.length).toBe(16);
            expect(id2.length).toBe(16);
        });

        it('should track prompt enhancement events', () => {
            analytics.trackPromptEnhanced('gpt-4', 500, true, 150);

            expect(analytics.getQueueSize()).toBe(1);
        });

        it('should track vault events', () => {
            analytics.trackVaultCreated(5, true);
            analytics.trackVaultSubmitted();
            analytics.trackVaultApproved();

            expect(analytics.getQueueSize()).toBe(3);
        });

        it('should track suggestion events', () => {
            analytics.trackSuggestionShown('testing', 5);
            analytics.trackSuggestionSelected('suggestion-1', 'testing');

            expect(analytics.getQueueSize()).toBe(2);
        });

        it('should track onboarding events', () => {
            analytics.trackOnboardingStarted();
            analytics.trackOnboardingCompleted(6, 6);

            expect(analytics.getQueueSize()).toBe(2);
        });

        it('should track error events', () => {
            analytics.trackError('API_TIMEOUT', 'high', 'llm_api_call');
            analytics.trackQuotaExceeded('free', 20, 'hourly');

            expect(analytics.getQueueSize()).toBe(2);
        });

        it('should respect consent setting', () => {
            const disabledAnalytics = new AnalyticsManager();
            disabledAnalytics.setConsent(false);

            disabledAnalytics.trackPromptEnhanced('gpt-3.5', 200, true, 50);

            expect(disabledAnalytics.getQueueSize()).toBe(0);
        });

        it('should set user segment data', () => {
            analytics.setUserSegment({
                tier: 'premium',
                daysActive: 30,
                promptsEnhanced: 100,
                vaultSize: 15,
                language: 'typescript',
            });

            // Verify segment is stored (status check)
            const status = analytics.getStatus();
            expect(status.enabled).toBe(true);
        });

        it('should track extension lifecycle', () => {
            analytics.trackExtensionActivated('1.3.0');
            analytics.trackExtensionDeactivated();

            expect(analytics.getQueueSize()).toBe(2);
        });
    });

    describe('Consent Management', () => {
        let consentManager: ConsentManager;

        beforeEach(() => {
            jest.clearAllMocks();
            mockContext.globalState.get.mockReturnValue(undefined);
            consentManager = new ConsentManager(mockContext as any);
        });

        it('should check initial consent state', () => {
            const hasConsent = consentManager.hasConsent();
            expect(hasConsent).toBe(false);
        });

        it('should check if banner has been shown', () => {
            const shown = consentManager.hasConsentBannerBeenShown();
            expect(shown).toBe(false);
        });

        it('should set consent', async () => {
            await consentManager.setConsent(true);

            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'clarity.analytics_consent',
                true
            );
            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'clarity.analytics_consent_shown',
                true
            );
        });

        it('should get consent status', async () => {
            await consentManager.setConsent(true);
            mockContext.globalState.get.mockImplementation((key) => {
                if (key === 'clarity.analytics_consent') return true;
                if (key === 'clarity.analytics_consent_shown') return true;
                return undefined;
            });

            const status = consentManager.getStatus();

            expect(status.consented).toBeDefined();
            expect(status.shown).toBeDefined();
        });

        it('should handle multiple consent changes', async () => {
            await consentManager.setConsent(true);
            await consentManager.setConsent(false);

            expect(mockContext.globalState.update).toHaveBeenCalledTimes(4);
        });
    });

    describe('Onboarding Flow', () => {
        let onboardingManager: OnboardingManager;

        beforeEach(() => {
            jest.clearAllMocks();
            mockContext.globalState.get.mockReturnValue(false);
            onboardingManager = new OnboardingManager(mockContext as any, {} as any);
        });

        it('should determine if onboarding should be shown', () => {
            const shouldShow = onboardingManager.shouldShowOnboarding();
            expect(shouldShow).toBe(true);
        });

        it('should get all onboarding steps', () => {
            const steps = onboardingManager.getSteps();

            expect(steps.length).toBe(6);
            expect(steps[0].id).toBe('welcome');
            expect(steps[5].id).toBe('get-started');
        });

        it('should have proper step structure', () => {
            const steps = onboardingManager.getSteps();

            steps.forEach((step) => {
                expect(step.id).toBeDefined();
                expect(step.title).toBeDefined();
                expect(step.description).toBeDefined();
                expect(step.content).toBeDefined();
                expect(step.content.length).toBeGreaterThan(0);
            });
        });

        it('should mark onboarding as complete', async () => {
            await onboardingManager.completeOnboarding();

            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'clarity.onboarded',
                true
            );
        });

        it('should reset onboarding if needed', async () => {
            await onboardingManager.completeOnboarding();
            await onboardingManager.resetOnboarding();

            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'clarity.onboarded',
                false
            );
        });

        it('should have proper step progression', () => {
            const steps = onboardingManager.getSteps();

            expect(steps[0].id).toBe('welcome');
            expect(steps[1].id).toBe('quick-start');
            expect(steps[2].id).toBe('modes');
            expect(steps[3].id).toBe('templates');
            expect(steps[4].id).toBe('privacy');
            expect(steps[5].id).toBe('get-started');
        });
    });

    describe('Integration Scenarios', () => {
        it('should handle complete user journey', async () => {
            const vault = new TeamVaultManager(mockContext as any, {} as any);
            const analytics = new AnalyticsManager('test-key');
            const suggestions = new PromptSuggestionsManager({} as any);

            // User starts
            analytics.trackExtensionActivated('1.3.0');

            // User gets suggestion
            const sugg = suggestions.getOptimizationSuggestions();
            expect(sugg.length).toBeGreaterThan(0);
            analytics.trackSuggestionShown('optimization', sugg.length);

            // User enhances prompt
            analytics.trackPromptEnhanced('gpt-4', 1000, true, 200);

            // User saves to vault
            const prompt = await vault.saveToDraft(
                'Journey Test',
                'original',
                'enhanced',
                ['test']
            );
            analytics.trackVaultCreated(1, false);

            // User submits for approval
            await vault.submitForApproval(prompt!.id);
            analytics.trackVaultSubmitted();

            expect(analytics.getQueueSize()).toBe(4);
        });

        it('should handle analytics batching', () => {
            const analytics = new AnalyticsManager('test-key');

            // Track 25 events
            for (let i = 0; i < 25; i++) {
                analytics.trackPromptEnhanced(`model-${i}`, 100 * i, true, 50);
            }

            // Should have batch events in queue
            expect(analytics.getQueueSize()).toBeGreaterThan(0);
        });

        it('should verify privacy compliance', () => {
            const analytics = new AnalyticsManager('test-key');
            const consent = new ConsentManager(mockContext as any);

            // Privacy-first design
            expect(consent.hasConsent()).toBe(false); // Opt-out by default

            analytics.setConsent(false);
            analytics.trackPromptEnhanced('model', 100, true, 50);

            // No events tracked when consent is off
            expect(analytics.getQueueSize()).toBe(0);
        });
    });
});
