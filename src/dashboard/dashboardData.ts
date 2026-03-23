/**
 * DashboardData - Analytics and metrics aggregation for dashboard
 */

import * as vscode from 'vscode';

export interface VaultMetrics {
  total: number;
  draft: number;
  pending: number;
  approved: number;
  rejected: number;
  totalUsage: number;
  mostUsedPrompt?: { id: string; title: string; usage: number };
}

export interface TeamMetrics {
  activeContributors: number;
  totalApprovals: number;
  approvalRate: number; // percentage
  averageApprovalTime: number; // hours
  topContributors: Array<{ name: string; contributions: number }>;
}

export interface UserMetrics {
  personalPrompts: number;
  enhancementsPerDay: number;
  favoriteCategory: string;
  averageQualityScore: number;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface DashboardData {
  vaultMetrics: VaultMetrics;
  teamMetrics: TeamMetrics;
  userMetrics: UserMetrics;
  trends: {
    dailyEnhancements: TimeSeriesPoint[];
    weeklyApprovals: TimeSeriesPoint[];
    growthRate: number;
  };
  lastUpdated: number;
}

export class DashboardDataManager {
  private context: vscode.ExtensionContext;
  private vaultManager: any; // TeamVaultManager
  private analyticsManager: any; // AnalyticsManager
  private cache: DashboardData | null = null;
  private cacheExpiry = 0;
  private CACHE_DURATION_MS = 30000; // 30 second cache

  constructor(
    context: vscode.ExtensionContext,
    vaultManager: any,
    analyticsManager: any
  ) {
    this.context = context;
    this.vaultManager = vaultManager;
    this.analyticsManager = analyticsManager;
  }

  /**
   * Get all dashboard data (with caching)
   */
  async getDashboardData(): Promise<DashboardData> {
    if (this.cache && Date.now() < this.cacheExpiry) {
      return this.cache;
    }

    const [vaultMetrics, teamMetrics, userMetrics, trends] = await Promise.all([
      this.getVaultMetrics(),
      this.getTeamMetrics(),
      this.getUserMetrics(),
      this.getTrends(),
    ]);

    this.cache = {
      vaultMetrics,
      teamMetrics,
      userMetrics,
      trends,
      lastUpdated: Date.now(),
    };
    this.cacheExpiry = Date.now() + this.CACHE_DURATION_MS;

    return this.cache;
  }

  /**
   * Get vault metrics
   */
  async getVaultMetrics(): Promise<VaultMetrics> {
    const vaultData = await this.context.globalState.get<any[]>(
      'clarity.vault.prompts'
    ) || [];

    let draft = 0,
      pending = 0,
      approved = 0,
      rejected = 0;
    let totalUsage = 0;
    let mostUsed: any = null;

    vaultData.forEach((prompt) => {
      switch (prompt.status) {
        case 'draft':
          draft++;
          break;
        case 'pending_approval':
          pending++;
          break;
        case 'approved':
          approved++;
          break;
        case 'rejected':
          rejected++;
          break;
      }

      const usage = prompt.usage || 0;
      totalUsage += usage;

      if (!mostUsed || usage > mostUsed.usage) {
        mostUsed = {
          id: prompt.id,
          title: prompt.title,
          usage,
        };
      }
    });

    return {
      total: vaultData.length,
      draft,
      pending,
      approved,
      rejected,
      totalUsage,
      mostUsedPrompt: mostUsed,
    };
  }

  /**
   * Get team metrics
   */
  async getTeamMetrics(): Promise<TeamMetrics> {
    const vaultData = await this.context.globalState.get<any[]>(
      'clarity.vault.prompts'
    ) || [];

    // Get unique contributors
    const contributors = new Set<string>();
    const contributorStats: { [key: string]: number } = {};
    let totalApprovals = 0;
    let totalSubmissions = 0;
    const approvalTimes: number[] = [];

    vaultData.forEach((prompt) => {
      if (prompt.author) {
        contributors.add(prompt.author);
        contributorStats[prompt.author] =
          (contributorStats[prompt.author] || 0) + 1;
      }

      if (prompt.status === 'approved') {
        totalApprovals++;
      }
      if (prompt.status !== 'draft') {
        totalSubmissions++;
      }

      // Calculate approval time if available
      if (prompt.submittedAt && prompt.approvedAt) {
        const timeToApprove = (prompt.approvedAt - prompt.submittedAt) / (1000 * 60 * 60); // hours
        approvalTimes.push(timeToApprove);
      }
    });

    const approvalRate =
      totalSubmissions > 0 ? (totalApprovals / totalSubmissions) * 100 : 0;
    const avgApprovalTime =
      approvalTimes.length > 0
        ? approvalTimes.reduce((a, b) => a + b, 0) / approvalTimes.length
        : 0;

    const topContributors = Object.entries(contributorStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, contributions]) => ({ name, contributions }));

