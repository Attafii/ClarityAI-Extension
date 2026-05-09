import boxen from 'boxen';
import { THEME, STYLING } from './theme';

export interface BoxOptions {
  title?: string;
  padding?: number;
  borderColor?: string;
  dimBorder?: boolean;
  align?: 'left' | 'center';
}

export function createBox(content: string, options: BoxOptions = {}): string {
  const {
    title,
    padding = STYLING.boxPadding,
    borderColor = THEME.amethyst.primary,
    dimBorder = true,
  } = options;

  return boxen(content, {
    title,
    padding,
    borderStyle: dimBorder ? 'round' : 'bold',
    borderColor,
  });
}

export function createSection(title: string, content: string): string {
  return createBox(content, { title, padding: 1 });
}

export function createInfoBox(content: string): string {
  return createBox(content, {
    borderColor: THEME.info,
    dimBorder: true,
  });
}

export function createSuccessBox(content: string): string {
  return createBox(content, {
    borderColor: THEME.success,
    dimBorder: false,
  });
}

export function createWarningBox(content: string): string {
  return createBox(content, {
    borderColor: THEME.warning,
    dimBorder: false,
  });
}

export function createErrorBox(content: string): string {
  return createBox(content, {
    borderColor: THEME.error,
    dimBorder: false,
  });
}

export function createDimBox(content: string): string {
  return createBox(content, {
    borderColor: THEME.obsidian.border,
    dimBorder: true,
  });
}