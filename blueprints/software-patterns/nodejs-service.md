# Node.js Service Blueprint

## Purpose
Generate a Node.js service class following project patterns.

## Variables
- `name` - Service name (e.g., PaymentService, NotificationService)
- `dependencies` - External service dependencies

## Template

\`\`\`
Create a {name} service:

## Requirements

### Architecture
- Follow single responsibility principle
- Dependency injection for external dependencies
- Interface-based design for testability

### Error Handling
- Throw typed errors (AppError subclasses)
- Never swallow errors silently
- Log errors with context before throwing

### TypeScript
- Strict mode enabled
- Define return types for all public methods
- Use async/await (no callback pattern)

### Methods
- Each method does one thing
- Public methods are entry points
- Private methods for reusable logic
- Keep functions under 50 lines

### Dependencies

\`\`\`typescript
class {name}Service {
  constructor(
    private readonly logger: Logger,
    private readonly config: Config,
    {dependencies}
  ) {}
}
\`\`\`

## File Structure

\`\`\`
src/services/{name}/
  {name}.service.ts
  {name}.interface.ts
  {name}.errors.ts
  {name}.test.ts
\`\`\`

## Dependencies
- Winston or Pino for logging
- Config management (check stack.md)

## Constraints
- No sync file operations
- No hardcoded values (use config)
- Log all error contexts
- Write unit tests with mocks