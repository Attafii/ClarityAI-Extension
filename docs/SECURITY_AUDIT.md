# ClarityAI Security Audit - Secret Shield

## Overview
This document outlines the security audit checklist for ClarityAI's **Secret Shield** privacy guardrail. Secret Shield is a local-first privacy tool that automatically detects and masks sensitive data (API keys, secrets, PII) before prompts leave the user's machine.

---

## 1. Pattern Coverage Verification

### AWS Credentials
- [ ] **AWS Access Key Pairs**
  - Format: `AKIA` followed by 16 alphanumeric characters
  - Test cases:
    - `AKIAIOSFODNN7EXAMPLE` ✓ Must detect
    - Partial key in documentation ✓ Must detect
    - Random AKIA-like string ✗ Minimize false positives

- [ ] **AWS Secret Access Keys**
  - Format: 40-character base64-like string
  - Test with real patterns from AWS documentation (sanitized)

### GitHub Credentials
- [ ] **GitHub Personal Access Tokens (PAT)**
  - Prefixes to check: `ghp_` (repo scope), `ghs_` (server token), `ghu_` (user token)
  - Example: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

- [ ] **GitHub OAuth Tokens**
  - Format: Various, but recognizable patterns

### API Keys - Third Party Services
- [ ] **Stripe API Keys**
  - Live keys: `sk_live_` prefix
  - Test keys: `sk_test_` prefix
  - Publishable keys: `pk_live_` and `pk_test_`

- [ ] **OpenAI API Keys**
  - Format: `sk-` followed by alphanumeric string

- [ ] **Google API Keys**
  - Format: Long base64 string or AIza prefix

- [ ] **Firebase Credentials**
  - Service account JSON keys
  - Database URLs and API keys

- [ ] **Twilio API Keys**
  - Auth token format detection

### JWT Tokens
- [ ] **JWT Signature Detection**
  - Pattern: Three base64-url encoded segments separated by dots
  - Test with real JWT examples (sanitized)
  - Verify base64url segment structure

### Network Identifiers
- [ ] **IPv4 Addresses**
  - Test vs. false positives (e.g., version numbers like 1.2.3.4)
  - Exclude private IP ranges where appropriate
  - Handle edge cases (0.0.0.0, 255.255.255.255)

- [ ] **IPv6 Addresses**
  - Format detection
  - Abbreviated format handling

### Email Addresses
- [ ] **Email Pattern Matching**
  - Basic RFC 5322 subset
  - Test with edge cases: multiple dots, subdomains, etc.
  - Balance detection with false positives (test@example.com should be masked)

### Private Keys
- [ ] **RSA Private Keys**
  - Markers: `-----BEGIN RSA PRIVATE KEY-----`
  - PEM format detection
  - OpenSSH format detection

- [ ] **OpenSSH Private Keys**
  - Format: `-----BEGIN OPENSSH PRIVATE KEY-----`

- [ ] **OpenPGP/GPG Keys**
  - Markers: `-----BEGIN PGP PRIVATE KEY BLOCK-----`

- [ ] **SSL/TLS Certificates**
  - Both private keys and public certificates

### Database Connection Strings
- [ ] **MongoDB Connection Strings**
  - Format: `mongodb://user:pass@host:port/db`
  - Connection string with credentials detection

- [ ] **PostgreSQL Connection Strings**
  - Format: `postgres://user:pass@host/db`
  - Also `postgresql://` variant

- [ ] **MySQL Connection Strings**
  - Format: `mysql://user:pass@host/db`

- [ ] **Other Database URLs**
  - Redis, Elasticsearch, etc.

### Docker/Container Registries
- [ ] **Docker Registry Tokens**
  - Authentication tokens for Docker Hub, ECR, GCR, etc.

### Kubernetes
- [ ] **Service Account Tokens**
  - Bearer token format used in k8s

---

## 2. False Positive Testing

### Document Examples
- [ ] Generic placeholder examples (`example@test.com`, `192.168.1.1`) should be masked but documented
- [ ] Common documentation patterns (e.g., sample configs with sample@localhost)
- [ ] Code comments with example values

