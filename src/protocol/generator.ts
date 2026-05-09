import * as fs from 'fs';
import * as path from 'path';
import {
  SemanticMap,
  AestheticConfig,
  IntentDocument,
  ConstraintsDocument,
  Checkpoint,
  StackDocument,
  DependencyNode,
  DependencyEdge,
  Flow,
  ArchitecturalDecision,
  Constraint,
  CheckpointStep,
  CheckpointTask,
  StackItem,
} from './types';

export class ProtocolGenerator {
  constructor(private cwd: string, private clarityDir: string) {}

  private ensureDir(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  generateMap(nodes: DependencyNode[], edges: DependencyEdge[], flows: Flow[]): SemanticMap {
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      projectName: this.getProjectName(),
      nodes,
      edges,
      flows,
    };
  }

  generateAesthetic(): AestheticConfig {
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      colors: {
        primary: '#9966CC',
        secondary: '#7744AA',
        accent: '#CC99EE',
        background: '#1A1A1A',
        surface: '#2D2D2D',
        text: '#E8E8E8',
        textMuted: '#888888',
        border: '#4A4A4A',
        success: '#44CC88',
        warning: '#CCAA44',
        error: '#CC4444',
      },
      typography: {
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        fontFamilyMono: 'JetBrains Mono, Fira Code, monospace',
        fontSizes: {
          xs: '0.75rem',
          sm: '0.875rem',
          base: '1rem',
          lg: '1.125rem',
          xl: '1.25rem',
          '2xl': '1.5rem',
          '3xl': '1.875rem',
        },
        fontWeights: {
          normal: 400,
          medium: 500,
          semibold: 600,
          bold: 700,
        },
        lineHeights: {
          tight: 1.25,
          normal: 1.5,
          relaxed: 1.625,
        },
      },
      glassmorphism: {
        blur: '12px',
        opacity: 0.85,
        saturation: 180,
        gradient: ['rgba(153, 102, 204, 0.1)', 'rgba(26, 26, 26, 0.8)'],
        borderRadius: '16px',
      },
      shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.5)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.5)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        glow: '0 0 20px rgba(153, 102, 204, 0.3)',
      },
    };
  }

  generateIntent(decisions: ArchitecturalDecision[]): IntentDocument {
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      decisions,
    };
  }

  generateConstraints(constraints: Constraint[]): ConstraintsDocument {
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      constraints,
      rules: [
        'Always validate all inputs at API boundaries',
        'Use parameterized queries to prevent SQL injection',
        'Never log sensitive data (tokens, keys, PII)',
        'Prefer composition over inheritance',
        'Keep functions small and single-purpose',
        'Write tests before debugging',
        'Use TypeScript strict mode',
        'Follow security headers (CSP, HSTS, CORS)',
      ],
    };
  }

  generateCheckpoint(
    currentGoal: string,
    goalDescription: string,
    steps: CheckpointStep[],
    pendingTasks: CheckpointTask[],
    completedTasks: CheckpointTask[],
    blockers: { id: string; description: string; severity: 'critical' | 'major' | 'minor'; createdAt: string; resolvedAt?: string }[]
  ): Checkpoint {
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      currentGoal,
      goalDescription,
      steps,
      pendingTasks,
      completedTasks,
      blockers,
    };
  }

  generateStack(
    runtime: StackItem,
    framework: StackItem | undefined,
    language: StackItem,
    dependencies: StackItem[],
    devDependencies: StackItem[],
    tools: StackItem[]
  ): StackDocument {
    return {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      runtime,
      framework,
      language,
      dependencies,
      devDependencies,
      tools,
    };
  }

  private getProjectName(): string {
    const packageJson = this.readJsonFile(path.join(this.cwd, 'package.json'));
    const name = packageJson?.name;
    return (typeof name === 'string' ? name : null) || path.basename(this.cwd);
  }

  private readJsonFile(filePath: string): Record<string, unknown> | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  static templateMarkdown(): string {
    return `---
title: ClarityAI Protocol
version: 1.5.0
description: Cognitive scaffolding files for AI agent alignment
generated: ${new Date().toISOString()}
---

# ClarityAI Protocol

This directory contains cognitive files that provide long-term memory and architectural context for AI agents.

## Files

- **map.md** - Semantic architecture and dependency graphs
- **aesthetic.md** - Design DNA and visual standards
- **intent.md** - Architectural decisions (ADRs)
- **constraints.md** - Forbidden patterns and boundaries
- **checkpoint.md** - Current goal state and progress
- **stack.md** - Technology stack versions

## Usage

AI agents should read these files at the start of each session to understand:
1. Project structure and logical flows
2. Design standards and visual identity
3. Why certain decisions were made
4. What is not allowed (anti-patterns)
5. Current goals and pending tasks
6. Exact versions of all technologies in use

This prevents "logic drift" where AI agents make inconsistent decisions across sessions.
`;
  }
}