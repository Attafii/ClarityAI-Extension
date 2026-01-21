# ClarityAI - The Smart Prompt Layer for VS Code Copilot

> ⚠️ **Not to be confused with:** The Clarity Smart Contract language for Bitcoin (Stacks). This is a VS Code extension for optimizing AI prompts.

Hey there! Ever asked Copilot to "make a website" and gotten back something generic or missing half your tech stack? ClarityAI fixes that.

ClarityAI acts as an intelligent "translation layer" between you and Copilot. It takes your raw thoughts and transforms them into detailed, professional, and context-aware prompts that get you correct, production-ready code on the first try.

## 🚀 Key Features (v1.3.0)

### 🎭 Expert Personas (Subcommands)
Use specialized experts for different developer tasks.
- `@clarity /architect`: Focuses on scalability, design patterns, and system structure.
- `@clarity /security`: Focuses on vulnerabilities, sanitization, and best practices.
- `@clarity /reviewer`: Meticulously critiques logic and edge cases.

### 🏺 Team Prompt Vault (Sync)
Standardize your team's prompts by saving them to the repo.
- **Local Vault**: Private prompts saved only on your machine.
- **Team Vault**: Shared prompts saved to `.clarity/vault.json` for the whole team.

### 🚨 Logic Vulnerability Scanner
Scans your prompt for insecure coding instructions (eval, SQLi, insecure HTTP) locally before they ever reach the AI.

### 📦 Tech Stack Sync (Version-Aware)
Clarity now reads your `package.json` to detect exact version numbers (e.g., `React v18.3`, `TypeScript v5.4`), preventing incompatible code suggestions.

### 📉 Context Compressor (Token Optimizer)
Intelligently prunes project context based on your prompt's intent to keep responses focused and accurate.

### 🛡️ Secret Shield (Privacy Guardrail)
Automatically masks sensitive data like API keys, secrets, and PII before it leaves your machine.
... (existing content)

### 🤖 Smart Adaptive Routing
ClarityAI analyzes your prompt's complexity using a specialized scoring algorithm.
- **Fast Mode**: Instant improvements for simple tasks (typos, one-liners).
- **Thinking Mode**: Deep reasoning for architecture, complex algorithms, and performance analysis.
- **Smart Switch**: Just use `@clarity` and let the engine decide the best model for the job.

### 📋 .clarityrules & Workspace Mapping
- **.clarityrules**: Create a `.clarityrules` file in your root to force Clarity to always respect your project's specific constraints (e.g. "Always use Tailwind", "No external libraries").
- **Workspace Mapping**: Indexes your project's `src` folder to understand exports and utilities.
- **Dynamic Context**: Automatically detects Next.js, React, Express, and more.

### 🛠️ Interactive Refinement
Not happy with the first enhancement? Use the **Tweak Enhancement** button to give follow-up instructions (e.g., "Make it more secure") without re-typing everything.

### 🗺️ Visual Roadmaps & Mermaid Live
Architectural requests automatically generate **Mermaid.js diagrams**. Version 1.2.1 adds a direct **"Open in Mermaid Live"** button to view or edit diagrams if they don't render correctly in chat.

### 📊 Quality Analysis & Test Generator
- **Quality Score**: Get real-time feedback and actionable advice if your prompt is too vague.
- **Test Case Generator**: Convert any implementation plan into a comprehensive unit and integration test plan with one click.

### 📚 Professional Template Library
Access 12+ industry-standard blueprints for:
- API Development (REST, GraphQL)
- UI Components (React, Forms)
- Testing (Unit & Integration)
- Clean Architecture & Database design
*Use them with `@clarity t:rest-api` or `@clarity templates`.*

### 📊 Educational Diff View & Quality Score
See exactly how your prompt was improved.
- **Quality Score**: Get a 1-10 rating of your prompt depth.
- **Insight Highlights**: Understand why specific details like error handling or accessibility were added.

### ⚡ Seamless Copilot Integration
Once your prompt is enhanced, click **"Send to Copilot"** to forward it directly to the VS Code Chat. No copy-pasting required.

---

## 🛠️ How to Use It

### The Basics
Open the VS Code Chat panel (Ctrl+Shift+I / Cmd+Shift+I) and use the `@clarity` participant:

```markdown
@clarity make a login form with validation
```

### Using Different Modes
Depending on your needs, you can force a specific routing:
- `@clarity` (Recommended): Automatically chooses based on complexity.
- `@clarity-fast`: High-speed improvements for simple requests.
- `@clarity-thinking`: Deep analysis for complex logic and architecture.

### Working with Templates
List all templates:
```markdown
@clarity templates
```

Use a template with parameters:
```markdown
@clarity t:rest-api resource=users method=POST
@clarity t:react-component name=UserCard styling=Tailwind
```

---

## ⚙️ Configuration

ClarityAI is optimized out of the box. Go to **Settings (Ctrl+,)** and search for "Clarity" to toggle:

1. **Context Injection**: Toggle automatic project identification on/off.
2. **Show Diff View**: Toggle the side-by-side comparison and quality score dashboard.

---

## 🔒 Privacy & Performance

- **Privacy First**: ClarityAI only reads essential metadata (framework names, dependency lists) for context. We never store your source code.
- **Local First**: Initial typo and grammar corrections, and all security scanning, happen locally on your machine.
- **Secret Shield**: Your local machine masks secrets before they are sent for enhancement.

---

## 🚀 Getting Started

1. Install the extension.
2. Start typing in chat!
3. Type `@clarity help` to see the full power of ClarityAI.

---
Made by developers, for developers. Because we all deserve better results from AI.

## 🤝 Contributing

ClarityAI is **open source** and built by the community for the community. We welcome contributions of all kinds!

- **Add New Templates**: Have a prompt blueprint that works every time? Add it to our library.
- **Improve Accuracy**: Help us refine the Complexity Analyzer or framework detection.
- **Fix Bugs**: Found a glitch? Open an issue or submit a PR.
- **Feedback**: Tell us how you're using ClarityAI.

### Getting Started with Development

1. Clone the repo: `git clone https://github.com/Attafii/ClarityAI-Extension.git`
2. Install dependencies: `npm install`
3. Launch the extension: Press `F5` in VS Code to open a new window with the extension loaded.