### Version Numbers & Identifiers
- [ ] Semantic versions (1.2.3 format) - should NOT match as IP address
- [ ] UUID/GUID formats - should NOT match as API key
- [ ] Build numbers and timestamps

### Generated/Random Examples
- [ ] Lorem ipsum variations
- [ ] Random hex strings (unless very specific patterns like AWS keys)
- [ ] Test data patterns

### Special Cases
- [ ] Markdown code blocks and fenced code
- [ ] Configuration file examples
- [ ] Language-specific patterns (e.g., Python `'` vs `"` strings)

**Target False Positive Rate:** < 2% on real usage data

---

## 3. Masking Quality Verification

### Complete Coverage
- [ ] All detected secrets completely replaced (no partial visibility)
- [ ] Test with multiple secrets in single prompt
- [ ] Test with nested/escaped secrets

### Masking Format
- [ ] Secrets replaced with `[REDACTED {TYPE}]` format
- [ ] Example: `[REDACTED AWS_ACCESS_KEY]`, `[REDACTED JWT_TOKEN]`
- [ ] Surrounding context preserved (e.g., `api_key=` prefix stays visible)

### Performance
- [ ] Speed with 100-character prompt: < 10ms
- [ ] Speed with 8192-character prompt: < 100ms
- [ ] Memory usage stable (no memory leaks with large inputs)

### Regex Safety
- [ ] **ReDoS (Regular Expression Denial of Service) Prevention**
  - Test with adversarial inputs designed to cause catastrophic backtracking
  - Example: repeating patterns like `aaaaaaaaaaaaaaaaaaaaaaaab` with `(a+)+b` pattern
  - Implement timeouts on regex execution (max 100ms per regex)

---

## 4. Data Flow Verification

### Pre-API Masking
- [ ] Prompts are scanned for secrets BEFORE any API call
- [ ] Masked version is sent to LLM API, never the original
- [ ] User is shown original was protected (notification message)

### Logging Safety
- [ ] Secret detection does NOT log original secrets
- [ ] Logs only contain detection metadata: `{found: true, type: 'AWS_KEY', maskedPrompt: '...'}`
- [ ] Error messages never leak secret content

### Error Handling
- [ ] If privacy scan fails (e.g., regex timeout), gracefully degrade
- [ ] Log error without exposing prompt details
- [ ] Do not block user operation, just warn in logs

---

## 5. Enhanced Secret Types (Post v1.3.0)

### Priority High
- [ ] **Slack Tokens**: `xoxb-`, `xoxp-`, `xoxc-` prefixes
- [ ] **GitHub App Tokens**: `ghu_` prefix
- [ ] **PayPal API Signatures**: `Signature=` patterns
- [ ] **AWS CloudFront Key Pairs**: `APKA` prefix
- [ ] **Supabase/Firebase Service Keys**: `eyJ` header (JWT format)

### Priority Medium
- [ ] **HashiCorp Vault Tokens**: `hvs.` prefix
- [ ] **Datadog API Keys**: `dd_` prefix
- [ ] **Segment Write Keys**: Format detection
- [ ] **SendGrid API Keys**: `SG.` prefix
- [ ] **Mailchimp API Keys**: Format detection

---

## 6. User Communication & Transparency

### Detection Notification
- [ ] User shown clear warning: "🛡️ **Secret Shield Alert!** ClarityAI found and masked sensitive data"
- [ ] Shows what was detected: "Found AWS Access Key"
- [ ] Explains action: "Your original prompt is protected and was not sent to the LLM"
- [ ] Shows masked version for review

### Privacy Policy Alignment
- [ ] Documentation clearly states: "Secret Shield masks data locally before ANY outbound call"
- [ ] Explain what's masked vs. what's not
- [ ] Commitment: "Your secrets never leave your machine"

### Audit Trail
- [ ] Users can see detection log in Output Channel
- [ ] Shows: timestamp, type detected, masking status
- [ ] No sensitive content in logs

---

## 7. Test Cases - Real-World Examples

