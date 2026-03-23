/**
 * Context-Aware Prompt Suggestions
 * Provides intelligent prompt suggestions based on user context and activity
 */

import * as vscode from 'vscode';
import { ClarityLogger } from './logger';

/**
 * Suggestion category
 */
export type SuggestionCategory =
    | 'testing'
    | 'documentation'
    | 'refactoring'
    | 'optimization'
    | 'architecture'
    | 'security'
    | 'debugging'
    | 'feature';

/**
 * Suggestion with context and metadata
 */
export interface PromptSuggestion {
    id: string;
    title: string;
    description: string;
    prompt: string;
    category: SuggestionCategory;
    context: string[];
    confidence: number; // 0-100
    actionLabel?: string;
    learnMoreUrl?: string;
}

/**
 * Context detector result
 */
export interface DetectedContext {
    fileType: string;
    language: string;
    hasTests: boolean;
    hasDocumentation: boolean;
    codeComplexity: 'simple' | 'moderate' | 'complex';
    recentChanges: number;
    selectedText: string;
}

export class PromptSuggestionsManager {
    private logger: ClarityLogger;
    private suggestionHistory: Set<string> = new Set();
    private maxHistorySize = 20;

    constructor(logger: ClarityLogger) {
        this.logger = logger;
    }

    /**
     * Get suggestions based on editor context
     */
    async getSuggestions(
        editor: vscode.TextEditor,
        limit: number = 5
    ): Promise<PromptSuggestion[]> {
        try {
            const context = await this.detectContext(editor);
            const suggestions = this.generateSuggestions(context);
            const filtered = suggestions
                .filter((s) => !this.suggestionHistory.has(s.id))
                .slice(0, limit);

            // Track shown suggestions to avoid repetition
            filtered.forEach((s) => this.addToHistory(s.id));

            this.logger.debug('suggestions', 'Generated suggestions', {
                context: context.language,
                count: filtered.length,
            });

            return filtered;
        } catch (error) {
            this.logger.error('suggestions', 'Error generating suggestions', error as Error);
            return [];
        }
    }

    /**
     * Get suggestions for a specific file type
     */
    getSuggestionsForFileType(
        fileType: string,
        language: string
    ): PromptSuggestion[] {
        const suggestions: PromptSuggestion[] = [];

        if (fileType === 'test') {
            suggestions.push(
                {
                    id: 'test-coverage',
                    title: 'Improve Test Coverage',
                    description: 'Add comprehensive test cases for this code',
                    prompt: `Write unit tests for this code with high coverage. Include edge cases, error scenarios, and mocks for dependencies.`,
                    category: 'testing',
                    context: ['test', language],
                    confidence: 85,
                    actionLabel: 'Generate Tests',
                    learnMoreUrl: 'https://clarity-ai.app/guides/testing',
                },
                {
                    id: 'test-integration',
                    title: 'Add Integration Tests',
                    description: 'Create integration test scenarios',
                    prompt: `Create integration tests that verify how this code works with other modules. Mock external dependencies appropriately.`,
                    category: 'testing',
                    context: ['test', 'integration'],
                    confidence: 75,
                }
            );
        } else {
            // Code file suggestions
            suggestions.push(
                {
                    id: 'add-tests',
                    title: 'Add Tests',
                    description: 'Generate unit tests for the current code',
                    prompt: `Write comprehensive unit tests for this code. Include normal cases, edge cases, and error scenarios. Use appropriate testing patterns for ${language}.`,
                    category: 'testing',
                    context: ['code', language],
                    confidence: 80,
                    actionLabel: 'Generate Tests',
                    learnMoreUrl: 'https://clarity-ai.app/guides/testing',
                },
                {
                    id: 'add-docs',
                    title: 'Add Documentation',
                    description: 'Generate JSDoc or docstrings for this code',
                    prompt: `Add comprehensive documentation for this code. Write clear docstrings/comments explaining parameters, return values, exceptions, and usage examples.`,
                    category: 'documentation',
                    context: ['code', language],
                    confidence: 78,
                    actionLabel: 'Add Docs',
                    learnMoreUrl: 'https://clarity-ai.app/guides/documentation',
                },
                {
                    id: 'refactor',
                    title: 'Refactor for Clarity',
                    description: 'Improve code readability and maintainability',
                    prompt: `Refactor this code to improve readability and maintainability. Suggest better naming, reduce complexity, extract functions if needed, follow ${language} best practices.`,
                    category: 'refactoring',
                    context: ['code', 'refactor'],
                    confidence: 70,
                    actionLabel: 'Refactor',
                }
            );
        }

        return suggestions;
    }

