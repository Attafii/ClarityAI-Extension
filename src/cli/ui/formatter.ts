import { THEME } from './theme';
import { createBox, createDimBox } from './boxes';
import { printHeader, printVersion, printTagline } from './header';
import chalk from 'chalk';

export type OutputFormat = 'text' | 'json' | 'copilot';

export interface FormatterOptions {
  format?: OutputFormat;
  withHeader?: boolean;
  withBox?: boolean;
  boxTitle?: string;
  colorize?: boolean;
}

export class OutputFormatter {
  private format: OutputFormat;
  private withHeader: boolean;
  private colorize: boolean;

  constructor(options: FormatterOptions = {}) {
    this.format = options.format || 'text';
    this.withHeader = options.withHeader ?? true;
    this.colorize = options.colorize ?? true;
  }

  formatOutput(content: string, meta?: Record<string, unknown>): string | object {
    if (this.format === 'json') {
      return {
        output: content,
        timestamp: new Date().toISOString(),
        ...meta,
      };
    }

    if (this.format === 'copilot') {
      return `@copilot\n${content}`;
    }

    return content;
  }

  header(version: string): string {
    if (!this.withHeader) return '';
    return `${printHeader()}\n${printVersion(version)}\n${printTagline()}\n`;
  }

  section(title: string, content: string): string {
    return createDimBox(`\n${title}\n${'─'.repeat(40)}\n${content}`);
  }

  success(content: string): string {
    return `${THEME.success}✓${THEME.obsidian.text} ${content}`;
  }

  error(content: string): string {
    return `${THEME.error}✗${THEME.obsidian.text} ${content}`;
  }

  warning(content: string): string {
    return `${THEME.warning}⚠${THEME.obsidian.text} ${content}`;
  }

  info(content: string): string {
    return `${THEME.info}ℹ${THEME.obsidian.text} ${content}`;
  }

  dim(content: string): string {
    return `${THEME.obsidian.muted}${content}${THEME.obsidian.text}`;
  }

  highlight(content: string): string {
    return `${THEME.amethyst.primary}${content}${THEME.obsidian.text}`;
  }

  title(text: string): string {
    return `${THEME.amethyst.glow}◆ ${text}`;
  }

  subtitle(text: string): string {
    return `${THEME.amethyst.light}▸ ${text}`;
  }

  prompt(text: string): string {
    return `${THEME.amethyst.primary}❯ ${THEME.obsidian.text}${text}`;
  }

  code(content: string, lang?: string): string {
    return `\`\`\`${lang || ''}\n${content}\n\`\`\``;
  }

  divider(char = '─', length = 40): string {
    return char.repeat(length);
  }

  spacer(): string {
    return '\n';
  }

  formatError(err: Error | string): string {
    const message = typeof err === 'string' ? err : err.message;
    return this.error(`Error: ${message}`);
  }

  formatSuccess(message: string): string {
    return this.success(message);
  }

  formatWarning(message: string): string {
    return this.warning(message);
  }

  formatInfo(message: string): string {
    return this.info(message);
  }
}

export function createFormatter(options?: FormatterOptions): OutputFormatter {
  return new OutputFormatter(options);
}