### Positive Cases (Must Detect)
```
Test Prompt 1:
"Use this AWS key: AKIAIOSFODNN7EXAMPLE"
Expected: Mask to "Use this AWS key: [REDACTED AWS_ACCESS_KEY]"

Test Prompt 2:
"GitHub token: ghp_1234567890abcdefghijklmnopqrstuvwxyz1234"
Expected: Mask to "GitHub token: [REDACTED GITHUB_PAT]"

Test Prompt 3:
"mongodb://admin:secretpass@db.example.com:27017/mydb"
Expected: Mask to "mongodb://[REDACTED MONGODB_CONNECTION]"

Test Prompt 4:
"-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA... [full key content]
-----END RSA PRIVATE KEY-----"
Expected: Mask to "[REDACTED RSA_PRIVATE_KEY]"
```

### Negative Cases (Should NOT Detect)
```
Test Prompt 1:
"The current version is 1.2.3 and uses API v2"
Expected: No masking (version numbers not secrets)

Test Prompt 2:
"Sample email: test@example.com for testing"
Expected: Consideration - this is borderline, document behavior

Test Prompt 3:
"My UUID is 550e8400-e29b-41d4-a716-446655440000"
Expected: No masking (UUID not a secret)
```

---

## 8. Compliance & Standards

### OWASP Top 10
- [ ] **A01:2021 - Broken Access Control**: Tokens properly masked
- [ ] **A02:2021 - Cryptographic Failures**: Private keys properly detected
- [ ] **A07:2021 - Identification and Authentication Failures**: Credential masking

### GDPR Compliance
- [ ] PII (email addresses) are masked
- [ ] Detection happens locally (no data sent to external servers for detection)
- [ ] Users have control over what's shared (opt-in analytics)

### SOC 2 Relevant
- [ ] Logging of detection without exposing content
- [ ] Audit trail available to users
- [ ] No data retention of masked prompts

---

## 9. Performance Benchmarks

| Test Case | Requirement | Status |
|-----------|-------------|--------|
| Basic prompt (100 chars) | < 10ms | ⬜ |
| Large prompt (8K chars) | < 100ms | ⬜ |
| Multiple secrets (10 secrets) | < 50ms | ⬜ |
| Regex timeout prevention | < 100ms even on adversarial input | ⬜ |
| Memory cleanup | < 1MB heap increase per scan | ⬜ |

---

## 10. Audit Sign-Off

### Pre-Release Verification
- [ ] All pattern coverage tests pass
- [ ] False positive rate < 2%
- [ ] Performance benchmarks met
- [ ] No ReDoS vulnerabilities
- [ ] Data flow verified (masked only sent to API)
- [ ] Documentation complete and accurate
- [ ] Privacy policy updated
- [ ] User notification clear and helpful

### Security Review
- [ ] Code review by security-conscious developer
- [ ] Regex patterns reviewed for performance/safety
- [ ] Error handling tested with adversarial inputs
- [ ] Compliance verified (GDPR, OWASP, SOC 2 relevant controls)

### Final Checklist
- **Auditor Name:** _________________
- **Date:** _________________
- **Status:** ⬜ PENDING / ✅ PASSED / ❌ FAILED
- **Notes:** _____________________________________________________

---

## Implementation Checklist

The following tasks ensure complete implementation:

- [ ] Add/enhance pattern detection in `src/privacyGuard.ts`
- [ ] Create comprehensive test file: `src/__tests__/security/secret-detection.test.ts`
- [ ] Document environment-specific behavior (dev vs. production)
- [ ] Add performance profiling tests
- [ ] Create ReDoS prevention mechanism (timeouts)
- [ ] Update user documentation with Secret Shield explanation
- [ ] Add privacy audit results to SECURITY.md
- [ ] Setup automated security tests in CI/CD

---

## References

- **OWASP Top 10 2021**: https://owasp.org/Top10/
- **GDPR Article 32**: https://gdpr-info.eu/art-32-gdpr/
- **Regex DoS Prevention**: https://cheatsheetseries.owasp.org/cheatsheets/Regular_Expression_Cheat_Sheet.html
- **ClarityAI Privacy Policy**: See `/privacy` on clarity-ai.app
- **VS Code API Security**: https://code.visualstudio.com/api/extension-guides/active-extensions

