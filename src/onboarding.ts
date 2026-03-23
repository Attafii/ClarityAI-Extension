import * as vscode from 'vscode';
import { ClarityLogger } from './logger';

/**
 * Onboarding Flow Steps
 * 6-step interactive experience for first-time users
 */

export interface OnboardingStep {
    id: string;
    title: string;
    description: string;
    content: string;
    action?: {
        label: string;
        callback: () => Promise<void>;
    };
}

export class OnboardingManager {
    private context: vscode.ExtensionContext;
    private logger: ClarityLogger;
    private hasCompletedOnboarding: boolean = false;

    constructor(context: vscode.ExtensionContext, logger: ClarityLogger) {
        this.context = context;
        this.logger = logger;
        this.hasCompletedOnboarding = context.globalState.get('clarity.onboarded') === true;
    }

    /**
     * Check if user should see onboarding
     */
    shouldShowOnboarding(): boolean {
        return !this.hasCompletedOnboarding;
    }

    /**
     * Get all onboarding steps
     */
    getSteps(): OnboardingStep[] {
        return [
            {
                id: 'welcome',
                title: '🎉 Welcome to ClarityAI',
                description: 'Smart prompt enhancement for VS Code Copilot',
                content: `
# Welcome to ClarityAI

ClarityAI is your intelligent prompt enhancement companion for VS Code. We help you craft better prompts that get better code suggestions from Copilot.

## Key Features:
- **Smart Enhancement**: Automatically improves your prompts with best practices
- **Privacy-First**: Your code stays private — we only process what you share
- **Multiple Modes**: Fast responses or deep reasoning, you choose
- **Persona Library**: Write as different roles (Architect, Security Expert, etc.)
- **Context Injection**: Automatically includes relevant project context`,
            },
            {
                id: 'quick-start',
                title: '⚡ Quick Start',
                description: 'Get started in 30 seconds',
                content: `
# Quick Start

## How to Use ClarityAI:

1. **Open Chat** - Press \`Cmd/Ctrl + Shift + I\` to open VS Code Chat
2. **Type Your Prompt** - Start with \`@clarity\` to use ClarityAI
3. **Get Enhancement** - ClarityAI analyzes and improves your prompt
4. **Copy & Use** - Use the enhanced prompt in Copilot chat

## Example:
\`\`\`
@clarity make a function to validate email addresses
\`\`\`

ClarityAI will enhance this to include best practices, error handling, and clearer intent.`,
            },
            {
                id: 'modes',
                title: '🤖 Three Powerful Modes',
                description: 'Choose how ClarityAI enhances your prompts',
                content: `
# Three Modes for Every Scenario

## @clarity (Smart Mode)
Automatically chooses between fast and reasoning modes based on prompt complexity.
- Best for: General use, mixed workloads
- Speed: Medium
- Intelligence: Adaptive

## @clarity-fast (Lightning Fast)
Optimized for speed with minimal latency.
- Best for: Quick refinements, simple prompts
- Speed: ⚡⚡⚡ Fast
- Intelligence: Balanced

## @clarity-thinking (Deep Reasoning)
Advanced analysis for complex architectural decisions.
- Best for: System design, security review, architecture decisions
- Speed: ⚡ Slower (worth it)
- Intelligence: 🧠 Deep`,
            },
            {
                id: 'templates',
                title: '📚 Use Templates',
                description: 'Start with proven prompt patterns',
                content: `
# Choose from 50+ Prompt Templates

ClarityAI includes a library of templates for common tasks:

## Available Categories:
- **API Design** - REST endpoints, schema validation, error handling
- **Testing** - Unit tests, integration tests, test strategies
- **Documentation** - README files, code comments, API docs
- **Architecture** - Design patterns, scalability, performance
- **Security** - Vulnerability analysis, threat modeling, validation
- **DevOps** - CI/CD, infrastructure, deployment
- **Frontend** - UI patterns, accessibility, responsive design
- **Performance** - Optimization, profiling, caching strategies

## How to Use:
Type \`@clarity templates\` or \`@clarity t:\` to see the full list.`,
            },
            {
                id: 'privacy',
                title: '🛡️ Privacy & Security',
                description: 'Your code stays private',
                content: `
# Privacy First Design

## Your Data is Protected:
- ✅ **No Content Logging** - We don't store prompts or responses
- ✅ **Automatic Masking** - Secrets are detected and masked automatically
- ✅ **Secret Shield** - Detects 50+ credential patterns (API keys, tokens, passwords)
- ✅ **Local Processing** - Complexity analysis runs on your machine
- ✅ **Opt-in Analytics** - Anonymous, aggregated metrics only

## What We Never Collect:
- ❌ Your actual code or prompts
- ❌ File paths or project names
- ❌ API keys or credentials
- ❌ Passwords or tokens
- ❌ Personal information

## Credentials Detected & Masked:
- AWS credentials, GitHub tokens
- API keys, database passwords
- Private keys, JWT tokens
- And 45+ more patterns`,
            },
            {
                id: 'get-started',
                title: '🚀 Ready to Enhance!',
                description: 'Start improving your prompts',
                content: `
# You're All Set! 🎉

## Next Steps:

1. **Try it now** - Open chat and use \`@clarity <your prompt>\`
2. **Explore templates** - Type \`@clarity templates\` to see examples
3. **Read docs** - Visit [clarity-ai.app](https://clarity-ai.app) for detailed guides
4. **Get help** - Use \`@clarity help\` in chat for commands and options
5. **Provide feedback** - We'd love to hear how ClarityAI helps you!

## Pro Tips:
- Use \`@clarity-thinking\` for complex architectural decisions
- Check the Secret Shield alerts — they protect your sensitive data
- Templates save time — start with one and customize it
- Enable context injection to let ClarityAI understand your project

## Questions?
Visit [clarity-ai.app/docs](https://clarity-ai.app/docs) or check the help command.

Enjoy better prompts! 🚀`,
            },
        ];
    }

