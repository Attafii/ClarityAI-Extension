# ClarityAI — The Smart Prompt Layer for VS Code Copilot

[![Website](https://img.shields.io/badge/website-clarity--ai.app-blue?logo=google-chrome)](https://clarity-ai.app) [![VS Code](https://img.shields.io/badge/VS%20Code-1.90%2B-blue?logo=visual-studio-code)](https://code.visualstudio.com/) [![Version](https://img.shields.io/badge/version-1.4.2-green)](https://github.com/Attafii/ClarityAI-Extension) [![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

<img width="960" height="440" alt="image" src="https://github.com/user-attachments/assets/5f3606c4-2823-4155-aa0a-8b882a09fee9" />

ClarityAI transforms simple developer intent into professional, context-aware prompts for Copilot — so you get production-ready code the first time.

🌐 **Website**: https://clarity-ai.app

---

## ✨ What is ClarityAI?

ClarityAI acts as an intelligent translation layer between you and GitHub Copilot. Instead of sending vague or incomplete prompts to Copilot, ClarityAI:

- 🎯 **Enhances** your prompts with technical precision and best practices
- 🔍 **Analyzes** your project context (tech stack, dependencies, file patterns)
- 🛡️ **Protects** your privacy by detecting and masking secrets before they leave your machine
- 🚀 **Routes** intelligently between fast and deep-thinking AI models based on complexity
- 👥 **Enables** team collaboration through shared prompt vaults and approval workflows

<img width="771" height="440" alt="image" src="https://github.com/user-attachments/assets/61afa11e-aa32-4ba5-84a7-24639490048e" />

### Quick Example

Try this in VS Code Chat:

```text
@clarity make a login form with validation
```

ClarityAI enhances it to include security best practices, accessibility standards, tech stack compatibility, and more — then you can send it directly to Copilot with one click.

---

## 🎯 Key Features (v1.4.2)

### 🎭 Core Features

**Expert Personas**
- Use specialized AI personas: `@clarity /architect`, `/security`, `/reviewer`, `/tester`, `/documentation`, `/performance`, `/frontend`
- Each persona focuses enhancement on specific technical aspects (scalability, security, testing, etc.)

**Smart Routing**
- `@clarity` - Automatically chooses fast or deep-thinking mode based on prompt complexity
- `@clarity-fast` - Quick enhancements for simple requests
- `@clarity-thinking` - Advanced reasoning for complex architectural decisions

**Privacy & Security**
- **Secret Shield**: Automatically detects and masks API keys, tokens, and PII before sending
- **Vulnerability Scanner**: Identifies dangerous patterns in prompts (SQL injection, eval, etc.)
- **Local-First**: All privacy checks happen on your machine

**Context Intelligence**
- Reads `package.json` to match framework versions and dependencies
- Uses `.clarityrules` file for project-specific constraints
- Analyzes current file and workspace structure
- Prevents incompatible suggestions

### 🏺 Team Collaboration

**Prompt Vault**
- Save enhanced prompts for reuse
- Share standardized prompts across your team
- Local vault (private) and Team vault (shared in `.clarity/vault.json`)

**Approval Workflows**
- Draft → Submit → Review → Approve/Reject workflow
- Role-based access: Admin, Reviewer, Contributor
- Multi-reviewer approvals with comments
- Version history and change tracking
- SLA deadline management with alerts

**Interactive Onboarding**
- Beautiful 6-step guided setup for new users
- Introduces modes, templates, privacy, and features
- Persistent state (shows once, can be reopened with `@clarity /onboarding`)

### ☁️ Enterprise Features

**Cloud Synchronization**
- Sync vault across multiple devices
- Support for Azure Blob Storage, AWS S3, and Firebase
- Automatic conflict resolution with backup creation
- Offline-first with intelligent queueing
- Status bar integration

**Analytics Dashboard**
- Real-time metrics: vault items, approvals, team activity
- Team leaderboard and most-used prompts
- 7-day trends and growth predictions
- Export to CSV/JSON for reporting
- Dark mode support, fully responsive

**Advanced Workflows**
- Multi-reviewer approval system
- Comment threads on prompts
- Request changes workflow for iteration
- Side-by-side version comparison
- Full audit trail with timestamps

### 💡 Smart Features

**Prompt Suggestions**
- Context-aware AI recommendations
- 8 categories: Testing, Docs, Refactoring, Optimization, Architecture, Security, Debugging, Features
- Confidence scoring (0-100)
- Integrated with current file and language detection

**Template Library**
- 50+ pre-built professional templates
- Categories: API, UI, DevOps, Database, Testing
- Searchable and customizable
- Fill with parameters: `@clarity t:rest-api resource=users method=POST`

**Quality Analysis**
- Real-time quality score (1-10) for your prompts
- Educational insights showing key improvements
- Side-by-side before/after comparison
- Learn better prompting practices

---

## 📖 Getting Started

### Installation

1. **From VS Code**
   - Open VS Code
   - Go to Extensions (Ctrl+Shift+X or Cmd+Shift+X)
   - Search for "ClarityAI"
   - Click Install

2. **From Marketplace**
   - Visit the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=AhmedAttafii.clarityai)
   - Click "Install"

3. **Manual Installation**
   - Download the `.vsix` file from [releases](https://github.com/Attafii/ClarityAI-Extension/releases)
   - In VS Code: Extensions → ··· menu → Install from VSIX

### First Use

1. **Open VS Code Chat** (Ctrl+Shift+I / Cmd+Shift+I)
2. **Type** `@clarity` to activate ClarityAI
3. **Follow the onboarding** - A beautiful 6-step guide will introduce you to all features
4. **Start enhancing** - Try: `@clarity create a user authentication system`

### Basic Usage

```text
# Basic enhancement
@clarity add error handling to this function

# Use expert personas
@clarity /security review this authentication code
@clarity /architect design a scalable notification system
@clarity /tester write comprehensive tests for this module

# Use templates
@clarity t:rest-api resource=products method=POST
@clarity templates                    # List all templates

# Work with vault
@clarity /vault                       # View saved prompts
```

---

## ⚙️ Configuration

Open **Settings** (Ctrl+,) and search for "Clarity":

### General Settings
- **Context Injection** - Auto-inject project metadata (framework, dependencies, current file)
- **Show Diff View** - Display side-by-side comparison with quality score
- **Enable Mermaid** - Auto-generate architectural diagrams for complex requests
- **Educational Insights** - Show "Why This Matters" explanations
- **Default Persona** - Set a default expert mode (architect, security, etc.)

### Privacy & Analytics
- **Enable Analytics** - Opt-in anonymous usage tracking (default: disabled)
- **No PII Collection** - Zero personally-identifiable information collected
- **GDPR Compliant** - Full transparency and user data rights

### Cloud Sync
- **Enable Cloud Sync** - Sync vault across devices
- **Provider** - Choose Azure, AWS, or Firebase
- **Sync Interval** - How often to sync (default: 5 minutes)

### Dashboard
- **Auto Refresh** - Update dashboard every 30 seconds (default: enabled)
- **Metrics Display** - Choose which metrics to show

### Workflows
- **Required Approvals** - Number of reviewers needed (default: 1)

### Available Commands

Press **Ctrl+Shift+P** (or **Cmd+Shift+P**) and type:

| Command | Description |
|---------|-------------|
| `ClarityAI: Setup Cloud Sync` | Configure cloud provider for vault sync |
| `ClarityAI: Open Analytics Dashboard` | View real-time metrics and team activity |
| `ClarityAI: Show Cloud Sync Status` | Check synchronization status |
| `ClarityAI: Submit to Approval Workflow` | Submit prompt for multi-reviewer approval |
| `Clarity: Open Prompt Vault` | Browse and manage saved prompts |
| `Clarity: Show Command Guide` | Quick reference of all commands |

---

## 🛡️ Privacy & Security

**Privacy-First Design**
- All privacy checks happen locally on your machine
- Source code never leaves your device
- No code or prompts stored remotely

**Secret Detection & Masking**
- Automatically detects: AWS keys, GitHub tokens, Stripe keys, JWT tokens, API keys, SSH keys, database URIs, and more
- Masks PII (email addresses, phone numbers) before any outbound request
- All masking happens on-device

**Analytics Transparency**
- Analytics are **opt-in by default** (disabled until you enable)
- Only anonymous usage data collected (no PII, no code, no prompts)
- GDPR compliant with full user data rights
- Can be disabled anytime in Settings

**Cloud Security**
- Credentials stored securely using VS Code Secrets API
- Encrypted transmission for cloud sync
- Role-based access control for team features
- Full audit trail for compliance

**OWASP Compliance**
- Input validation on all user inputs
- XSS prevention verified
- No hardcoded credentials
- Follows security best practices

---

## 📊 What's New in v1.4.2

### Enterprise Features Release ✨

**Cloud Synchronization**
- ☁️ Multi-device vault sync (Azure/AWS/Firebase)
- 🔄 Automatic conflict resolution with backups
- 📴 Offline-first with intelligent queueing
- 📊 Status bar integration

**Analytics Dashboard**
- 📈 Real-time metrics and team activity
- 🏆 Team leaderboard and top prompts
- 📉 7-day trends and growth predictions
- 💾 Export to CSV/JSON

**Advanced Workflows**
- ✅ Multi-reviewer approval system
- 💬 Comment threads and feedback
- 📝 Full version history and comparison
- ⏱️ SLA deadline management with alerts
- 🔄 Request changes workflow

**Performance & Quality**
- 10,500+ lines of production code
- Zero security vulnerabilities
- < 200ms startup time
- < 100MB memory footprint
- 70%+ test coverage

See [CHANGELOG.md](CHANGELOG.md) for complete release notes.

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Attafii/ClarityAI-Extension.git
cd ClarityAI-Extension

# Install dependencies
npm install

# Open in VS Code
code .

# Run in development mode
# Press F5 to launch the Extension Development Host
```

### Building & Testing

```bash
# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Run tests
npm test

# Build for marketplace
npm run vscode:prepublish
npm run package
```

### Contributing Guidelines

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Make** your changes
4. **Test** thoroughly
5. **Commit** with clear messages (`git commit -m 'Add amazing feature'`)
6. **Push** to your fork (`git push origin feature/amazing-feature`)
7. **Open** a Pull Request

### What We're Looking For

- 🐛 Bug fixes
- ✨ New template contributions
- 📝 Documentation improvements
- 🧪 Test coverage expansion
- 🌐 Internationalization (i18n)
- 🎨 UI/UX enhancements

---

## 📚 Documentation

- **[FEATURES.md](FEATURES.md)** - Complete feature reference and usage guide
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes
- **[LICENSE](LICENSE)** - MIT License details

---

## 🔗 Links

- 🌐 **Website**: [clarity-ai.app](https://clarity-ai.app)
- 📦 **VS Code Marketplace**: [ClarityAI Extension](https://marketplace.visualstudio.com/items?itemName=AhmedAttafii.clarityai)
- 💻 **GitHub Repository**: [ClarityAI-Extension](https://github.com/Attafii/ClarityAI-Extension)
- 🐛 **Report Issues**: [GitHub Issues](https://github.com/Attafii/ClarityAI-Extension/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/Attafii/ClarityAI-Extension/discussions)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with ❤️ by developers, for developers.

Special thanks to:
- The VS Code team for the excellent Extension API
- GitHub Copilot for inspiring better AI collaboration
- The open-source community for feedback and contributions

---

## 📈 Project Stats

- **10,500+** lines of production code
- **70%+** test coverage
- **50+** professional templates
- **8** expert personas
- **15** modules
- **0** security vulnerabilities
- **< 200ms** startup time
- **< 100MB** memory usage

---

**Ready to write better prompts?** Install ClarityAI today and transform how you interact with GitHub Copilot! 🚀
