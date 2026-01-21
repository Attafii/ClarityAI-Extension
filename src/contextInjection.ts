/**
 * Automatic code context injection for better prompts
 */

import * as vscode from 'vscode';
import * as path from 'path';

export interface ProjectContext {
    framework?: string;
    language?: string;
    dependencies?: Record<string, string>; // name -> version
    devDependencies?: Record<string, string>; // name -> version
    activeFile?: {
        language: string;
        relativePath: string;
        isTest: boolean;
    };
    buildTool?: string;
    hasTypeScript?: boolean;
    hasTests?: boolean;
    workspaceMap?: string[]; // Simplified semantic relationship map
    customRules?: string; // Content from .clarityrules
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
    
    // Generate workspace map for better indexing
    context.workspaceMap = await generateWorkspaceMap();

    // Read .clarityrules if it exists
    context.customRules = await readClarityRules();
    
    return context;
}

/**
 * Reads .clarityrules file from the workspace root
 */
async function readClarityRules(): Promise<string | undefined> {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return undefined;

        const clarityRulesUri = vscode.Uri.joinPath(workspaceFolders[0].uri, '.clarityrules');
        const content = await vscode.workspace.fs.readFile(clarityRulesUri);
        return content.toString().trim();
    } catch (error) {
        // File doesn't exist
        return undefined;
    }
}

/**
 * Generates a semantic map of the workspace exports and structure
 */
async function generateWorkspaceMap(): Promise<string[]> {
    const map: string[] = [];
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) return [];

        // Find important files (limit to 10 for performance)
        const files = await vscode.workspace.findFiles('src/**/*.{ts,js,tsx,jsx}', '**/node_modules/**', 10);
        
        for (const file of files) {
            const content = await vscode.workspace.fs.readFile(file);
            const text = content.toString();
            const relativePath = vscode.workspace.asRelativePath(file);
            
            // Extract public exports (simplified regex)
            const exports = text.match(/export (class|function|const|interface) (\w+)/g);
            if (exports) {
                const names = exports.map(e => e.split(' ').pop());
                map.push(`${relativePath} exports: ${names.join(', ')}`);
            }
        }
        
        return map;
    } catch (error) {
        console.error('Failed to generate workspace map:', error);
        return [];
    }
}

/**
 * Reads and parses package.json
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
            dependencies: packageJson.dependencies || {},
            devDependencies: packageJson.devDependencies || {}
        };
        
        // Detect framework
        context.framework = detectFramework(
            Object.keys(context.dependencies || {}), 
            Object.keys(context.devDependencies || {})
        );
        
        // Detect TypeScript
        context.hasTypeScript = 
            (context.devDependencies && 'typescript' in context.devDependencies) ||
            (context.dependencies && 'typescript' in context.dependencies) ||
            false;
            
        // Detect test framework
        context.hasTests = detectTestFramework(Object.keys(context.devDependencies || {}));
        
        // Detect build tool
        context.buildTool = detectBuildTool(packageJson.scripts || {});
        
        return context;
    } catch (error) {
        // package.json doesn't exist or can't be read
        return null;
    }
}

/**
 * Prunes the workspace map based on the prompt content to save tokens
 */
