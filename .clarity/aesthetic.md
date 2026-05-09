# Design DNA

**Last Updated**: 2026-05-08T21:20:27.616Z
**Version**: 1.0

## Theme: Amethyst & Obsidian

A premium "noble" aesthetic combining deep purple amethyst tones with matte black obsidian surfaces.

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | #9966CC | Primary actions, highlights |
| `--color-secondary` | #7744AA | Secondary elements |
| `--color-accent` | #CC99EE | Accents, glows |
| `--color-background` | #1A1A1A | Main background |
| `--color-surface` | #2D2D2D | Cards, panels |
| `--color-text` | #E8E8E8 | Primary text |
| `--color-text-muted` | #888888 | Secondary text |
| `--color-border` | #4A4A4A | Borders, dividers |
| `--color-success` | #44CC88 | Success states |
| `--color-warning` | #CCAA44 | Warning states |
| `--color-error` | #CC4444 | Error states |

## Typography

- **Primary**: Inter (sans-serif)
- **Monospace**: JetBrains Mono

## Glassmorphism

```css
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
```

## Usage

- Use `--color-primary` for interactive elements
- Use `--color-surface` for cards and containers
- Use `--color-background` for the main canvas
- Apply `glass-panel` class for elevated surfaces
