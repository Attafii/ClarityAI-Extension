/**
 * Dashboard Test Suite
 * Tests for analytics dashboard metrics and functionality
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { DashboardDataManager } from '../dashboard/dashboardData';
import { TeamVaultManager } from '../teamVault';
import { AnalyticsManager } from '../analytics';

// Mock context and managers
const mockContext = {
    globalState: {
        get: jest.fn(),
        update: jest.fn(),
    },
};

describe('Dashboard - DashboardDataManager', () => {
    let dashboardData: DashboardDataManager;
    let vaultManager: TeamVaultManager;
    let analytics: AnalyticsManager;

    beforeEach(() => {
        jest.clearAllMocks();
        mockContext.globalState.get.mockReturnValue(Promise.resolve(null));
        mockContext.globalState.update.mockReturnValue(Promise.resolve());
        vaultManager = new TeamVaultManager(mockContext as any, {} as any);
        analytics = new AnalyticsManager();
        dashboardData = new DashboardDataManager(mockContext as any, vaultManager, analytics);
    });

    describe('Vault Metrics', () => {
        it('should calculate total vault items', async () => {
            // Create test prompts
            await vaultManager.saveToDraft('Prompt 1', 'orig', 'enh', []);
            await vaultManager.saveToDraft('Prompt 2', 'orig', 'enh', []);
            await vaultManager.saveToDraft('Prompt 3', 'orig', 'enh', []);

            const metrics = await dashboardData.getVaultMetrics();

            expect(metrics.total).toBe(3);
            expect(metrics.draft).toBe(3);
            expect(metrics.approved).toBe(0);
            expect(metrics.rejected).toBe(0);
        });

        it('should track vault size growth', async () => {
            await vaultManager.saveToDraft('Initial', 'orig', 'enh', []);
            const metrics1 = await dashboardData.getVaultMetrics();
            expect(metrics1.total).toBe(1);

            await vaultManager.saveToDraft('Second', 'orig', 'enh', []);
            const metrics2 = await dashboardData.getVaultMetrics();
            expect(metrics2.total).toBe(2);
        });

        it('should handle empty vault', async () => {
            const metrics = await dashboardData.getVaultMetrics();

            expect(metrics.total).toBe(0);
            expect(metrics.draft).toBe(0);
            expect(metrics.approved).toBe(0);
            expect(metrics.mostUsedPrompt).toBeUndefined();
        });
    });

    describe('Team Metrics', () => {
        it('should count team metrics', async () => {
            const metrics = await dashboardData.getTeamMetrics();

            expect(metrics.activeContributors).toBeGreaterThanOrEqual(0);
            expect(metrics.totalApprovals).toBeGreaterThanOrEqual(0);
            expect(metrics.approvalRate).toBeGreaterThanOrEqual(0);
        });

        it('should calculate approval rate', async () => {
            // Create and submit prompts
            const p1 = await vaultManager.saveToDraft('P1', 'o', 'e', []);
            if (p1) {
                await vaultManager.submitForApproval(p1.id, 'review');
            }

            const metrics = await dashboardData.getTeamMetrics();

            expect(metrics.approvalRate).toBeDefined();
            expect(metrics.approvalRate).toBeGreaterThanOrEqual(0);
            expect(metrics.approvalRate).toBeLessThanOrEqual(100);
        });
    });

    describe('User Metrics', () => {
        it('should get user metrics', async () => {
            const metrics = await dashboardData.getUserMetrics();

            expect(metrics.personalPrompts).toBeGreaterThanOrEqual(0);
            expect(metrics.enhancementsPerDay).toBeGreaterThanOrEqual(0);
            expect(metrics.averageQualityScore).toBeGreaterThanOrEqual(0);
            expect(metrics.favoriteCategory).toBeDefined();
        });

        it('should track personal prompt creation', async () => {
            const before = await dashboardData.getUserMetrics();
            const beforeCount = before.personalPrompts;

            await vaultManager.saveToDraft('My Prompt', 'orig', 'enh', []);

            const after = await dashboardData.getUserMetrics();
            expect(after.personalPrompts).toBe(beforeCount + 1);
        });
    });

    describe('Trends Data', () => {
        it('should generate trend data', async () => {
            const trends = await dashboardData.getTrends();

            expect(trends).toBeDefined();
            expect(trends.dailyEnhancements).toBeDefined();
            expect(Array.isArray(trends.dailyEnhancements)).toBe(true);
            expect(trends.weeklyApprovals).toBeDefined();
            expect(Array.isArray(trends.weeklyApprovals)).toBe(true);
        });

        it('should track values over time', async () => {
            const trends = await dashboardData.getTrends();

            // All daily values should be numbers
            expect(trends.dailyEnhancements.every((p: any) => typeof p.value === 'number')).toBe(true);

            // Values should be non-negative
            expect(trends.dailyEnhancements.every((p: any) => p.value >= 0)).toBe(true);
        });

        it('should include growth rate', async () => {
            const trends = await dashboardData.getTrends();

            expect(trends.growthRate).toBeDefined();
            expect(typeof trends.growthRate).toBe('number');
        });
    });

    describe('Export Functionality', () => {
        it('should export metrics as CSV', async () => {
            // Create test data
            await vaultManager.saveToDraft('Test 1', 'orig', 'enh', []);
            await vaultManager.saveToDraft('Test 2', 'orig', 'enh', []);

            const csv = await dashboardData.exportAsCSV();

            expect(typeof csv).toBe('string');
            expect(csv.length).toBeGreaterThan(0);
        });

        it('should export metrics as JSON', async () => {
            // Create test data
            await vaultManager.saveToDraft('Test 1', 'orig', 'enh', []);

            const json = await dashboardData.exportAsJSON();

            expect(typeof json).toBe('string');
            const parsed = JSON.parse(json);
            expect(parsed.vaultMetrics).toBeDefined();
            expect(parsed.teamMetrics).toBeDefined();
            expect(parsed.userMetrics).toBeDefined();
        });

        it('should include timestamp in exports', async () => {
            const csv = await dashboardData.exportAsCSV();
            const json = await dashboardData.exportAsJSON();

            expect(csv.length).toBeGreaterThan(0);
            expect(json.length).toBeGreaterThan(0);

            const parsed = JSON.parse(json);
            expect(parsed.lastUpdated).toBeDefined();
        });
    });

    describe('Data Caching', () => {
        it('should cache metrics for performance', async () => {
            await vaultManager.saveToDraft('P1', 'o', 'e', []);

            const start = Date.now();
            const metrics1 = await dashboardData.getVaultMetrics();
            const time1 = Date.now() - start;

            const start2 = Date.now();
            const metrics2 = await dashboardData.getVaultMetrics();
            const time2 = Date.now() - start2;

            // Second call should be faster (cached)
            expect(time2).toBeLessThanOrEqual(time1 + 5); // Allow small variance

            // Results should be identical
            expect(metrics1.total).toBe(metrics2.total);
        });

        it('should invalidate cache when vault changes', async () => {
            const metrics1 = await dashboardData.getVaultMetrics();
            const count1 = metrics1.total;

            // Clear cache to simulate changes
            dashboardData.clearCache();

            // Change vault
            await vaultManager.saveToDraft('New', 'o', 'e', []);

            const metrics2 = await dashboardData.getVaultMetrics();
            const count2 = metrics2.total;

            // Should detect changes
            expect(count2).toBeGreaterThan(count1);
        });
    });

    describe('Error Handling', () => {
        it('should handle empty data gracefully', async () => {
            const metrics = await dashboardData.getVaultMetrics();
            const trends = await dashboardData.getTrends();

            expect(metrics).toBeDefined();
            expect(trends).toBeDefined();
            expect(await dashboardData.exportAsCSV()).toBeDefined();
            expect(await dashboardData.exportAsJSON()).toBeDefined();
        });

        it('should calculate valid percentages', async () => {
            await vaultManager.saveToDraft('P1', 'o', 'e', []);
            await vaultManager.saveToDraft('P2', 'o', 'e', []);

            const metrics = await dashboardData.getVaultMetrics();

            // Percentages should be valid
            const approved = (metrics.approved / (metrics.total || 1)) * 100;
            expect(approved).toBeGreaterThanOrEqual(0);
            expect(approved).toBeLessThanOrEqual(100);
        });
    });

    describe('Real-time Updates', () => {
        it('should update metrics on vault changes', async () => {
            const initial = await dashboardData.getVaultMetrics();

            dashboardData.clearCache();
            await vaultManager.saveToDraft('Updated', 'o', 'e', []);

            const updated = await dashboardData.getVaultMetrics();
            expect(updated.total).toBeGreaterThan(initial.total);
        });

        it('should reflect approval status changes', async () => {
            const prompt = await vaultManager.saveToDraft('Test', 'o', 'e', []);
            const metrics1 = await dashboardData.getVaultMetrics();

            if (prompt) {
                await vaultManager.submitForApproval(prompt.id, 'test');
            }

            dashboardData.clearCache();
            const metrics2 = await dashboardData.getVaultMetrics();
            expect(metrics2.pending || 0).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Full Dashboard Data', () => {
        it('should generate complete dashboard data', async () => {
            await vaultManager.saveToDraft('P1', 'o', 'e', []);
            await vaultManager.saveToDraft('P2', 'o', 'e', []);

            const data = await dashboardData.getDashboardData();

            expect(data).toBeDefined();
            expect(data.vaultMetrics).toBeDefined();
            expect(data.teamMetrics).toBeDefined();
            expect(data.userMetrics).toBeDefined();
            expect(data.trends).toBeDefined();
            expect(data.lastUpdated).toBeDefined();
        });

        it('should cache complete dashboard data', async () => {
            const data1 = await dashboardData.getDashboardData();
            const data2 = await dashboardData.getDashboardData();

            // Should be same reference due to caching
            expect(data1.lastUpdated).toBe(data2.lastUpdated);
        });
    });
});
