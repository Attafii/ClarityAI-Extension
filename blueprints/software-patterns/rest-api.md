# REST API Blueprint

## Purpose
Generate a complete REST API endpoint following project conventions.

## Variables
- `resource` - Entity name (e.g., users, products, orders)
- `method` - HTTP method (GET, POST, PUT, DELETE, PATCH)
- `auth` - Authentication type (JWT, OAuth, API Key, None)

## Template

\`\`\`
Create a {method} /api/{resource} endpoint:

## Requirements

### Input Validation
- Validate request body/query params at controller boundary
- Return 400 for invalid input with descriptive errors
- Use Zod or Joi for schema validation

### Response Format
- Success: { statusCode } with JSON body
- Error: { statusCode } with { error: string, details?: object }

### HTTP Status Codes
- 200: Success with body
- 201: Created (POST success)
- 204: No Content (DELETE success)
- 400: Bad Request (validation failed)
- 401: Unauthorized (missing/invalid auth)
- 403: Forbidden (insufficient permissions)
- 404: Not Found (resource doesn't exist)
- 500: Internal Server Error (unexpected)

### Security
- Sanitize all inputs before database operations
- Use parameterized queries (never string concatenation)
- Apply rate limiting if auth={JWT|OAuth}
- Set security headers (CSP, HSTS, CORS)

### TypeScript
- Define request/response types in src/types/
- Use interface for request body
- Return typed promises

## Example Response

\`\`\`typescript
// {method} /api/{resource}
interface {Resource}Request {
  // fields based on resource
}

interface {Resource}Response {
  success: boolean;
  data?: {Resource};
  error?: string;
}
\`\`\`

## File Structure

\`\`\`
src/
  controllers/{resource}.controller.ts
  services/{resource}.service.ts
  repositories/{resource}.repository.ts
  types/{resource}.types.ts
  validators/{resource}.validator.ts
  routes/{resource}.routes.ts
\`\`\`

## Dependencies
- Express.js for routing
- TypeORM or Prisma for DB (check stack.md for preference)
- Zod for validation

## Constraints
- Follow constraints.md rules
- No eval(), no innerHTML, no hardcoded secrets
- Write unit tests for controller and service