    /**
     * Get performance optimization suggestions
     */
    getOptimizationSuggestions(): PromptSuggestion[] {
        return [
            {
                id: 'optimize-perf',
                title: 'Optimize Performance',
                description: 'Find and fix performance bottlenecks',
                prompt: `Analyze this code for performance optimizations. Identify bottlenecks, suggest caching strategies, algorithm improvements, and measure expected impact.`,
                category: 'optimization',
                context: ['performance'],
                confidence: 75,
                actionLabel: 'Optimize',
                learnMoreUrl: 'https://clarity-ai.app/guides/performance',
            },
            {
                id: 'reduce-bundle',
                title: 'Reduce Bundle Size',
                description: 'Minimize bundle size and improve load times',
                prompt: `Suggest ways to reduce bundle size for this code. Focus on removing unused dependencies, code splitting, lazy loading, and tree-shaking opportunities.`,
                category: 'optimization',
                context: ['bundle', 'bundle-size'],
                confidence: 68,
            },
        ];
    }

    /**
     * Get security-focused suggestions
     */
    getSecuritySuggestions(): PromptSuggestion[] {
        return [
            {
                id: 'security-review',
                title: 'Security Review',
                description: 'Identify and fix security vulnerabilities',
                prompt: `Perform a security review of this code. Identify vulnerabilities (SQL injection, XSS, CSRF, etc.), insecure patterns, and suggest fixes following OWASP guidelines.`,
                category: 'security',
                context: ['security', 'review'],
                confidence: 85,
                actionLabel: 'Review Security',
                learnMoreUrl: 'https://clarity-ai.app/guides/security',
            },
            {
                id: 'input-validation',
                title: 'Add Input Validation',
                description: 'Validate user input properly',
                prompt: `Add comprehensive input validation for user inputs in this code. Handle invalid data, edge cases, and validate types/formats appropriately.`,
                category: 'security',
                context: ['security', 'validation'],
                confidence: 80,
            },
        ];
    }

    /**
     * Get architecture-related suggestions
     */
    getArchitectureSuggestions(): PromptSuggestion[] {
        return [
            {
                id: 'design-pattern',
                title: 'Apply Design Pattern',
                description: 'Suggest design patterns for better structure',
                prompt: `Review this code and suggest appropriate design patterns (Factory, Observer, Strategy, etc.) that would improve its structure and maintainability.`,
                category: 'architecture',
                context: ['architecture', 'design'],
                confidence: 70,
            },
            {
                id: 'api-design',
                title: 'Improve API Design',
                description: 'Design a better public API',
                prompt: `Review the API design of this code. Suggest improvements for consistency, discoverability, backwards compatibility, and developer experience.`,
                category: 'architecture',
                context: ['api', 'design'],
                confidence: 72,
            },
        ];
    }

    /**
     * Get debugging suggestions
     */
    getDebuggingSuggestions(): PromptSuggestion[] {
        return [
            {
                id: 'debug-approach',
                title: 'Debug This Issue',
                description: 'Develop a debugging strategy',
                prompt: `Suggest a systematic approach to debug this code. Outline hypothesis, test steps, tools to use, and how to isolate the root cause.`,
                category: 'debugging',
                context: ['debugging'],
                confidence: 65,
            },
        ];
    }

    /**
     * Get feature-based suggestions
     */
    getFeatureSuggestions(selectedText?: string): PromptSuggestion[] {
        return [
            {
                id: 'enhance-feature',
                title: 'Enhance Feature',
                description: 'Add functionality to existing code',
                prompt: `Enhance this code by adding useful features. Consider error handling, logging, caching, and edge cases.`,
                category: 'feature',
                context: ['feature'],
                confidence: 60,
            },
        ];
    }

