# React Component Blueprint

## Purpose
Generate a React component following project conventions and accessibility standards.

## Variables
- `name` - Component name (e.g., UserCard, ProductGrid)
- `props` - Comma-separated prop names with types
- `features` - Feature list (e.g., loading, error, empty)

## Template

\`\`\`
Create a {name} React component:

## Requirements

### TypeScript
- Use functional component with hooks
- Define Props interface with JSDoc
- No \`any\` types

### Props Interface

\`\`\`typescript
interface {name}Props {
  // Define props with types and JSDoc
  {props}
}
\`\`\`

### Accessibility (WCAG 2.1 AA)
- Use semantic HTML elements
- Add ARIA labels for interactive elements
- Support keyboard navigation
- Maintain color contrast ratio 4.5:1 minimum
- Add focus indicators

### State Management
- Use useState for local state
- Use useReducer for complex state
- Lift state only when necessary
- Consider composition over prop drilling

### Error & Loading States
- Show loading skeleton during async
- Display user-friendly error messages
- Handle empty state gracefully

### Styling
- Use CSS modules or Tailwind (check aesthetic.md)
- Follow glassmorphism guidelines
- Mobile-first responsive design
- Support dark/light theme if applicable

## File Structure

\`\`\`
src/components/{name}/
  {name}.tsx
  {name}.module.css (or .module.scss)
  {name}.test.tsx
  index.ts
\`\`\`

## Dependencies
- React ^18.x
- TypeScript
- Testing Library (if tests enabled)

## Constraints
- Follow aesthetic.md design tokens
- No inline styles (use classes)
- Write tests for component behavior