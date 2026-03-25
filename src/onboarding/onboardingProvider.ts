/**
 * Onboarding Webview Provider
 * Handles the interactive first-run experience for ClarityAI
 * 6-step flow: Welcome → Personas (3) → Demo → Preferences → Help
 */

import * as vscode from 'vscode';
import { OnboardingState, getOnboardingState, setOnboardingState } from './onboardingState';

export class OnboardingProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'clarity.onboarding';
    private view?: vscode.WebviewView;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext<unknown>,
        _token: vscode.CancellationToken
    ): void | Thenable<void> {
        this.view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.context.extensionUri, 'webview')
            ]
        };

        this.updateWebviewContent();

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(async (data: any) => {
            switch (data.command) {
                case 'next-step':
                    await this.handleNextStep(data.currentStep);
                    break;
                case 'previous-step':
                    await this.handlePreviousStep(data.currentStep);
                    break;
                case 'complete-onboarding':
                    await this.completeOnboarding();
                    break;
                case 'skip-onboarding':
                    await this.skipOnboarding();
                    break;
                case 'set-preference':
                    await this.setPreference(data.key, data.value);
                    break;
            }
        });
    }

    private async handleNextStep(currentStep: number): Promise<void> {
        const state = getOnboardingState(this.context.globalState);
        if (currentStep < 5) {
            state.currentStep = currentStep + 1;
            setOnboardingState(this.context.globalState, state);
            this.updateWebviewContent();
        }
    }

    private async handlePreviousStep(currentStep: number): Promise<void> {
        const state = getOnboardingState(this.context.globalState);
        if (currentStep > 0) {
            state.currentStep = currentStep - 1;
            setOnboardingState(this.context.globalState, state);
            this.updateWebviewContent();
        }
    }

    private async completeOnboarding(): Promise<void> {
        const state = getOnboardingState(this.context.globalState);
        state.completed = true;
        state.completedAt = new Date().toISOString();
        setOnboardingState(this.context.globalState, state);

        // Close the onboarding view
        if (this.view) {
            await vscode.commands.executeCommand(`${OnboardingProvider.viewType}.focus`, { preserveFocus: true });
        }

        vscode.window.showInformationMessage(
            '🎉 Welcome to ClarityAI! Your journey to better prompts starts now.',
            'Get Started'
        );
    }

    private async skipOnboarding(): Promise<void> {
        const state = getOnboardingState(this.context.globalState);
        state.skipped = true;
        state.skippedAt = new Date().toISOString();
        setOnboardingState(this.context.globalState, state);

        vscode.window.showInformationMessage(
            'You can restart the onboarding anytime with the "ClarityAI: Show Onboarding" command.'
        );
    }

    private async setPreference(key: string, value: any): Promise<void> {
        const state = getOnboardingState(this.context.globalState);
        if (!state.preferences) {
            state.preferences = {};
        }
        (state.preferences as any)[key] = value;
        setOnboardingState(this.context.globalState, state);
    }

    private updateWebviewContent(): void {
        if (!this.view) return;

        const webview = this.view.webview;
        const state = getOnboardingState(this.context.globalState);
        const step = state.currentStep;

        const htmlPath = vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'onboarding.html');
        const cssPath = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'styles', 'onboarding.css')
        );
        const jsPath = vscode.Uri.joinPath(this.context.extensionUri, 'webview', 'scripts', 'onboarding.js');

        this.view.title = `ClarityAI Setup (Step ${step + 1}/6)`;
        this.view.description = this.getStepDescription(step);

        // The HTML content will be loaded from the file
        // For now, we'll set a placeholder
        webview.html = this.getWebviewHtml(cssPath, jsPath, step);
    }

    private getStepDescription(step: number): string {
        const descriptions = [
            'Welcome to ClarityAI',
            'Persona: Architect',
            'Persona: Security',
            'Persona: Reviewer',
            'Interactive Demo',
            'Your Preferences'
        ];
        return descriptions[step] || 'Setup';
    }

    private getWebviewHtml(cssUri: vscode.Uri, jsUri: vscode.Uri, step: number): string {
        const stepTitles = [
            'Welcome to ClarityAI',
            'Meet the Architect Persona',
            'Meet the Security Persona',
            'Meet the Reviewer Persona',
            'See it in Action',
            'Personalize Your Setup'
        ];

        const stepDescriptions = [
            'Transform your prompts into powerful instructions for GitHub Copilot. Let\'s get you set up in just a few steps!',
            'Expert system architecture with focus on scalability, SOLID principles, and design patterns.',
            'Security expertise with OWASP Top 10 focus, vulnerability prevention, and secure code practices.',
            'Critical code review with focus on edge cases, technical debt, and robust alternatives.',
            'Watch how ClarityAI transforms a simple prompt into a structured, detailed instruction.',
            'Choose your preferences and you\'re ready to enhance prompts like a pro.'
        ];

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="${cssUri}">
    <title>ClarityAI Onboarding</title>
</head>
<body>
    <div class="onboarding-container">
        <div class="progress-bar">
            ${Array.from({ length: 6 }, (_, i) => `
                <div class="progress-step ${i <= step ? 'active' : ''} ${i === step ? 'current' : ''}"></div>
            `).join('')}
        </div>

        <div class="onboarding-content">
            <h1>${stepTitles[step]}</h1>
            <p class="step-description">${stepDescriptions[step]}</p>

            ${this.getStepContent(step)}

            <div class="button-group">
                ${step > 0 ? '<button id="prev-btn" class="btn-secondary">← Previous</button>' : ''}
                ${step < 5 ? `<button id="next-btn" class="btn-primary">Next →</button>` : ''}
                ${step === 5 ? '<button id="complete-btn" class="btn-primary">Get Started</button>' : ''}
                ${step === 0 ? '<button id="skip-btn" class="btn-tertiary">Skip</button>' : ''}
            </div>
        </div>
    </div>

    <script src="${jsUri}"></script>
    <script>
        const step = ${step};
        window.vscode.postMessage({ command: 'step-loaded', step: step });
    </script>
</body>
</html>
        `;
    }

    private getStepContent(step: number): string {
        switch (step) {
            case 0: // Welcome
                return `
                    <div class="step-content">
                        <div class="feature-grid">
                            <div class="feature-card">
                                <div class="icon">🎯</div>
                                <h3>Smart Enhancement</h3>
                                <p>AI-powered prompt improvement based on your field</p>
                            </div>
                            <div class="feature-card">
                                <div class="icon">🎭</div>
                                <h3>Expert Personas</h3>
                                <p>Architect, Security, Reviewer, Tester, and more</p>
                            </div>
                            <div class="feature-card">
                                <div class="icon">🔍</div>
                                <h3>Privacy First</h3>
                                <p>Secret Shield protects sensitive data</p>
                            </div>
                            <div class="feature-card">
                                <div class="icon">📚</div>
                                <h3>Prompt Library</h3>
                                <p>Save and reuse prompts with your team</p>
                            </div>
                        </div>
                    </div>
                `;

            case 1: // Architect
            case 2: // Security
            case 3: // Reviewer
                const personas = [
                    { icon: '🏗️', name: 'Architect', use: 'Design systems, scalability, architecture' },
                    { icon: '🔐', name: 'Security', use: 'Security reviews, vulnerability scanning' },
                    { icon: '👀', name: 'Reviewer', use: 'Code review, edge cases, best practices' }
                ];
                const persona = personas[step - 1];
                return `
                    <div class="step-content persona-intro">
                        <div class="persona-icon">${persona.icon}</div>
                        <h2>${persona.name}</h2>
                        <p class="persona-description">
                            Get expert-level ${persona.name.toLowerCase()} insights on everything you create.
                        </p>
                        <p class="use-case"><strong>Perfect for:</strong> ${persona.use}</p>
                        <div class="example">
                            <strong>Example:</strong>
                            <p class="example-input">Input: "design an API"</p>
                            <p class="example-output">→ Gets comprehensive architecture guidance</p>
                        </div>
                    </div>
                `;

            case 4: // Demo
                return `
                    <div class="step-content demo">
                        <div class="demo-box">
                            <h3>Simple Input</h3>
                            <p class="demo-text">"Create a login form"</p>
                        </div>
                        <div class="arrow">↓</div>
                        <div class="demo-box enhanced">
                            <h3>Enhanced Output</h3>
                            <p class="demo-text">
                                "Create a modern, responsive login form with:<br>
                                • Password strength indicator<br>
                                • Email validation<br>
                                • Accessibility (ARIA labels)<br>
                                • Security best practices<br>
                                • Loading and error states"
                            </p>
                        </div>
                        <p class="demo-note">This is what ClarityAI does for every prompt!</p>
                    </div>
                `;

            case 5: // Preferences
                return `
                    <div class="step-content preferences">
                        <label class="checkbox-label">
                            <input type="checkbox" id="pref-analytics" checked>
                            <span>Help improve ClarityAI with anonymous usage analytics</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="pref-tips" checked>
                            <span>Show helpful tips in the chat</span>
                        </label>
                        <label class="checkbox-label">
                            <input type="checkbox" id="pref-context-injection" checked>
                            <span>Automatically analyze project context</span>
                        </label>
                        <div class="info-box">
                            <strong>Privacy Note:</strong> Your prompts are never stored or shared.
                            Analytics data is anonymous and helps us make ClarityAI better.
                        </div>
                    </div>
                `;

            default:
                return '';
        }
    }

    public static async show(context: vscode.ExtensionContext): Promise<void> {
        const state = getOnboardingState(context.globalState);
        if (!state.completed && !state.skipped) {
            await vscode.commands.executeCommand('clarity.onboarding.focus');
        }
    }

    public static async showManually(context: vscode.ExtensionContext): Promise<void> {
        const state = getOnboardingState(context.globalState);
        state.currentStep = 0; // Reset to beginning
        setOnboardingState(context.globalState, state);
        await vscode.commands.executeCommand('clarity.onboarding.focus');
    }
}
