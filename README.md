# ClarityAI - The Smart Prompt Layer for VS Code Copilot

Hey there! Ever asked Copilot to "make a website" and gotten back something generic or missing half your tech stack? ClarityAI fixes that.

ClarityAI acts as an intelligent "translation layer" between you and Copilot. It takes your raw thoughts and transforms them into detailed, professional, and context-aware prompts that get you correct, production-ready code on the first try.

## 🚀 Key Features (v1.0.9)

### 🤖 Smart Adaptive Routing
ClarityAI analyzes your prompt's complexity using a specialized scoring algorithm.
- **Fast Mode**: Instant improvements for simple tasks (typos, one-liners).
- **Thinking Mode**: Deep reasoning for architecture, complex algorithms, and performance analysis.
- **Smart Switch**: Just use `@clarity` and let the engine decide the best model for the job.

### 📋 Automatic Context Injection
No more typing "I'm using Next.js with TypeScript and Tailwind." ClarityAI automatically detects:
- Your Framework (Next.js, React, Express, etc.)
- Your Language (TypeScript/JavaScript)
- Key Dependencies (Prisma, Zod, shadcn, etc.)
- Active File Purpose (e.g., detecting if you're writing a unit test)

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

ClarityAI is flexible. Go to **Settings (Ctrl+,)** and search for "Clarity" to configure:

1. **API Mode**: 
   - `clarityai`: Use our optimized, zero-config engine.
   - `custom`: Connect to any OpenAI-compatible provider (Groq, Nvidia, etc.).
2. **Context Injection**: Toggle automatic project detection on/off.
3. **Show Diff View**: Toggle the side-by-side comparison and quality score.

---

## 🔒 Privacy & Performance

- **Privacy First**: ClarityAI only reads metadata (framework names, dependency lists) for context. We never read or store your source code.
- **Local First**: Initial typo and grammar corrections happen locally on your machine.

---

## 🚀 Getting Started

1. Install the extension.
2. (Optional) Set your API key if using custom mode.
3. Type `@clarity help` in the chat to see more!

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
