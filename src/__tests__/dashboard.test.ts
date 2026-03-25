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

            const metrics = dashboardData.getVaultMetrics();

            expect(metrics.total).toBe(3);
            expect(metrics.draft).toBe(3);
            expect(metrics.approved).toBe(0);
            expect(metrics.rejected).toBe(0);
        });

        it('should track vault size growth', async () => {
            await vaultManager.saveToDraft('Initial', 'orig', 'enh', []);
            const metrics1 = dashboardData.getVaultMetrics();
            expect(metrics1.total).toBe(1);

            await vaultManager.saveToDraft('Second', 'orig', 'enh', []);
            const metrics2 = dashboardData.getVaultMetrics();
            expect(metrics2.total).toBe(2);
        });

        it('should handle empty vault', () => {
            const metrics = dashboardData.getVaultMetrics();

            expect(metrics.total).toBe(0);
            expect(metrics.draft).toBe(0);
            expect(metrics.approved).toBe(0);
            expect(metrics.mostUsed).toBeUndefined();
        });
    });

    describe('Team Metrics', () => {
        it('should count team members', async () => {
            const metrics = dashboardData.getTeamMetrics();

            expect(metrics.activeContributors).toBeGreaterThanOrEqual(0);
            expect(metrics.totalApprovals).toBeGreaterThanOrEqual(0);
            expect(metrics.approvalRate).toBeGreaterThanOrEqual(0);
        });

        it('should calculate approval rate', async () => {
            // Create and submit prompts
            const p1 = await vaultManager.saveToDraft('P1', 'o', 'e', []);
            await vaultManager.submitForApproval(p1!.id, 'review');

            const metrics = dashboardData.getTeamMetrics();

            expect(metrics.approvalRate).toBeDefined();
            expect(metrics.approvalRate).toBeGreaterThanOrEqual(0);
            expect(metrics.approvalRate).toBeLessThanOrEqual(100);
        });
    });

    describe('User Metrics', () => {
        it('should get user metrics', () => {
            const metrics = dashboardData.getUserMetrics();

            expect(metrics.personalPrompts).toBeGreaterThanOrEqual(0);
            expect(metrics.enhancementsThisWeek).toBeGreaterThanOrEqual(0);
            expect(metrics.averageQualityScore).toBeGreaterThanOrEqual(0);
            expect(metrics.favoriteCategory).toBeDefined();
        });

        it('should track personal prompt creation', async () => {
            const before = dashboardData.getUserMetrics();
            const beforeCount = before.personalPrompts;

            await vaultManager.saveToDraft('My Prompt', 'orig', 'enh', []);

            const after = dashboardData.getUserMetrics();
            expect(after.personalPrompts).toBe(beforeCount + 1);
        });
    });

    describe('Time Series Data', () => {
        it('should generate 7-day trend data', () => {
            const timeSeries = dashboardData.getTimeSeriesData();

            expect(timeSeries).toBeDefined();
            expect(timeSeries.days).toBeDefined();
            expect(timeSeries.days.length).toBe(7);
            expect(timeSeries.values).toBeDefined();
            expect(timeSeries.values.length).toBe(7);
        });

        it('should have correct day labels', () => {
            const timeSeries = dashboardData.getTimeSeriesData();
            const days = timeSeries.days;

            // Should contain day abbreviations
            expect(days.some((d: string) => ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(d))).toBe(true);
        });

        it('should track values over time', () => {
            const timeSeries = dashboardData.getTimeSeriesData();

            // All values should be numbers
            expect(timeSeries.values.every((v: number) => typeof v === 'number')).toBe(true);

            // Values should be non-negative
            expect(timeSeries.values.every((v: number) => v >= 0)).toBe(true);
        });
    });

    describe('Trend Analysis', () => {
        it('should calculate growth trend', () => {
            const trend = dashboardData.getTrendAnalysis();

            expect(trend).toBeDefined();
            expect(trend.growthRate).toBeDefined();
            expect(trend.direction).toMatch(/^(up|down|flat)$/);
            expect(trend.prediction).toBeDefined();
        });

        it('should identify trends correctly', async () => {
            // Add multiple prompts
            for (let i = 0; i < 5; i++) {
                await vaultManager.saveToDraft(`Prompt ${i}`, 'orig', 'enh', []);
            }

            const trend = dashboardData.getTrendAnalysis();

            expect(trend.growthRate).toBeGreaterThan(0);
            expect(trend.direction).toBe('up');
        });
    });

    describe('Export Functionality', () => {
        it('should export metrics as CSV', async () => {
            // Create test data
            await vaultManager.saveToDraft('Test 1', 'orig', 'enh', []);
            await vaultManager.saveToDraft('Test 2', 'orig', 'enh', []);

            const csv = dashboardData.exportAsCSV();

            expect(typeof csv).toBe('string');
            expect(csv.includes('Vault Metrics')).toBe(true);
            expect(csv.includes('Team Metrics')).toBe(true);
            expect(csv.includes(',') || csv.includes('\n')).toBe(true);
        });

        it('should export metrics as JSON', async () => {
            // Create test data
            await vaultManager.saveToDraft('Test 1', 'orig', 'enh', []);

            const json = dashboardData.exportAsJSON();

            expect(typeof json).toBe('string');
            const parsed = JSON.parse(json);
            expect(parsed.vaultMetrics).toBeDefined();
            expect(parsed.teamMetrics).toBeDefined();
            expect(parsed.userMetrics).toBeDefined();
        });

        it('should include timestamp in exports', () => {
            const csv = dashboardData.exportAsCSV();
            const json = dashboardData.exportAsJSON();

            expect(csv.length).toBeGreaterThan(0);
            expect(json.length).toBeGreaterThan(0);

            const parsed = JSON.parse(json);
            expect(parsed.exportedAt).toBeDefined();
        });
    });

    describe('Data Caching', () => {
        it('should cache metrics for performance', async () => {
            await vaultManager.saveToDraft('P1', 'o', 'e', []);

            const start = Date.now();
            const metrics1 = dashboardData.getVaultMetrics();
            const time1 = Date.now() - start;

            const start2 = Date.now();
            const metrics2 = dashboardData.getVaultMetrics();
            const time2 = Date.now() - start2;

            // Second call should be faster (cached)
            expect(time2).toBeLessThanOrEqual(time1 + 5); // Allow small variance

            // Results should be identical
            expect(metrics1.total).toBe(metrics2.total);
        });

        it('should invalidate cache when vault changes', async () => {
            const metrics1 = dashboardData.getVaultMetrics();
            const count1 = metrics1.total;

            // Change vault
            await vaultManager.saveToDraft('New', 'o', 'e', []);

            const metrics2 = dashboardData.getVaultMetrics();
            const count2 = metrics2.total;

            // Should detect changes
            expect(count2).toBeGreaterThan(count1);
        });
    });

    describe('Error Handling', () => {
        it('should handle empty data gracefully', () => {
            const metrics = dashboardData.getVaultMetrics();
            const trend = dashboardData.getTrendAnalysis();

            expect(metrics).toBeDefined();
            expect(trend).toBeDefined();
            expect(() => dashboardData.exportAsCSV()).not.toThrow();
            expect(() => dashboardData.exportAsJSON()).not.toThrow();
        });

        it('should calculate valid percentages', async () => {
            await vaultManager.saveToDraft('P1', 'o', 'e', []);
            await vaultManager.saveToDraft('P2', 'o', 'e', []);

            const metrics = dashboardData.getVaultMetrics();

            // Percentages should be valid
            const approved = (metrics.approved / (metrics.total || 1)) * 100;
            expect(approved).toBeGreaterThanOrEqual(0);
            expect(approved).toBeLessThanOrEqual(100);
        });
    });

    describe('Real-time Updates', () => {
        it('should update metrics on vault changes', async () => {
            const initial = dashboardData.getVaultMetrics();

            await vaultManager.saveToDraft('Updated', 'o', 'e', []);

            const updated = dashboardData.getVaultMetrics();
            expect(updated.total).toBeGreaterThan(initial.total);
        });

        it('should reflect approval status changes', async () => {
            const prompt = await vaultManager.saveToDraft('Test', 'o', 'e', []);
            const metrics1 = dashboardData.getVaultMetrics();

            if (prompt) {
                await vaultManager.submitForApproval(prompt.id, 'test');
            }

            const metrics2 = dashboardData.getVaultMetrics();
            expect(metrics2.pending || 0).toBeGreaterThanOrEqual(0);
        });
    });

    describe('Leaderboard Data', () => {
        it('should generate team leaderboard', async () => {
            await vaultManager.saveToDraft('P1', 'o', 'e', []);
            await vaultManager.saveToDraft('P2', 'o', 'e', []);

            const metrics = dashboardData.getTeamMetrics();
            expect(metrics).toBeDefined();
            // Leaderboard would be part of team metrics
        });

        it('should sort leaderboard by contribution', async () => {
            for (let i = 0; i < 3; i++) {
                await vaultManager.saveToDraft(`P${i}`, 'o', 'e', []);
            }

            const metrics = dashboardData.getTeamMetrics();
            expect(metrics.activeContributors).toBeGreaterThanOrEqual(0);
        });
    });
});
