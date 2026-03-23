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

## Highlights (v1.3.0)

- **Expert Personas:** `@clarity /architect`, `/security`, `/reviewer` for focused guidance.
- **Team Prompt Vault:** Local + repo-backed `.clarity/vault.json` for shared prompt standards.
- **Logic Vulnerability Scanner:** Local preflight checks for insecure instructions.
- **Tech Stack Sync:** Reads `package.json` to match dependency versions and avoid incompatible suggestions.
- **Context Compressor:** Keeps responses concise by pruning irrelevant project context.
- **Secret Shield:** Masks API keys and PII before anything leaves your machine.
- **Smart Adaptive Routing:** `fast` vs `thinking` modes — or let `@clarity` pick the best route.

---

## Why ClarityAI?

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

---

## Contributing

We welcome help — templates, accuracy improvements, tests, and bug fixes.

1. Fork and clone: `git clone https://github.com/Attafii/ClarityAI-Extension.git`
2. Install: `npm install`
3. Run in VS Code: Press `F5` to launch the extension host

Read developer notes in `src/` and open issues or PRs.

---

## Links

- Website: https://clarity-ai.app
- VS Code Marketplace: https://marketplace.visualstudio.com/items?itemName=AhmedAttafii.clarityai

---

Made with ❤️ by developers, for developers.
