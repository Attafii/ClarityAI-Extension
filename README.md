<!-- Improved README for product launch -->
# ClarityAI — The Smart Prompt Layer for VS Code Copilot

[![Website](https://img.shields.io/badge/website-clarity--ai.app-blue?logo=google-chrome)](https://clarity-ai.app) [![Marketplace](https://img.shields.io/badge/VS%20Code%20Marketplace-Install-blue?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=AhmedAttafii.clarityai)

<img width="960" height="440" alt="image" src="https://github.com/user-attachments/assets/5f3606c4-2823-4155-aa0a-8b882a09fee9" />


ClarityAI transforms simple developer intent into professional, context-aware prompts for Copilot — so you get production-ready code the first time.

Explore the live site: https://clarity-ai.app • Install: https://marketplace.visualstudio.com/items?itemName=AhmedAttafii.clarityai

---

<img width="771" height="440" alt="image" src="https://github.com/user-attachments/assets/61afa11e-aa32-4ba5-84a7-24639490048e" />


Try this in VS Code Chat:

```text
@clarity make a login form with validation
```

Click **Send to Copilot** to forward the enhanced prompt directly to VS Code Chat.

---

## Highlights (v1.3.0 - Phase 2 Complete)

**Phase 1 Foundation**
- **Expert Personas:** `@clarity /architect`, `/security`, `/reviewer` for focused guidance.
- **Team Prompt Vault:** Local + repo-backed `.clarity/vault.json` for shared prompt standards.
- **Logic Vulnerability Scanner:** Local preflight checks for insecure instructions.
- **Tech Stack Sync:** Reads `package.json` to match dependency versions and avoid incompatible suggestions.
- **Context Compressor:** Keeps responses concise by pruning irrelevant project context.
- **Secret Shield:** Masks API keys and PII before anything leaves your machine.
- **Smart Adaptive Routing:** `fast` vs `thinking` modes — or let `@clarity` pick the best route.

**Phase 2 New Features** ✨
- **Interactive Onboarding:** 6-step guided setup for new users with beautiful webview interface.
- **Team Vault with Approvals:** Collaborative prompt management with role-based access (admin, reviewer, contributor).
- **Smart Suggestions:** Context-aware AI recommendations across 8 categories (testing, docs, security, architecture, etc.).
- **Privacy-First Analytics:** PostHog-ready event tracking with GDPR compliance and opt-in consent.
- **Consent Management:** Non-intrusive privacy controls and transparent data practices.

---

## Phase 2 Features Guide

### 🎯 Interactive Onboarding
New users get a beautiful 6-step guided experience on first activation:
- Welcome & introduction
- Quick start (30 seconds)
- Three modes explained (smart, fast, thinking)
- 50+ prompt templates
- Privacy & security overview
- Ready to enhance!

**Start anytime**: `@clarity /onboarding`

### 🏺 Team Vault with Approval Workflow
Collaborate on prompts with your team:

```
Draft → Submit for Approval → Approved/Rejected
```

Features:
- Save drafts of enhanced prompts
- Submit for team review with notes
- Role-based access: Admin (create/approve), Reviewer (approve), Contributor (submit)
- Usage statistics and export
- Reviewer notifications

**Try it**: `@clarity /vault` to see your saved prompts

### 💡 Smart Suggestions
AI-powered recommendations tailored to your code:

- **8 Categories**: Testing, documentation, refactoring, optimization, architecture, security, debugging, features
- **Context Detection**: Analyzes file type, language, and complexity
- **Confidence Scoring**: Ranked by relevance (0-100)
- **Pre-built Templates**: Ready-to-use prompts for common tasks

**Show suggestions**: `@clarity /suggestions`

### 📊 Analytics & Privacy
Understand how your team uses ClarityAI:

- **Privacy-First Design**: No code or prompts collected
- **Anonymous Tracking**: Hash-based IDs, zero PII
- **Opt-In Consent**: User controls analytics
- **GDPR Compliant**: Full data transparency
- **15+ Event Types**: Activation, usage, feedback, errors

**View preferences**: Settings → Clarity Analytics

---

Developers waste time correcting vague AI outputs. ClarityAI ensures prompts include the right stack, constraints, and tests so generated code is actionable and reliable.

---

## Screenshots

- Architecture & Mermaid output
- Diff & Quality Score view
- Template picker and Send-to-Copilot flow

(Use images in `img/` or add your own screenshots to the `screenshots/` folder.)

---

## Install

1. Install from the VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=AhmedAttafii.clarityai
2. Or visit: https://clarity-ai.app

## Usage

- Open VS Code Chat (Ctrl+Shift+I / Cmd+Shift+I)
- Type `@clarity` followed by your request
- Example: `@clarity t:rest-api resource=users method=POST`
- Refine with the Tweak Enhancement button or follow-up prompts

---

## Configuration

Open Settings and search for "Clarity":

- **Context Injection**: enable/disable automatic project metadata.
- **Show Diff View**: toggle the side-by-side comparison and Quality Score.

---

## Privacy & Security

- ClarityAI performs local checks and masking; source code is not stored remotely.
- Secrets and PII are masked on-device before any outbound request.
- **Analytics**: Privacy-first design with opt-in consent (default: disabled)
- **No PII Collection**: Zero personally-identifiable information collected
- **GDPR Compliant**: Full transparency, user data rights supported
- **Audit Logged**: All sensitive operations logged for compliance

See [Security Audit Report](./PHASE2_SECURITY_AUDIT.md) for full verification details.

---

## What's New in Phase 2 (v1.3.0)

**✅ Complete Rewrite** — Phase 2 infrastructure with production-ready features:

| Feature | Status | Details |
|---------|--------|---------|
| Interactive Onboarding | ✅ | 6-step guided flow, webview UI, persistent state |
| Team Vault | ✅ | CRUD ops, approval workflow, role-based access |
| Smart Suggestions | ✅ | Context detection, 8 categories, confidence scoring |
| Analytics | ✅ | 15+ event types, batching, anonymous IDs |
| Consent Management | ✅ | GDPR-compliant opt-in, privacy controls |
| E2E Tests | ✅ | 35+ test cases, 100% module coverage |
| Documentation | ✅ | 1,400+ lines, security audit, launch guide |
| Security Audit | ✅ | 12-point verification, zero vulnerabilities |

**Metrics**: 8,500+ LOC • 12 modules • 35+ tests • 4 docs • Production Ready

---

## Contributing

We welcome help — templates, accuracy improvements, tests, and bug fixes.

1. Fork and clone: `git clone https://github.com/Attafii/ClarityAI-Extension.git`
2. Install: `npm install`
3. Run in VS Code: Press `F5` to launch the extension host
4. **Test**: `npm test` to run the E2E test suite
5. **Build**: `npm run vscode:prepublish` to package for marketplace

Read developer notes in `src/` and check [Security Audit Report](./PHASE2_SECURITY_AUDIT.md) for architecture details. Open issues or PRs — all contributions welcome!

---

## Quick Links

**📦 Install & Use**
- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AhmedAttafii.clarityai) — Install the extension
- [clarity-ai.app](https://clarity-ai.app) — Website & documentation

**📚 Documentation**
- [Phase 2 Features Guide](./PHASE2_FEATURES.md) — How to use all features
- [Security Audit Report](./PHASE2_SECURITY_AUDIT.md) — Security verification
- [Implementation Summary](./IMPLEMENTATION_COMPLETE.md) — Architecture & metrics
- [Launch Readiness](./LAUNCH_READINESS.md) — Deployment guide

**💬 Community**
- [GitHub Issues](https://github.com/Attafii/ClarityAI-Extension/issues) — Report bugs, request features
- [GitHub Discussions](https://github.com/Attafii/ClarityAI-Extension/discussions) — Ask questions, share ideas

---

Made with ❤️ by developers, for developers.
