/**
 * DashboardProvider - Webview provider for analytics dashboard
 */

import * as vscode from 'vscode';
import { DashboardDataManager } from './dashboardData';

export class DashboardProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'clarity-dashboard';
  private webviewView: vscode.WebviewView | undefined;
  private dataManager: DashboardDataManager;
  private refreshInterval: NodeJS.Timeout | null = null;

  constructor(
    private context: vscode.ExtensionContext,
    vaultManager: any,
    analyticsManager: any
  ) {
    this.dataManager = new DashboardDataManager(
      context,
      vaultManager,
      analyticsManager
    );
  }

  /**
   * Resolve webview view
   */
  async resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    token: vscode.CancellationToken
  ): Promise<void> {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.context.extensionUri],
    };

    // Set initial HTML
    webviewView.webview.html = await this.getHtmlContent();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message) => {
      this.handleMessage(message);
    });

    // Start auto-refresh
    this.startAutoRefresh();
  }

  /**
   * Handle messages from webview
   */
  private async handleMessage(message: any): Promise<void> {
    switch (message.command) {
      case 'refresh':
        await this.updateDashboard();
        break;
      case 'exportCSV':
        await this.handleExportCSV();
        break;
      case 'exportJSON':
        await this.handleExportJSON();
        break;
      case 'openSettings':
        vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'clarity'
        );
        break;
    }
  }

  /**
   * Update dashboard with latest data
   */
  async updateDashboard(): Promise<void> {
    if (!this.webviewView) return;

    try {
      this.dataManager.clearCache(); // Force refresh
      const data = await this.dataManager.getDashboardData();

      this.webviewView.webview.postMessage({
        command: 'updateDashboard',
        data,
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to update dashboard: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Start auto-refresh timer
   */
  private startAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    const config = vscode.workspace.getConfiguration('clarity.dashboard');
    const autoRefresh = config.get<boolean>('autoRefresh', true);
    const interval = config.get<number>('refreshInterval', 30000); // 30 sec default

    if (autoRefresh) {
      this.refreshInterval = setInterval(() => {
        this.updateDashboard();
      }, interval);
    }
  }

  /**
   * Handle export CSV request
   */
  private async handleExportCSV(): Promise<void> {
    try {
      const csv = await this.dataManager.exportAsCSV();
      const fileName = `clarity-dashboard-${new Date().toISOString().split('T')[0]}.csv`;

      // Save to user's downloads or home directory
      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(
          require('os').homedir() + `/${fileName}`
        ),
        filters: { 'CSV Files': ['csv'] },
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(
          uri,
          Buffer.from(csv, 'utf8')
        );
        vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Handle export JSON request
   */
  private async handleExportJSON(): Promise<void> {
    try {
      const json = await this.dataManager.exportAsJSON();
      const fileName = `clarity-dashboard-${new Date().toISOString().split('T')[0]}.json`;

      const uri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(
          require('os').homedir() + `/${fileName}`
        ),
        filters: { 'JSON Files': ['json'] },
      });

      if (uri) {
        await vscode.workspace.fs.writeFile(
          uri,
          Buffer.from(json, 'utf8')
        );
        vscode.window.showInformationMessage(`Exported to ${uri.fsPath}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get HTML content for webview
   */
  private async getHtmlContent(): Promise<string> {
    try {
      const data = await this.dataManager.getDashboardData();
      return this.generateHTML(data);
    } catch (error) {
      return `
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
              .error { color: var(--vscode-errorForeground); }
            </style>
          </head>
          <body>
            <h2>Dashboard Loading Error</h2>
            <p class="error">Failed to load dashboard data. Please try again.</p>
            <button onclick="location.reload()">Retry</button>
          </body>
        </html>
      `;
    }
  }

  /**
   * Generate HTML for dashboard
   */
  private generateHTML(data: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 20px;
            font-size: 13px;
            line-height: 1.6;
          }

          .dashboard { display: grid; gap: 24px; }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-bottom: 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
          }

          h1 { 
            font-size: 20px; 
            font-weight: 600;
            letter-spacing: -0.02em;
          }

          .controls { display: flex; gap: 8px; }

          button {
            padding: 6px 14px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
            transition: all 0.2s ease;
          }

          button:hover { 
            background: var(--vscode-button-hoverBackground);
            transform: translateY(-1px);
          }

          .section {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 8px;
            padding: 20px;
            transition: border-color 0.2s ease;
          }

          .section:hover {
            border-color: var(--vscode-focusBorder);
          }

          .section-title {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 16px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 16px;
            margin-bottom: 16px;
          }

          .metric-card {
            background: var(--vscode-editor-background);
            padding: 16px;
            border-radius: 6px;
            border: 1px solid var(--vscode-widget-border);
            transition: all 0.2s ease;
          }

          .metric-card:hover {
            border-color: var(--vscode-focusBorder);
            transform: translateY(-2px);
          }

          .metric-value {
            font-size: 28px;
            font-weight: 600;
            color: var(--vscode-foreground);
            margin: 8px 0;
            line-height: 1;
          }

          .metric-label {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          .chart-placeholder {
            background: var(--vscode-editor-background);
            padding: 32px;
            text-align: center;
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            color: var(--vscode-descriptionForeground);
            min-height: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
          }

          .list {
            list-style: none;
          }

          .list-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid var(--vscode-widget-border);
          }

          .list-item:last-child {
            border-bottom: none;
          }

          .list-item-label { 
            color: var(--vscode-foreground);
            font-size: 13px;
          }
          
          .list-item-value { 
            font-weight: 600;
            color: var(--vscode-foreground);
            font-size: 13px;
          }

          .status-badge {
            display: inline-block;
            padding: 3px 10px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.3px;
          }

          .status-approved { 
            background: var(--vscode-testing-iconPassed); 
            color: var(--vscode-editor-background);
          }
          
          .status-pending { 
            background: var(--vscode-testing-iconQueued); 
            color: var(--vscode-editor-background);
          }
          
          .status-draft { 
            background: var(--vscode-descriptionForeground);
            color: var(--vscode-editor-background);
          }

          .footer {
            text-align: center;
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-top: 8px;
            padding-top: 16px;
            border-top: 1px solid var(--vscode-widget-border);
          }

          .highlight {
            margin-top: 12px;
            padding: 12px;
            background: var(--vscode-editor-background);
            border-left: 3px solid var(--vscode-button-background);
            border-radius: 4px;
          }

          .highlight-title {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 4px;
          }

          .highlight-value {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
          }
        </style>
      </head>
      <body>
        <div class="dashboard">
          <div class="header">
            <h1>Analytics Dashboard</h1>
            <div class="controls">
              <button onclick="refresh()">Refresh</button>
              <button onclick="exportCSV()">Export CSV</button>
              <button onclick="exportJSON()">Export JSON</button>
            </div>
          </div>

          <!-- Vault Metrics -->
          <div class="section">
            <div class="section-title">Vault Overview</div>
            <div class="metrics">
              <div class="metric-card">
                <div class="metric-label">Total Items</div>
                <div class="metric-value">${data.vaultMetrics.total}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Approved</div>
                <div class="metric-value">${data.vaultMetrics.approved}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Pending</div>
                <div class="metric-value">${data.vaultMetrics.pending}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Draft</div>
                <div class="metric-value">${data.vaultMetrics.draft}</div>
              </div>
            </div>
            ${data.vaultMetrics.mostUsedPrompt ? `
              <div class="highlight">
                <div class="highlight-title">Most Used Prompt</div>
                <div class="highlight-value">${data.vaultMetrics.mostUsedPrompt.title} (${data.vaultMetrics.mostUsedPrompt.usage}× used)</div>
              </div>
            ` : ''}
          </div>

          <!-- Team Metrics -->
          <div class="section">
            <div class="section-title">Team Activity</div>
            <div class="metrics">
              <div class="metric-card">
                <div class="metric-label">Contributors</div>
                <div class="metric-value">${data.teamMetrics.activeContributors}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Approvals</div>
                <div class="metric-value">${data.teamMetrics.totalApprovals}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">Approval Rate</div>
                <div class="metric-value">${data.teamMetrics.approvalRate.toFixed(1)}%</div>
              </div>
            </div>
            ${data.teamMetrics.topContributors.length > 0 ? `
              <div style="margin-top: 12px;">
                <div class="list">
                  ${data.teamMetrics.topContributors.map((c: any) => `
                    <div class="list-item">
                      <span class="list-item-label">${c.name}</span>
                      <span class="list-item-value">${c.contributions} contributions</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- User Metrics -->
          <div class="section">
            <div class="section-title">Your Statistics</div>
            <div class="list">
              <div class="list-item">
                <span class="list-item-label">Personal Prompts</span>
                <span class="list-item-value">${data.userMetrics.personalPrompts}</span>
              </div>
              <div class="list-item">
                <span class="list-item-label">Today's Enhancements</span>
                <span class="list-item-value">${data.userMetrics.enhancementsPerDay}</span>
              </div>
              <div class="list-item">
                <span class="list-item-label">Favorite Category</span>
                <span class="list-item-value">${data.userMetrics.favoriteCategory}</span>
              </div>
              <div class="list-item">
                <span class="list-item-label">Avg Quality Score</span>
                <span class="list-item-value">${data.userMetrics.averageQualityScore.toFixed(2)}/10</span>
              </div>
            </div>
          </div>

          <!-- Trends -->
          <div class="section">
            <div class="section-title">7-Day Trends</div>
            <div class="chart-placeholder">
              Growth Rate: ${data.trends.growthRate.toFixed(1)}% this week
            </div>
          </div>

          <div class="footer">
            Last updated: ${new Date(data.lastUpdated).toLocaleTimeString()}
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();

          function refresh() {
            vscode.postMessage({ command: 'refresh' });
          }

          function exportCSV() {
            vscode.postMessage({ command: 'exportCSV' });
          }

          function exportJSON() {
            vscode.postMessage({ command: 'exportJSON' });
          }

          window.addEventListener('message', (event) => {
            const message = event.data;
            if (message.command === 'updateDashboard') {
              location.reload();
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
