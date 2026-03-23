/**
 * Analytics Consent Banner
 * Shows consent dialog to users on first activation
 * Respects privacy-first design with opt-in by default
 */

import * as vscode from 'vscode';

export class ConsentManager {
    private context: vscode.ExtensionContext;
    private consentKey = 'clarity.analytics_consent';
    private consentShownKey = 'clarity.analytics_consent_shown';

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Check if user has given consent
     */
    hasConsent(): boolean {
        return this.context.globalState.get(this.consentKey) === true;
    }

    /**
     * Check if consent banner has been shown
     */
    hasConsentBannerBeenShown(): boolean {
        return this.context.globalState.get(this.consentShownKey) === true;
    }

    /**
     * Set consent
     */
    async setConsent(consented: boolean): Promise<void> {
        await this.context.globalState.update(this.consentKey, consented);
        await this.context.globalState.update(this.consentShownKey, true);
    }

    /**
     * Show consent banner
     */
    async showConsentBanner(): Promise<boolean | undefined> {
        // Don't show if already shown
        if (this.hasConsentBannerBeenShown()) {
            return undefined;
        }

        const response = await vscode.window.showInformationMessage(
            '📊 Help us improve ClarityAI with anonymous usage analytics',
            {
                modal: false,
                detail:
                    'ClarityAI collects anonymous analytics to understand how users interact with the extension. We do not collect:\n' +
                    '• Your code or prompts\n' +
                    '• Personal information\n' +
                    '• API keys or credentials\n' +
                    '• File paths or project details\n\n' +
                    'These metrics help us:\n' +
                    '• Fix bugs faster\n' +
                    '• Prioritize features\n' +
                    '• Improve performance\n\n' +
                    'You can change this setting anytime.',
            },
            'Enable Analytics',
            'Learn More',
            'Decline'
        );

        const consented = response === 'Enable Analytics';

        if (response === 'Learn More') {
            await vscode.env.openExternal(
                vscode.Uri.parse('https://clarity-ai.app/privacy')
            );
            // Show dialog again after user visits privacy page
            return this.showConsentBanner();
        }

        await this.setConsent(consented);
        return consented;
    }

    /**
     * Open analytics preferences dialog
     */
    async showAnalyticsPreferences(): Promise<void> {
        const items = [
            {
                label: '$(check) Analytics Enabled',
                description: 'Help us improve with usage data',
                action: 'enable',
            },
            {
                label: '$(close) Analytics Disabled',
                description: 'No usage data will be collected',
                action: 'disable',
            },
            {
                label: '$(link-external) Privacy Policy',
                description: 'Learn what data we collect',
                action: 'privacy',
            },
            {
                label: '$(info) About Analytics',
                description: 'Understand our data practices',
                action: 'about',
            },
        ];

        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Manage your analytics preferences',
        });

        if (!selected) {
            return;
        }

        switch (selected.action) {
            case 'enable':
                await this.setConsent(true);
                vscode.window.showInformationMessage(
                    '✅ Analytics enabled. Thank you for helping us improve!'
                );
                break;
            case 'disable':
                await this.setConsent(false);
                vscode.window.showInformationMessage(
                    '❌ Analytics disabled. You can change this anytime.'
                );
                break;
            case 'privacy':
                await vscode.env.openExternal(
                    vscode.Uri.parse('https://clarity-ai.app/privacy')
                );
                break;
            case 'about':
                vscode.window.showInformationMessage(
                    '📊 ClarityAI Analytics\n\n' +
                    'We use analytics to:\n' +
                    '• Track extension usage\n' +
                    '• Measure feature adoption\n' +
                    '• Identify bugs\n' +
                    '• Improve performance\n\n' +
                    'All data is:\n' +
                    '• Anonymized (no personal data)\n' +
                    '• Aggregated (no individual profiles)\n' +
                    '• GDPR compliant\n' +
                    '• Opt-in by default'
                );
                break;
        }
    }

    /**
     * Get consent status for display
     */
    getStatus(): {
        consented: boolean;
        shown: boolean;
        lastUpdated?: string;
    } {
        const consented = this.hasConsent();
        const shown = this.hasConsentBannerBeenShown();

        return {
            consented,
            shown,
        };
    }
}