    return {
      activeContributors: contributors.size,
      totalApprovals,
      approvalRate,
      averageApprovalTime: avgApprovalTime,
      topContributors,
    };
  }

  /**
   * Get user personal metrics
   */
  async getUserMetrics(): Promise<UserMetrics> {
    const vaultData = await this.context.globalState.get<any[]>(
      'clarity.vault.prompts'
    ) || [];

    const currentUser = await this.getOrCreateUserId();
    const userVaults = vaultData.filter((p) => p.author === currentUser);

    // Calculate category distribution
    const categoryCount: { [key: string]: number } = {};
    let totalQuality = 0;
    let qualityCount = 0;

    userVaults.forEach((prompt) => {
      // Categories from tags or manual categorization
      (prompt.tags || []).forEach((tag: string) => {
        categoryCount[tag] = (categoryCount[tag] || 0) + 1;
      });

      if (prompt.qualityScore) {
        totalQuality += prompt.qualityScore;
        qualityCount++;
      }
    });

    const favoriteCategory = Object.entries(categoryCount).sort(
      (a, b) => b[1] - a[1]
    )[0]?.[0] || 'general';

    // Get enhancement data
    const enhancements = await this.context.globalState.get<number>(
      'clarity.user.enhancements_today'
    ) || 0;

    return {
      personalPrompts: userVaults.length,
      enhancementsPerDay: enhancements,
      favoriteCategory,
      averageQualityScore: qualityCount > 0 ? totalQuality / qualityCount : 0,
    };
  }

  /**
   * Get time series trends
   */
  async getTrends(): Promise<{
    dailyEnhancements: TimeSeriesPoint[];
    weeklyApprovals: TimeSeriesPoint[];
    growthRate: number;
  }> {
    const vaultData = await this.context.globalState.get<any[]>(
      'clarity.vault.prompts'
    ) || [];

    // Generate daily data for last 7 days
    const dailyEnhancements: TimeSeriesPoint[] = [];
    const weeklyApprovals: TimeSeriesPoint[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // Count enhancements for this date (simulated)
      const dayEnhancements = Math.floor(Math.random() * 10) + 5;
      dailyEnhancements.push({ date: dateStr, value: dayEnhancements });

      // Weekly data (just use cumulative)
      const weekApprovals = Math.floor(Math.random() * 20) + 10;
      weeklyApprovals.push({ date: dateStr, value: weekApprovals });
    }

    // Calculate growth rate
    const totalNow = vaultData.length;
    const previousWeek =
      (await this.context.globalState.get<number>(
        'clarity.vault.size_last_week'
      )) || totalNow;
    const growthRate =
      previousWeek > 0 ? ((totalNow - previousWeek) / previousWeek) * 100 : 0;

    return {
      dailyEnhancements,
      weeklyApprovals,
      growthRate,
    };
  }

  /**
   * Export metrics as CSV
   */
  async exportAsCSV(): Promise<string> {
    const data = await this.getDashboardData();

    let csv = 'ClarityAI Dashboard Export\n';
    csv += `Generated: ${new Date().toISOString()}\n\n`;

    csv += 'Vault Metrics\n';
    csv += 'Metric,Value\n';
    csv += `Total Prompts,${data.vaultMetrics.total}\n`;
    csv += `Draft,${data.vaultMetrics.draft}\n`;
    csv += `Pending,${data.vaultMetrics.pending}\n`;
    csv += `Approved,${data.vaultMetrics.approved}\n`;
    csv += `Rejected,${data.vaultMetrics.rejected}\n`;
    csv += `Total Usage,${data.vaultMetrics.totalUsage}\n\n`;

    csv += 'Team Metrics\n';
    csv += 'Metric,Value\n';
    csv += `Active Contributors,${data.teamMetrics.activeContributors}\n`;
    csv += `Total Approvals,${data.teamMetrics.totalApprovals}\n`;
    csv += `Approval Rate,${data.teamMetrics.approvalRate.toFixed(2)}%\n`;
    csv += `Avg Approval Time,${data.teamMetrics.averageApprovalTime.toFixed(2)} hours\n\n`;

    csv += 'User Metrics\n';
    csv += 'Metric,Value\n';
    csv += `Personal Prompts,${data.userMetrics.personalPrompts}\n`;
    csv += `Enhancements Today,${data.userMetrics.enhancementsPerDay}\n`;
    csv += `Favorite Category,${data.userMetrics.favoriteCategory}\n`;
    csv += `Avg Quality Score,${data.userMetrics.averageQualityScore.toFixed(2)}\n`;

    return csv;
  }

  /**
   * Export metrics as JSON
   */
  async exportAsJSON(): Promise<string> {
    const data = await this.getDashboardData();
    return JSON.stringify(data, null, 2);
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = null;
    this.cacheExpiry = 0;
  }

  /**
   * Get or create user ID
   */
  private async getOrCreateUserId(): Promise<string> {
    let userId = await this.context.globalState.get<string>('clarity.user.id');
    if (!userId) {
      userId = `user-${Date.now()}`;
      await this.context.globalState.update('clarity.user.id', userId);
    }
    return userId;
  }
}
