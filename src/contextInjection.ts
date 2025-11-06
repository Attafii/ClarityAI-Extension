/**
 * Automatic code context injection for better prompts
 */

import * as vscode from 'vscode';
import * as path from 'path';

export interface ProjectContext {
    framework?: string;
    language?: string;
    dependencies?: string[];
    devDependencies?: string[];
    activeFile?: {
        language: string;
        relativePath: string;
        isTest: boolean;
    };
    buildTool?: string;
    hasTypeScript?: boolean;
    hasTests?: boolean;
}

/**
 * Extract project context from workspace
 */
export async function extractProjectContext(): Promise<ProjectContext> {
    const context: ProjectContext = {};
    
    // Get active file context
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        const document = activeEditor.document;
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
        
        context.activeFile = {
            language: document.languageId,
            relativePath: workspaceFolder 
                ? path.relative(workspaceFolder.uri.fsPath, document.uri.fsPath)
                : path.basename(document.uri.fsPath),
            isTest: isTestFile(document.uri.fsPath)
        };
        
        context.language = document.languageId;
    }
    
    // Read package.json if it exists
    const packageJsonContext = await readPackageJson();
    if (packageJsonContext) {
        Object.assign(context, packageJsonContext);
    }
    
    return context;
}

/**
 * Read and parse package.json
 */
async function readPackageJson(): Promise<Partial<ProjectContext> | null> {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }
        
        const packageJsonUri = vscode.Uri.joinPath(workspaceFolders[0].uri, 'package.json');
        const content = await vscode.workspace.fs.readFile(packageJsonUri);
        const packageJson = JSON.parse(content.toString());
        
        const context: Partial<ProjectContext> = {
            dependencies: packageJson.dependencies ? Object.keys(packageJson.dependencies) : [],
            devDependencies: packageJson.devDependencies ? Object.keys(packageJson.devDependencies) : []
        };
        
        // Detect framework
        context.framework = detectFramework(context.dependencies || [], context.devDependencies || []);
        
        // Detect TypeScript
        context.hasTypeScript = 
            (context.devDependencies?.includes('typescript')) ||
            (context.dependencies?.includes('typescript')) ||
            false;
            
        // Detect test framework
        context.hasTests = detectTestFramework(context.devDependencies || []);
        
        // Detect build tool
        context.buildTool = detectBuildTool(packageJson.scripts || {});
        
        return context;
    } catch (error) {
        // package.json doesn't exist or can't be read
        return null;
    }
}

/**
 * Detect framework from dependencies
 */
function detectFramework(deps: string[], devDeps: string[]): string | undefined {
    const allDeps = [...deps, ...devDeps];
    
    if (allDeps.includes('next')) return 'Next.js';
    if (allDeps.includes('react')) return 'React';
    if (allDeps.includes('vue')) return 'Vue';
    if (allDeps.includes('@angular/core')) return 'Angular';
    if (allDeps.includes('svelte')) return 'Svelte';
    if (allDeps.includes('express')) return 'Express';
    if (allDeps.includes('@nestjs/core')) return 'NestJS';
    if (allDeps.includes('fastify')) return 'Fastify';
    
    return undefined;
}

/**
 * Detect test framework
 */
function detectTestFramework(devDeps: string[]): boolean {
    return devDeps.some(dep => 
        dep.includes('jest') ||
        dep.includes('vitest') ||
        dep.includes('mocha') ||
        dep.includes('chai') ||
        dep.includes('@testing-library')
    );
}

/**
 * Detect build tool from scripts
 */
function detectBuildTool(scripts: Record<string, string>): string | undefined {
    const scriptValues = Object.values(scripts).join(' ');
    
    if (scriptValues.includes('vite')) return 'Vite';
    if (scriptValues.includes('webpack')) return 'Webpack';
    if (scriptValues.includes('rollup')) return 'Rollup';
    if (scriptValues.includes('esbuild')) return 'esbuild';
    if (scriptValues.includes('turbo')) return 'Turbo';
    
    return undefined;
}

/**
 * Check if file is a test file
 */
function isTestFile(filePath: string): boolean {
    const fileName = path.basename(filePath).toLowerCase();
    return fileName.includes('.test.') ||
           fileName.includes('.spec.') ||
           fileName.includes('__tests__') ||
           filePath.includes('/tests/') ||
           filePath.includes('\\tests\\');
}

/**
 * Generate context string to append to prompt
 */
export function generateContextString(context: ProjectContext, includeFile: boolean = true): string {
    const parts: string[] = [];
    
    // Active file context
    if (includeFile && context.activeFile) {
        parts.push(`Working in: ${context.activeFile.relativePath} (${context.activeFile.language})`);
    }
    
    // Framework and language
    const tech: string[] = [];
    if (context.framework) tech.push(context.framework);
    if (context.hasTypeScript) tech.push('TypeScript');
    if (context.language && !context.hasTypeScript) tech.push(context.language);
    if (tech.length > 0) {
        parts.push(`Tech stack: ${tech.join(', ')}`);
    }
    
    // Key dependencies (limit to most important)
    const keyDeps = getKeyDependencies(context.dependencies || []);
    if (keyDeps.length > 0) {
        parts.push(`Using: ${keyDeps.join(', ')}`);
    }
    
    // Build tool
    if (context.buildTool) {
        parts.push(`Build: ${context.buildTool}`);
    }
    
    // Test framework
    if (context.hasTests) {
        const testFramework = (context.devDependencies || [])
            .find(dep => dep.includes('jest') || dep.includes('vitest') || dep.includes('mocha'));
        if (testFramework) {
            parts.push(`Tests: ${testFramework}`);
        }
    }
    
    if (parts.length === 0) {
        return '';
    }
    
    return `\n\n📋 **Project Context:**\n${parts.map(p => `- ${p}`).join('\n')}`;
}

/**
 * Get key dependencies to mention (filter out common/less relevant ones)
 */
function getKeyDependencies(deps: string[]): string[] {
    const important = [
        'tailwindcss',
        'prisma',
        'mongoose',
        'sequelize',
        'graphql',
        'apollo',
        'trpc',
        'zod',
        'yup',
        'react-hook-form',
        'formik',
        'axios',
        'swr',
        'react-query',
        'redux',
        'zustand',
        'jotai',
        'shadcn'
    ];
    
    return deps
        .filter(dep => important.some(imp => dep.includes(imp)))
        .slice(0, 5); // Limit to 5 most relevant
}

/**
 * Check if context injection is enabled in settings
 */
export function isContextInjectionEnabled(): boolean {
    const config = vscode.workspace.getConfiguration('clarity');
    return config.get<boolean>('autoInjectContext', true);
}

/**
 * Inject context into prompt if enabled
 */
export async function injectContextIfEnabled(prompt: string): Promise<string> {
    if (!isContextInjectionEnabled()) {
        return prompt;
    }
    
    const context = await extractProjectContext();
    const contextString = generateContextString(context);
    
    if (contextString) {
        return prompt + contextString;
    }
    
    return prompt;
}
