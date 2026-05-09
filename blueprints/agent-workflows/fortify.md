# Agent Workflow Blueprint: fortify

## Purpose
A workflow for hardening code against security vulnerabilities and edge cases.

## Context Gathering

Before fortifying, gather:
- **Target**: Files/components to harden
- **Threat model**: What threats are relevant
- **Stack**: Technology versions (from stack.md)
- **Constraints**: Security rules from constraints.md

## Workflow Steps

### 1. Scan Surface
- Identify input vectors (API endpoints, user inputs, file uploads)
- Map data flow from input to storage/processing
- Identify authentication and authorization points

### 2. Evaluate Against OWASP Top 10
- [ ] A01:2021 - Broken Access Control
- [ ] A02:2021 - Cryptographic Failures
- [ ] A03:2021 - Injection
- [ ] A04:2021 - Insecure Design
- [ ] A05:2021 - Security Misconfiguration
- [ ] A06:2021 - Vulnerable Components
- [ ] A07:2021 - Auth Failures
- [ ] A08:2021 - Data Integrity Failures
- [ ] A09:2021 - Logging Failures
- [ ] A10:2021 - SSRF

### 3. Apply Security Patterns

#### Input Validation
\`\`\`typescript
// Validate and sanitize ALL inputs
const validated = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(150),
}).parse(userInput);
\`\`\`

#### Parameterized Queries
\`\`\`typescript
// NEVER: db.query('SELECT * FROM users WHERE id = ' + userId)
// ALWAYS: db.query('SELECT * FROM users WHERE id = $1', [userId])
\`\`\`

#### Auth & Sessions
\`\`\`typescript
// Use secure session management
// HttpOnly, Secure, SameSite cookies
// JWT with short expiry + refresh
\`\`\`

#### Error Handling
\`\`\`typescript
// Never expose internal details in errors
// Log internally, return generic message to client
\`\`\`

### 4. Test Security
- Unit tests for validation logic
- Integration tests for auth flows
- Fuzz testing for input vectors
- Dependency audit (npm audit)

### 5. Document
\`\`\`
clarity checkpoint --update
\`\`\`
- Note security improvements made
- Update constraints.md if new rules needed
- Document any security-relevant architectural decisions in intent.md

## Security Checklist

- [ ] All inputs validated and sanitized
- [ ] Parameterized queries (no SQL injection)
- [ ] No innerHTML with user input
- [ ] No eval() with user input
- [ ] Auth tokens have expiry
- [ ] Sensitive data not logged
- [ ] HTTPS in production
- [ ] Security headers set (CSP, HSTS, CORS)
- [ ] Dependencies up to date
- [ ] Error messages don't leak internals

## Anti-Patterns (Forbidden from constraints.md)
- ❌ eval()
- ❌ innerHTML with user input
- ❌ String concatenation in SQL
- ❌ Hardcoded secrets
- ❌ Weak cryptographic random

## Output Format

\`\`\`markdown
# Security Hardening Report

## Components Hardened
- [Component 1]
- [Component 2]

## Threats Mitigated
- [Threat 1]: [Mitigation]
- [Threat 2]: [Mitigation]

## Security Tests Added
- [Test name]: [What it validates]

## Dependencies Updated
- [Package]: [Old -> New]

## Verification
- [x] OWASP Top 10 check passed
- [x] Input validation tests pass
- [x] Auth tests pass
- [x] No secrets in logs
\`\`\`

## Next Step
After hardening, use `clarity generate test` to ensure comprehensive test coverage.