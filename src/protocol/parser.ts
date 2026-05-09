import { ConstraintsDocument, Constraint } from './types';

export class ProtocolParser {
  parseConstraints(content: string): ConstraintsDocument | null {
    try {
      const constraintBlocks = this.extractConstraintBlocks(content);
      const constraints = constraintBlocks.map(block => this.parseConstraint(block));
      const rules = this.extractRules(content);

      return {
        version: this.extractVersion(content) || '1.0',
        lastUpdated: new Date().toISOString(),
        constraints,
        rules,
      };
    } catch {
      return null;
    }
  }

  private extractConstraintBlocks(content: string): string[] {
    const blocks: string[] = [];
    const lines = content.split('\n');
    let currentBlock = '';
    let inBlock = false;

    for (const line of lines) {
      if (line.includes('**') && line.includes(':')) {
        if (currentBlock.trim()) {
          blocks.push(currentBlock.trim());
        }
        currentBlock = line + '\n';
        inBlock = true;
      } else if (inBlock) {
        currentBlock += line + '\n';
        if (line === '---' || line.startsWith('### ')) {
          blocks.push(currentBlock.trim());
          currentBlock = '';
          inBlock = false;
        }
      }
    }

    if (currentBlock.trim()) {
      blocks.push(currentBlock.trim());
    }

    return blocks;
  }

  private parseConstraint(block: string): Constraint {
    const lines = block.split('\n');
    let id = '';
    let rule = '';
    let reason = '';
    let severity: 'error' | 'warning' | 'info' = 'info';
    const forbiddenLibs: string[] = [];
    const antiPatterns: string[] = [];

    for (const line of lines) {
      if (line.startsWith('**') && line.includes(':')) {
        const match = line.match(/\*\*([^*]+)\*\*/);
        if (match) {
          id = match[1].trim();
        }
      }

      if (line.startsWith('**Severity**') || line.startsWith('Severity')) {
        const match = line.match(/:\s*(\w+)/);
        if (match) {
          severity = this.normalizeSeverity(match[1]);
        }
      }

      if (line.startsWith('**Forbidden') || line.includes('~~')) {
        const libs = line.match(/~~([^~]+)~~/g);
        if (libs) {
          forbiddenLibs.push(...libs.map(l => l.replace(/~~/g, '')));
        }
      }

      if (line.startsWith('-') && !line.startsWith('- [')) {
        const trimmed = line.substring(1).trim();
        if (trimmed && !trimmed.includes('**')) {
          rule = trimmed;
        }
      }

      if (line.includes('**Reason**') || line.includes('**Why**')) {
        reason = this.extractReason(line);
      }
    }

    return {
      id: id || rule.substring(0, 20),
      rule,
      reason: reason || 'No reason specified',
      severity,
      forbiddenLibs: forbiddenLibs.length > 0 ? forbiddenLibs : undefined,
      antiPatterns: antiPatterns.length > 0 ? antiPatterns : undefined,
    };
  }

  private extractRules(content: string): string[] {
    const rules: string[] = [];
    const lines = content.split('\n');

    for (const line of lines) {
      if (line.startsWith('- [') || line.startsWith('1.') || line.startsWith('*')) {
        let rule = line;
        const firstSpace = rule.search(/\s/);
        if (firstSpace > 0) {
          rule = rule.substring(firstSpace).trim();
        }
        if (rule && rule.indexOf('**') === -1) {
          rules.push(rule);
        }
      }
    }

    return rules;
  }

  private normalizeSeverity(sev: string): 'error' | 'warning' | 'info' {
    const lower = sev.toLowerCase();
    if (lower.includes('error') || lower.includes('critical')) return 'error';
    if (lower.includes('warn')) return 'warning';
    return 'info';
  }

  private extractReason(line: string): string {
    const match = line.match(/\*\*[^*]+\*\*:\s*(.+)/);
    return match ? match[1].trim() : '';
  }

  private extractVersion(content: string): string | null {
    const match = content.match(/Version[:\s]*(\d+\.\d+)/i);
    return match ? match[1] : null;
  }

  validateConstraint(constraint: Constraint): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!constraint.id) {
      errors.push('Constraint ID is required');
    }

    if (!constraint.rule) {
      errors.push('Constraint rule is required');
    }

    if (!['error', 'warning', 'info'].includes(constraint.severity)) {
      errors.push('Severity must be error, warning, or info');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  formatForAI(constraints: ConstraintsDocument): string {
    const lines: string[] = [];
    lines.push('## Constraints');
    lines.push('');

    for (const c of constraints.constraints) {
      lines.push(`- **[${c.severity.toUpperCase()}]** ${c.rule}`);
      if (c.reason) {
        lines.push(`  - *Why*: ${c.reason}`);
      }
      if (c.forbiddenLibs && c.forbiddenLibs.length > 0) {
        lines.push(`  - *Forbidden*: ${c.forbiddenLibs.join(', ')}`);
      }
    }

    if (constraints.rules.length > 0) {
      lines.push('');
      lines.push('## Rules');
      for (const rule of constraints.rules) {
        lines.push(`- ${rule}`);
      }
    }

    return lines.join('\n');
  }
}