    /**
     * Detect context from editor
     */
    private async detectContext(editor: vscode.TextEditor): Promise<DetectedContext> {
        const doc = editor.document;
        const fileName = doc.fileName;
        const language = doc.languageId;
        const text = doc.getText();
        const selection = editor.selection;
        const selectedText = doc.getText(selection);

        // Detect file type
        let fileType = 'code';
        if (
            fileName.includes('.test.') ||
            fileName.includes('.spec.') ||
            fileName.includes('__tests__')
        ) {
            fileType = 'test';
        }
        if (fileName.includes('.md')) {
            fileType = 'documentation';
        }

        // Detect code complexity
        const lineCount = doc.lineCount;
        const functionCount = (text.match(/^[\s]*(function|const|async|=>)/gm) || [])
            .length;
        let complexity: 'simple' | 'moderate' | 'complex' = 'simple';
        if (lineCount > 200 || functionCount > 10) {
            complexity = 'complex';
        } else if (lineCount > 50) {
            complexity = 'moderate';
        }

        // Check for test/doc patterns
        const hasTests =
            text.includes('test(') ||
            text.includes('describe(') ||
            text.includes('it(') ||
            text.includes('expect(');
        const hasDocumentation =
            text.includes('/**') ||
            text.includes('///') ||
            text.includes('//');

        // Count recent changes (guess based on selection)
        const recentChanges = selectedText.length > 0 ? 1 : 0;

        return {
            fileType,
            language,
            hasTests,
            hasDocumentation,
            codeComplexity: complexity,
            recentChanges,
            selectedText,
        };
    }

    /**
     * Generate suggestions based on detected context
     */
    private generateSuggestions(context: DetectedContext): PromptSuggestion[] {
        const suggestions: PromptSuggestion[] = [];

        // File-type based suggestions
        suggestions.push(...this.getSuggestionsForFileType(context.fileType, context.language));

        // Complexity-based suggestions
        if (context.codeComplexity === 'complex') {
            suggestions.push(...this.getRefactoringSuggestions());
            suggestions.push(...this.getOptimizationSuggestions());
        }

        // Gap-based suggestions
        if (!context.hasTests) {
            suggestions.push({
                id: 'missing-tests',
                title: 'Add Tests (Missing)',
                description: 'This file has no tests',
                prompt: `Write comprehensive unit tests for this code`,
                category: 'testing',
                context: ['missing-tests'],
                confidence: 95,
                actionLabel: 'Add Tests',
            });
        }

        if (!context.hasDocumentation) {
            suggestions.push({
                id: 'missing-docs',
                title: 'Add Documentation (Missing)',
                description: 'This file lacks documentation',
                prompt: `Add comprehensive documentation to this code`,
                category: 'documentation',
                context: ['missing-docs'],
                confidence: 90,
                actionLabel: 'Add Docs',
            });
        }

        // Security suggestions for common patterns
        if (context.language === 'javascript' || context.language === 'typescript') {
            suggestions.push(...this.getSecuritySuggestions().slice(0, 1));
        }

        // Sort by confidence
        return suggestions.sort((a, b) => b.confidence - a.confidence);
    }

    /**
     * Get refactoring suggestions
     */
    private getRefactoringSuggestions(): PromptSuggestion[] {
        return [
            {
                id: 'refactor-complex',
                title: 'Refactor Complex Code',
                description: 'Break down complex logic',
                prompt: `This code is complex. Refactor it by extracting functions, reducing nesting, and improving variable names. Apply SOLID principles.`,
                category: 'refactoring',
                context: ['complex', 'refactor'],
                confidence: 80,
            },
        ];
    }

    /**
     * Record suggestion in history
     */
    private addToHistory(id: string): void {
        this.suggestionHistory.add(id);

        // Keep history size manageable
        if (this.suggestionHistory.size > this.maxHistorySize) {
            const idsArray = Array.from(this.suggestionHistory);
            this.suggestionHistory = new Set(
                idsArray.slice(this.suggestionHistory.size - this.maxHistorySize)
            );
        }
    }

    /**
     * Clear suggestion history
     */
    clearHistory(): void {
        this.suggestionHistory.clear();
    }

    /**
     * Get all available categories
     */
    getCategories(): SuggestionCategory[] {
        return [
            'testing',
            'documentation',
            'refactoring',
            'optimization',
            'architecture',
            'security',
            'debugging',
            'feature',
        ];
    }
}
