# Constraints & Boundaries

**Last Updated**: 2026-05-08T21:20:27.619Z
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
