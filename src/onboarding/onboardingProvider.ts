/**
 * Onboarding Webview Provider
 * Handles the interactive first-run experience for ClarityAI
 * 6-step flow: Welcome → Personas (3) → Demo → Preferences → Help
 */

import * as vscode from 'vscode';
import { OnboardingState, getOnboardingState, setOnboardingState } from './onboardingState';

export class OnboardingProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'clarity-onboarding';
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
            'Architect Persona',
            'Security Persona',
            'Reviewer Persona',
            'See it in Action',
            'Personalize Your Setup'
        ];

        const stepDescriptions = [
            'Transform your prompts into powerful instructions for GitHub Copilot',
            'Expert system architecture with focus on scalability and design patterns',
            'Security expertise with vulnerability prevention and secure code practices',
            'Critical code review with focus on edge cases and technical debt',
            'Watch how ClarityAI transforms a simple prompt into structured instructions',
            'Choose your preferences and you are ready to enhance prompts'
        ];

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ClarityAI Onboarding</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            padding: 20px;
            line-height: 1.6;
        }

        .onboarding-container {
            max-width: 100%;
        }

        .progress-bar {
            display: flex;
            gap: 4px;
            margin-bottom: 32px;
        }

        .progress-step {
            flex: 1;
            height: 3px;
            background: var(--vscode-input-background);
            border-radius: 2px;
            transition: all 0.3s ease;
        }

        .progress-step.active {
            background: var(--vscode-button-background);
        }

        .progress-step.current {
            background: var(--vscode-button-background);
            opacity: 1;
        }

        .onboarding-content {
            animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        h1 {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-editor-foreground);
        }

        .step-description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 24px;
            font-size: 14px;
        }

        .step-content {
            margin-bottom: 32px;
        }

        .feature-grid {
            display: grid;
            gap: 16px;
            margin-top: 16px;
        }

        .feature-card {
            padding: 16px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
            transition: all 0.2s ease;
        }

        .feature-card:hover {
            border-color: var(--vscode-focusBorder);
            background: var(--vscode-list-hoverBackground);
        }

        .feature-card h3 {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 6px;
            color: var(--vscode-editor-foreground);
        }

        .feature-card p {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.5;
        }

        .persona-intro {
            text-align: center;
        }

        .persona-intro h2 {
            font-size: 20px;
            font-weight: 600;
            margin: 16px 0 8px;
        }

        .persona-description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 16px;
        }

        .use-case {
            margin: 16px 0;
            padding: 12px;
            background: var(--vscode-input-background);
            border-left: 3px solid var(--vscode-button-background);
            font-size: 13px;
        }

        .example {
            margin-top: 16px;
            padding: 16px;
            background: var(--vscode-input-background);
            border-radius: 6px;
        }

        .example-input {
            color: var(--vscode-descriptionForeground);
            margin: 8px 0;
            font-size: 13px;
        }

        .example-output {
            color: var(--vscode-editor-foreground);
            margin: 8px 0;
            font-size: 13px;
            font-weight: 500;
        }

        .demo {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .demo-box {
            padding: 16px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: 6px;
        }

        .demo-box.enhanced {
            border-color: var(--vscode-button-background);
        }

        .demo-box h3 {
            font-size: 13px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .demo-text {
            font-size: 14px;
            line-height: 1.6;
        }

        .arrow {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 20px;
        }

        .demo-note {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            font-style: italic;
        }

        .preferences {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .checkbox-label {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            cursor: pointer;
            padding: 12px;
            background: var(--vscode-input-background);
            border-radius: 6px;
            transition: background 0.2s ease;
        }

        .checkbox-label:hover {
            background: var(--vscode-list-hoverBackground);
        }

        .checkbox-label input[type="checkbox"] {
            margin-top: 2px;
            cursor: pointer;
        }

        .checkbox-label span {
            font-size: 13px;
        }

        .info-box {
            padding: 16px;
            background: var(--vscode-inputValidation-infoBorder);
            background-opacity: 0.1;
            border: 1px solid var(--vscode-inputValidation-infoBorder);
            border-radius: 6px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }

        .info-box strong {
            color: var(--vscode-editor-foreground);
        }

        .button-group {
            display: flex;
            gap: 12px;
            margin-top: 24px;
        }

        button {
            flex: 1;
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            font-family: inherit;
        }

        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }

        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }

        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .btn-tertiary {
            background: transparent;
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-widget-border);
        }

        .btn-tertiary:hover {
            border-color: var(--vscode-focusBorder);
        }
    </style>
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
                ${step > 0 ? '<button id="prev-btn" class="btn-secondary">Previous</button>' : ''}
                ${step < 5 ? `<button id="next-btn" class="btn-primary">Next</button>` : ''}
                ${step === 5 ? '<button id="complete-btn" class="btn-primary">Get Started</button>' : ''}
                ${step === 0 ? '<button id="skip-btn" class="btn-tertiary">Skip</button>' : ''}
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const step = ${step};

        document.getElementById('next-btn')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'next-step', currentStep: step });
        });

        document.getElementById('prev-btn')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'previous-step', currentStep: step });
        });

        document.getElementById('complete-btn')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'complete-onboarding' });
        });

        document.getElementById('skip-btn')?.addEventListener('click', () => {
            vscode.postMessage({ command: 'skip-onboarding' });
        });
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
                                <h3>Smart Enhancement</h3>
                                <p>AI-powered prompt improvement based on your field</p>
                            </div>
                            <div class="feature-card">
                                <h3>Expert Personas</h3>
                                <p>Architect, Security, Reviewer, Tester, and more</p>
                            </div>
                            <div class="feature-card">
                                <h3>Privacy First</h3>
                                <p>Secret Shield protects sensitive data</p>
                            </div>
                            <div class="feature-card">
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
                    { name: 'Architect', use: 'Design systems, scalability, architecture' },
                    { name: 'Security', use: 'Security reviews, vulnerability scanning' },
                    { name: 'Reviewer', use: 'Code review, edge cases, best practices' }
                ];
                const persona = personas[step - 1];
                return `
                    <div class="step-content persona-intro">
                        <h2>${persona.name}</h2>
                        <p class="persona-description">
                            Get expert-level ${persona.name.toLowerCase()} insights on everything you create.
                        </p>
                        <p class="use-case"><strong>Perfect for:</strong> ${persona.use}</p>
                        <div class="example">
                            <strong>Example:</strong>
                            <p class="example-input">Input: "design an API"</p>
                            <p class="example-output">Output: Gets comprehensive architecture guidance</p>
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
                        <p class="demo-note">This is what ClarityAI does for every prompt</p>
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