    /**
     * Show onboarding step in webview
     */
    async showStep(stepIndex: number = 0): Promise<void> {
        const steps = this.getSteps();
        if (stepIndex < 0 || stepIndex >= steps.length) {
            return;
        }

        const step = steps[stepIndex];
        const panel = vscode.window.createWebviewPanel(
            'clarity-onboarding',
            `ClarityAI Onboarding - ${step.title}`,
            vscode.ViewColumn.One,
            { enableScripts: true }
        );

        const progressPercent = Math.round((stepIndex / (steps.length - 1)) * 100);

        panel.webview.html = this.getWebviewContent(step, stepIndex, steps.length, progressPercent);

        panel.webview.onDidReceiveMessage(async (message) => {
            this.logger.debug('onboarding', 'Received webview message', { action: message.action });

            switch (message.action) {
                case 'next':
                    panel.dispose();
                    if (stepIndex < steps.length - 1) {
                        await this.showStep(stepIndex + 1);
                    }
                    break;
                case 'previous':
                    panel.dispose();
                    if (stepIndex > 0) {
                        await this.showStep(stepIndex - 1);
                    }
                    break;
                case 'complete':
                    await this.completeOnboarding();
                    panel.dispose();
                    vscode.window.showInformationMessage('🎉 Onboarding complete! Start using @clarity in chat.');
                    this.logger.info('onboarding', 'User completed onboarding successfully');
                    break;
                case 'skip':
                    await this.completeOnboarding();
                    panel.dispose();
                    this.logger.info('onboarding', 'User skipped onboarding');
                    break;
            }
        });
    }

    /**
     * Mark onboarding as completed
     */
    async completeOnboarding(): Promise<void> {
        await this.context.globalState.update('clarity.onboarded', true);
        this.hasCompletedOnboarding = true;
        this.logger.info('onboarding', 'Onboarding marked as complete');
    }

    /**
     * Reset onboarding (for testing/re-onboarding)
     */
    async resetOnboarding(): Promise<void> {
        await this.context.globalState.update('clarity.onboarded', false);
        this.hasCompletedOnboarding = false;
        this.logger.info('onboarding', 'Onboarding reset');
    }

