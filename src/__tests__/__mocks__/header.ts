export const ASCII_LOGO = 'CLARITY_AI_ASCII_LOGO';

export function printHeader(): string {
  return ASCII_LOGO;
}

export function printVersion(version: string): string {
  return `v${version} | Cognitive Scaffolding System`;
}

export function printTagline(): string {
  return 'Terminal-based Developer OS — Amethyst & Obsidian Edition';
}