function pruneWorkspaceMap(map: string[], prompt: string): string[] {
    const promptLower = prompt.toLowerCase();
    
    // Keywords for different modules
    const domainKeywords: Record<string, string[]> = {
        'ui': ['ui', 'component', 'button', 'form', 'layout', 'style', 'color', 'theme', 'view', 'page'],
        'auth': ['auth', 'login', 'security', 'token', 'user', 'session', 'permission', 'role'],
        'db': ['db', 'database', 'model', 'schema', 'prisma', 'mongoose', 'sql', 'query', 'entity'],
        'api': ['api', 'route', 'endpoint', 'fetch', 'server', 'request', 'response', 'rest', 'graphql'],
        'test': ['test', 'spec', 'jest', 'vitest', 'playwright', 'expect', 'assert']
    };

    // Determine relevant domains
    const relevantDomains = Object.keys(domainKeywords).filter(domain => 
        domainKeywords[domain].some(keyword => promptLower.includes(keyword))
    );

    // If no specific domains detected, keep a shorter overview (max 10)
    if (relevantDomains.length === 0) {
        return map.slice(0, 10);
    }

    // Filter map by relevant domains
    const filtered = map.filter(entry => 
        relevantDomains.some(domain => entry.toLowerCase().includes(domain) || 
                                     domainKeywords[domain].some(kw => entry.toLowerCase().includes(kw)))
    );

    // Ensure we don't return an empty map, and cap it at 20 entries
    return filtered.length > 0 ? filtered.slice(0, 20) : map.slice(0, 10);
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
    if (context.framework) {
        let fwName = context.framework;
        const allDeps = { ...(context.dependencies || {}), ...(context.devDependencies || {}) };
        const fwKey = fwName.toLowerCase().includes('next') ? 'next' : 
                    fwName.toLowerCase().includes('react') ? 'react' :
                    fwName.toLowerCase().includes('vue') ? 'vue' :
                    fwName.toLowerCase().includes('angular') ? '@angular/core' :
                    fwName.toLowerCase().includes('svelte') ? 'svelte' : '';
        
        if (fwKey && allDeps[fwKey]) {
            fwName += ` (v${allDeps[fwKey].replace(/[\^~]/, '')})`;
        }
        tech.push(fwName);
    }
    
    if (context.hasTypeScript) {
        const tsVersion = (context.devDependencies && context.devDependencies['typescript']) || 
                         (context.dependencies && context.dependencies['typescript']);
        tech.push(`TypeScript${tsVersion ? ` (v${tsVersion.replace(/[\^~]/, '')})` : ''}`);
    }
    
    if (context.language && !context.hasTypeScript) tech.push(context.language);
    if (tech.length > 0) {
        parts.push(`Tech stack: ${tech.join(', ')}`);
    }
    
    // Key dependencies (limit to most important)
    const keyDeps = getKeyDependencies(context.dependencies || {});
    if (keyDeps.length > 0) {
        parts.push(`Using: ${keyDeps.join(', ')}`);
    }
    
    // Build tool
    if (context.buildTool) {
        parts.push(`Build: ${context.buildTool}`);
    }
    
    // Test framework
    if (context.hasTests) {
        const testDep = Object.keys(context.devDependencies || {})
            .find(dep => dep.includes('jest') || dep.includes('vitest') || dep.includes('mocha'));
        
        if (testDep) {
            const version = (context.devDependencies || {})[testDep];
            parts.push(`Tests: ${testDep}${version ? ` (v${version.replace(/[\^~]/, '')})` : ''}`);
        }
    }
    
    // Workspace semantic map
    if (context.workspaceMap && context.workspaceMap.length > 0) {
        parts.push(`Workspace Layout:\n    ${context.workspaceMap.join('\n    ')}`);
    }

    // Custom Rules from .clarityrules
    if (context.customRules) {
        parts.push(`USER-DEFINED PROJECT RULES:\n${context.customRules}`);
    }
    
    if (parts.length === 0) {
        return '';
    }
    
    return `\n\n📋 **Project Context:**\n${parts.map(p => `- ${p}`).join('\n')}`;
}

/**
 * Get key dependencies to mention (filter out common/less relevant ones)
 */
function getKeyDependencies(deps: Record<string, string>): string[] {
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
    
    return Object.entries(deps)
        .filter(([name]) => important.some(imp => name.includes(imp)))
        .map(([name, version]) => `${name} (v${version.replace(/[\^~]/, '')})`)
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
    
    // v1.3.1: Apply Context Compression (Token Optimization)
    if (context.workspaceMap) {
        context.workspaceMap = pruneWorkspaceMap(context.workspaceMap, prompt);
    }

    const contextString = generateContextString(context);
    
    if (contextString) {
        return prompt + contextString;
    }
    
    return prompt;
}