    /**
     * Generate webview HTML content
     */
    private getWebviewContent(
        step: OnboardingStep,
        currentIndex: number,
        totalSteps: number,
        progressPercent: number
    ): string {
        const isFirstStep = currentIndex === 0;
        const isLastStep = currentIndex === totalSteps - 1;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${step.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            max-width: 600px;
            width: 100%;
            overflow: hidden;
        }

        .progress-bar {
            height: 4px;
            background: #e0e0e0;
            width: 100%;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
            width: ${progressPercent}%;
            transition: width 0.3s ease;
        }

        .content-wrapper {
            padding: 40px;
            max-height: 600px;
            overflow-y: auto;
        }

        .step-indicator {
            color: #667eea;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        h1 {
            color: #333;
            margin-bottom: 10px;
            font-size: 28px;
        }

        .description {
            color: #666;
            margin-bottom: 20px;
            font-size: 14px;
        }

        .markdown-content {
            color: #333;
            line-height: 1.6;
            font-size: 15px;
        }

        .markdown-content h2 {
            color: #333;
            margin: 16px 0 8px 0;
            font-size: 18px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 6px;
        }

        .markdown-content h3 {
            color: #555;
            margin: 12px 0 6px 0;
            font-size: 16px;
        }

        .markdown-content ul {
            margin: 8px 0 16px 20px;
        }

        .markdown-content li {
            margin: 4px 0;
        }

        .markdown-content code {
            background: #f5f5f5;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #d63384;
        }

        .markdown-content pre {
            background: #f5f5f5;
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 8px 0 16px 0;
            border-left: 4px solid #667eea;
        }

        .markdown-content pre code {
            background: none;
            padding: 0;
            color: #333;
        }

        .markdown-content a {
            color: #667eea;
            text-decoration: none;
        }

        .markdown-content a:hover {
            text-decoration: underline;
        }

        .footer {
            padding: 20px 40px;
            background: #f9f9f9;
            border-top: 1px solid #e0e0e0;
            display: flex;
            gap: 10px;
            justify-content: space-between;
            flex-wrap: wrap;
        }

        button {
            padding: 10px 20px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            flex-grow: 1;
            max-width: 150px;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        .btn-secondary {
            background: #e0e0e0;
            color: #333;
            flex-grow: 1;
            max-width: 150px;
        }

        .btn-secondary:hover {
            background: #d0d0d0;
        }

        .btn-link {
            background: transparent;
            color: #667eea;
            text-decoration: none;
            padding: 10px 0;
            flex-grow: 1;
            max-width: 150px;
        }

        .btn-link:hover {
            text-decoration: underline;
        }

        .buttons-left {
            display: flex;
            gap: 10px;
            flex: 1;
        }

        .buttons-right {
            display: flex;
            gap: 10px;
        }

        @media (max-width: 500px) {
            .content-wrapper {
                padding: 20px;
            }

            h1 {
                font-size: 24px;
            }

            .footer {
                flex-direction: column;
            }

            .buttons-left,
            .buttons-right {
                width: 100%;
            }

            button {
                max-width: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="progress-bar">
            <div class="progress-fill"></div>
        </div>

        <div class="content-wrapper">
            <div class="step-indicator">Step ${currentIndex + 1} of ${totalSteps}</div>
            <h1>${step.title}</h1>
            <div class="description">${step.description}</div>
            <div class="markdown-content">${this.markdownToHtml(step.content)}</div>
        </div>

        <div class="footer">
            <div class="buttons-left">
                ${!isFirstStep ? `<button class="btn-secondary" onclick="previous()">← Previous</button>` : ''}
                ${!isLastStep ? `<button class="btn-primary" onclick="next()">Next →</button>` : ''}
                ${isLastStep ? `<button class="btn-primary" onclick="complete()">Get Started! 🎉</button>` : ''}
            </div>
            <div class="buttons-right">
                <button class="btn-link" onclick="skip()">Skip for now</button>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function next() {
            vscode.postMessage({ action: 'next' });
        }

        function previous() {
            vscode.postMessage({ action: 'previous' });
        }

        function complete() {
            vscode.postMessage({ action: 'complete' });
        }

        function skip() {
            vscode.postMessage({ action: 'skip' });
        }
    </script>
</body>
</html>`;
    }

    /**
     * Simple markdown to HTML converter
     */
    private markdownToHtml(markdown: string): string {
        let html = markdown
            .trim()
            .split('\n')
            .map((line) => {
                // Headings
                if (line.startsWith('# ')) return `<h2>${this.escapeHtml(line.substring(2))}</h2>`;
                if (line.startsWith('## ')) return `<h3>${this.escapeHtml(line.substring(3))}</h3>`;

                // Lists
                if (line.startsWith('- ')) {
                    const content = line.substring(2);
                    return `<li>${this.parseInlineMarkdown(content)}</li>`;
                }

                // Bold and inline formatting
                if (line.trim()) {
                    return `<p>${this.parseInlineMarkdown(line)}</p>`;
                }

                return '';
            })
            .join('');

        // Wrap consecutive list items in <ul>
        html = html.replace(/(<li>(?:[\s\S]*?<\/li>)+)/g, (match) => {
            if (!match.includes('<ul>')) {
                return `<ul>${match}</ul>`;
            }
            return match;
        });

        // Code blocks
        html = html.replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        // Inline code
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Links
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

        // Bold
        html = html.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');

        // Checkmarks and symbols
        html = html.replace(/✓/g, '✅').replace(/✗/g, '❌').replace(/→/g, '→');

        return html;
    }

    private parseInlineMarkdown(text: string): string {
        text = text.replace(/\*\*([^\*]+)\*\*/g, '<strong>$1</strong>');
        text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
        text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
        return text;
    }

    private escapeHtml(text: string): string {
        const map: { [key: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;',
        };
        return text.replace(/[&<>"']/g, (char) => map[char]);
    }
}
