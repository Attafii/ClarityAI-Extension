# ClarityAI Features Guide (v1.0.9)

ClarityAI is packed with features designed to bridge the gap between "what you thought" and "what the AI needs."

## 🤖 Smart Routing Engine

The core of ClarityAI is our specialized **Complexity Analyzer**.

- **How it Works**: Every prompt is analyzed for technical depth, word count, and intent. It generates a score from 0-100.
- **Fast Mode (Score < 40)**: Uses high-performance LLMs for quick typo fixes, minor code adjustments, and simple questions.
- **Thinking Mode (Score >= 40)**: Uses advanced reasoning models (like DeepSeek v3 or Llama 3.3 70B) for architectural design, complex debugging, and multi-step logic.
- **Smart Routing**: By using `@clarity` (without modifiers), the extension automatically routes your request to the most efficient model.

---

## 📋 Automatic Context Injection

ClarityAI makes your prompts context-aware without you having to write a single extra word.

**Detected Metadata:**
- **Frameworks**: Next.js, React, Vue, Express, NestJS, and more.
- **Languages**: Automatic detection of TypeScript vs JavaScript.
- **Dependencies**: Analyzes your `package.json` for libraries like Tailwind, Prisma, Zod, and shadcn.
- **Environment**: Identifies build tools (Vite, Webpack) and test frameworks (Jest, Vitest).
- **Active File**: Understands the file you are currently editing (e.g., identifies if it's a component or a test file).

**Why it matters**: A prompt for "a button" becomes "a React component using Tailwind CSS and TypeScript best practices" automatically.

---

## 📚 Professional Template Library

Stop staring at a blank chat box. Access a curated library of prompt blueprints.

- **Usage**: Type `@clarity templates` to list all, or `@clarity t:id` to use one.
- **Dynamic Parameters**: Pass variables like `@clarity t:rest-api resource=users method=POST`.

**Available Modules:**
- `rest-api`, `graphql-resolver`
- `react-component`, `form-component`
- `unit-tests`, `integration-tests`
- `database-schema`, `clean-architecture`
- `debug-error`, `refactor-code`, `documentation`

---

## 📊 Educational Diff View

ClarityAI doesn't just improve your prompt; it teaches you how to write better ones.

- **Prompt Quality Score**: A 1-10 rating based on the detail and clarity of your prompt.
- **Detailed Comparison**: See a side-by-side view with syntax highlighting.
- **Insight Highlights**:
  - ✅ **Words Added**: More context for the AI.
  - 📋 **Structure Added**: Better organization for complex requests.
  - 🔑 **Key Additions**: Highlights why it added things like "Error Handling", "Accessibility", or "Performance Constraints."

---

## 🎯 Quick Actions & Refinement

Refine your prompt with one click using the built-in action buttons:
- **🤖 Send to Copilot**: Instant forwarding to the main chat.
- **📋 Copy Prompt**: Save to clipboard for external use.
- **🔍 Add More Details**: Push the AI to be more specific.
- **✂️ Simplify**: Make the prompt more concise.
- **🎓 Beginner-Friendly**: Ask for explanations in simpler terms.
- **⚡ Production-Ready**: Add robust error handling and security requirements.

---

## 🔒 Security & Privacy

We value your privacy as much as you do.
- **No Code Sent**: ClarityAI **never** sends your source code to the API. It only sends metadata (like framework names) and the prompt itself.
- **Local Pre-processing**: Typo and grammar fixes are scanned locally before any API call is made.
- **Bring Your Own Key**: Use "Custom Mode" to use your own API provider for full data control.

---

## 🚀 Coming Soon

- **Prompt History**: Revisit and reuse your most successful enhanced prompts.
- **Custom User Templates**: Create and save your own prompt blueprints.
- **Multi-language Support**: Enhance prompts in any language.
