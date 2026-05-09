import { THEME } from './theme';

export const ASCII_LOGO = `
${THEME.amethyst.primary} ██████╗██╗  ██╗ █████╗ ███╗   ██╗██╗  ██╗    ██╗   ██╗ ██████╗ ██╗   ██╗██╗
${THEME.amethyst.light} ██╔════╝██║  ██║██╔══██╗████╗  ██║██║ ██╔╝    ╚██╗ ██╔╝██╔═══██╗██║   ██║██║
${THEME.amethyst.dark} █████╗  ███████║███████║██╔██╗ ██║█████╔╝      ╚████╔╝ ██║   ██║██║   ██║██║
${THEME.amethyst.primary} ██╔══╝  ██╔══██║██╔══██║██║╚██╗██║██╔═██╗       ╚██╔╝  ██║   ██║██║   ██║██║
${THEME.amethyst.dark} ██║     ██║  ██║██║  ██║██║ ╚████║██║  ██╗       ██║   ╚██████╔╝╚██████╔╝██║
${THEME.amethyst.glow} ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝       ╚═╝    ╚═════╝  ╚═════╝ ╚═╝
`;

export function printHeader(): string {
  return ASCII_LOGO;
}

export function printVersion(version: string): string {
  return `${THEME.amethyst.primary} v${version} ${THEME.obsidian.muted}| Cognitive Scaffolding System`;
}

export function printTagline(): string {
  return `${THEME.obsidian.muted}Terminal-based Developer OS — Amethyst & Obsidian Edition`;
}