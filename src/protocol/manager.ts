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
  Blocker,
  StackItem,
} from './types';
import { ProtocolGenerator } from './generator';

export class ProtocolManager {
  private clarityDir: string;

  constructor(private cwd: string) {
    this.clarityDir = path.join(cwd, '.clarity');
    this.ensureClarityDir();
  }

  private ensureClarityDir(): void {
    if (!fs.existsSync(this.clarityDir)) {
      fs.mkdirSync(this.clarityDir, { recursive: true });
    }
  }

  getFilePath(filename: string): string {
    return path.join(this.clarityDir, filename);
  }

  exists(filename: string): boolean {
    return fs.existsSync(this.getFilePath(filename));
  }

  read(filename: string): string | null {
    const filePath = this.getFilePath(filename);
    if (!fs.existsSync(filePath)) return null;
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      return null;
    }
  }

  write(filename: string, content: string): boolean {
    try {
      const filePath = this.getFilePath(filename);
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch {
      return false;
    }
  }

  init(): boolean {
    const files = ['map.md', 'aesthetic.md', 'intent.md', 'constraints.md', 'checkpoint.md', 'stack.md', 'protocol-index.md'];
    let success = true;

    for (const file of files) {
      if (!this.exists(file)) {
        const content = this.getTemplate(file);
        if (content && !this.write(file, content)) {
          success = false;
        }
      }
    }

    return success;
  }

  private getTemplate(filename: string): string | null {
    const templates: Record<string, () => string> = {
      'map.md': () => this.mapTemplate(),
      'aesthetic.md': () => this.aestheticTemplate(),
      'intent.md': () => this.intentTemplate(),
      'constraints.md': () => this.constraintsTemplate(),
      'checkpoint.md': () => this.checkpointTemplate(),
      'stack.md': () => this.stackTemplate(),
      'protocol-index.md': () => ProtocolGenerator.templateMarkdown(),
    };
    const fn = templates[filename];
    return fn ? fn() : null;
  }

  private mapTemplate(): string {
    return `# Semantic Architecture Map

**Project**: ${path.basename(this.cwd)}
**Last Updated**: ${new Date().toISOString()}
**Version**: 1.0

## Overview

This file maps logical flows and dependency relationships within the project, providing AI agents with a semantic understanding of how components interact.

## Nodes

<!-- Add dependency nodes below -->

## Edges

<!-- Add dependency edges below -->

## Flows

### Authentication Flow

\`\`\`
[Client] -> [API Gateway] -> [Auth Service] -> [User Service] -> [Database]
\`\`\`

## Notes

- All flows should be traced through this map
- Update this file when adding new services or changing dependencies
- Use semantic descriptions, not just file paths
`;
  }

  private aestheticTemplate(): string {
    return `# Design DNA

**Last Updated**: ${new Date().toISOString()}
**Version**: 1.0

## Theme: Amethyst & Obsidian

A premium "noble" aesthetic combining deep purple amethyst tones with matte black obsidian surfaces.

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| \`--color-primary\` | #9966CC | Primary actions, highlights |
| \`--color-secondary\` | #7744AA | Secondary elements |
| \`--color-accent\` | #CC99EE | Accents, glows |
| \`--color-background\` | #1A1A1A | Main background |
| \`--color-surface\` | #2D2D2D | Cards, panels |
| \`--color-text\` | #E8E8E8 | Primary text |
| \`--color-text-muted\` | #888888 | Secondary text |
| \`--color-border\` | #4A4A4A | Borders, dividers |
| \`--color-success\` | #44CC88 | Success states |
| \`--color-warning\` | #CCAA44 | Warning states |
| \`--color-error\` | #CC4444 | Error states |

## Typography

- **Primary**: Inter (sans-serif)
- **Monospace**: JetBrains Mono

## Glassmorphism

\`\`\`css
.glass-panel {
  background: linear-gradient(
    135deg,
    rgba(153, 102, 204, 0.1),
    rgba(26, 26, 26, 0.8)
  );
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid rgba(153, 102, 204, 0.2);
}
\`\`\`

## Usage

- Use \`--color-primary\` for interactive elements
- Use \`--color-surface\` for cards and containers
- Use \`--color-background\` for the main canvas
- Apply \`glass-panel\` class for elevated surfaces
`;
  }

  private intentTemplate(): string {
    return `# Architectural Intent

**Last Updated**: ${new Date().toISOString()}
**Version**: 1.0

## Purpose

This file records major architectural decisions to prevent AI "logic drift" - ensuring consistent decision-making across sessions and agents.

## Decision Records (ADRs)

### ADR-001: Project Architecture

**Date**: ${new Date().toISOString().split('T')[0]}
**Status**: Accepted

**Context**:
ClarityAI is a VS Code extension with a CLI companion, designed to enhance developer prompts for AI coding assistants.

**Decision**:
- Use TypeScript for type safety
- Follow layered architecture (UI / Business Logic / Data)
- Keep VS Code extension logic separate from CLI logic
- Use JSON for configuration and state persistence

**Consequences**:
- + Strong type safety across codebase
- + Clear separation of concerns
- + Easy to test individual layers
- - Requires build step (TypeScript compilation)

## Notes

- Add new ADRs when making significant architectural decisions
- Include context, decision, and consequences for each ADR
`;
  }

  private constraintsTemplate(): string {
    return `# Constraints & Boundaries

**Last Updated**: ${new Date().toISOString()}
**Version**: 1.0

## Purpose

This file defines what's NOT allowed in the project, preventing AI agents from introducing anti-patterns or using forbidden libraries.

## Forbidden Libraries

| Library | Reason | Alternative |
|---------|--------|-------------|
| ~~eval()~~ | Security risk | Use proper function references |
| ~~innerHTML~~ | XSS vulnerability | Use textContent or sanitized HTML |

## Anti-Patterns

### Security Anti-Patterns

- **SQL Injection**: Never concatenate user input into SQL strings. Use parameterized queries.
- **XSS**: Never set innerHTML with user input. Always sanitize.

### Code Quality Anti-Patterns

- **God Objects**: Don't create classes/modules that do everything.
- **Spaghetti Code**: Don't create circular dependencies.
- **Magic Numbers**: Don't use unexplained numbers. Use named constants.

### Performance Anti-Patterns

- **N+1 Queries**: Don't make multiple database calls in loops.
- **Sync I/O**: Don't use sync file operations in request handlers.

## Rules

1. **Input Validation**: Validate all inputs at API boundaries
2. **Type Safety**: Use TypeScript strict mode
3. **Error Handling**: Never swallow errors
4. **Security**: Follow OWASP Top 10 guidelines
`;
  }

  private checkpointTemplate(): string {
    return `# Checkpoint: State Memory

**Last Updated**: ${new Date().toISOString()}
**Version**: 1.0

## Current Goal

<!-- Describe the current goal being worked toward -->

## Goal Description

<!-- Detailed description of what success looks like -->

## Progress Steps

### Completed

- [ ]

### In Progress

- [ ]

### Pending

- [ ]

## Tasks

### Pending Tasks

| ID | Description | Priority | Depends On |
|----|-------------|----------|-----------|
| | | | |

## Blockers

| ID | Description | Severity | Created | Resolved |
|----|-------------|----------|---------|----------|
| | | | | |

## Notes

- Update this file at the end of each AI session
`;
  }

  private stackTemplate(): string {
    return `# Technology Stack

**Last Updated**: ${new Date().toISOString()}
**Version**: 1.0

## Runtime

| Name | Version | Purpose |
|------|---------|---------|
| Node.js | ${process.version.replace('v', '')} | JavaScript runtime |

## Language

| Name | Version | Purpose |
|------|---------|---------|
| TypeScript | ^5.x | Primary language |

## Framework

| Name | Version | Purpose |
|------|---------|---------|
| VS Code Extension | ^1.90.0 | IDE integration |

## Tools

| Name | Version | Purpose |
|------|---------|---------|
| npm | ^10.x | Package manager |
| TypeScript | ^5.x | Type checking |
| Jest | ^29.x | Testing |

## Notes

- All dependency versions should be pinned in package.json
- Update this file when upgrading dependencies
- Verify Node.js version compatibility before upgrading

## Version Consistency

AI agents must ensure all generated code is compatible with the versions listed above.
`;
  }

  private readPackageJson(): Record<string, unknown> | null {
    try {
      const pkgPath = path.join(this.cwd, 'package.json');
      if (!fs.existsSync(pkgPath)) return null;
      const raw = fs.readFileSync(pkgPath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private formatDependencies(deps: Record<string, string>): string {
    return Object.entries(deps)
      .map(([name, version]) => `| ${name} | ${version} | |`)
      .join('\n');
  }
}