# 🚀 ClarityAI: Comprehensive Functionality Overview

ClarityAI is a sophisticated VS Code extension designed to act as a **"Translation and Optimization Layer"** between the developer and AI agents like GitHub Copilot. It ensures your intent is captured with technical precision, project-aware context, and industry-best practices.

## 1. 🎭 Expert Persona Engine (Subcommands)
ClarityAI allows you to activate specialized "Experts" through subcommands. When used, the AI adopts a specific persona to prioritize different technical aspects:
- **`@clarity /architect`**: Prioritizes scalability, design patterns (SOLID, Clean Arch), and system structure.
- **`@clarity /security`**: Focuses on vulnerability prevention, input sanitization, and OWASP standards.
- **`@clarity /reviewer`**: Provides a lead-developer style critique of logic, technical debt, and edge cases.
- **`@clarity /tester`**: Focuses on test coverage, boundary conditions, and mock strategies.
- **`@clarity /frontend`**: Prioritizes accessibility (A11y), responsive design, and CSS best practices.
- **`@clarity /performance`**: Focuses on Big-O complexity, memory footprint, and optimization.

## 2. 🤖 Smart Adaptive Routing
Instead of a one-size-fits-all model, ClarityAI uses a **Complexity Scoring Algorithm** to route your prompt:
- **Fast Mode (`@clarity-fast`)**: Routes simple requests (typos, grammar, one-liners) to lightweight, high-speed models.
- **Thinking Mode (`@clarity-thinking`)**: Routes complex requests (logic analysis, architecture) to heavy reasoning models.
- **Smart Switch (`@clarity`)**: The default behavior which analyzes your prompt and chooses the model automatically based on the detected complexity level.

## 3. 🛡️ Security & Privacy Guardrails
ClarityAI includes "Local-First" privacy tools to protect your codebase:
- **Secret Shield**: Automatically detects and masks API keys, secrets, and PII (Personally Identifiable Information) locally before the prompt ever leaves your machine.
- **Logic Vulnerability Scanner**: Identifies dangerous instructions in your prompt (e.g., requests involving `eval()`, potential SQLi patterns, or insecure HTTP) and issues a warning before enhancement.

## 4. 🏺 Persistence & The Prompt Vault
Standardize and share high-performing prompts across your workflow and team:
- **Local Vault**: Private storage for your optimized prompts (saved in VS Code Global State).
- **Team Vault**: A shared `.clarity/vault.json` file that allows team members to sync standardized project prompts (e.g., "Company API Standard").
- **Recall Interface**: Use `@clarity /vault` to browse, search, and instantly recall saved prompts.

## 5. 🗺️ Visual Architectural Roadmaps
ClarityAI integrates [Mermaid.js](https://mermaid.js.org/) for visual communication:
- **Auto-Diagram**: If a request involves "design", "flow", or "process", ClarityAI automatically appends a Mermaid.js diagram block.
- **Visual Preview**: Renders the diagram directly inside the VS Code Chat panel.
- **Mermaid Live Integration**: Includes an **"Open in Mermaid Live"** button to jump into the full Mermaid editor for complex diagrams.

## 6. 📦 Technical Context Awareness
ClarityAI "speaks your tech stack" by analyzing your environment:
- **Tech Stack Sync**: Automatically reads `package.json` to detect Framework versions (e.g., `Next.js 14`, `React 18`), preventing the AI from suggesting legacy or incompatible code.
- **.clarityrules Enforcement**: A root-level configuration file that forces the AI to respect strict project constraints (e.g., "Always use Tailwind", "No external state managers").
- **Workspace Mapping**: Indexes the `src` folder to understand your internal utilities and exports.

## 7. 📚 Professional Template Library
Access over 12+ pre-built "Prompts-as-Blueprints" via `@clarity templates`:
- **API Blueprints**: REST Endpoints, GraphQL Resolvers.
- **UI Blueprints**: React Components, Forms with Validation.
- **DevOps/Database**: Database Schemas, Docker Configurations.
- **Testing**: Comprehensive Unit and Integration test plans.

## 8. 📊 Quality Analysis & Educational UI
ClarityAI doesn't just improve your prompt; it teaches you how to write better ones:
- **Quality Score (1-10)**: Real-time feedback on how detailed your original prompt was.
- **Educational Insights**: Highlights key additions (e.g., "Added Error Handling because it prevents runtime crashes") to help you learn prompting best practices.
- **Interactive Diff View**: A side-by-side comparison of your "Before" and "After" instructions.

## 9. 🛠️ Interactive Refinement Workspace
Refine the AI's output without re-typing your request:
- **Tweak Enhancement**: A dynamic input box to adjust the enhanced prompt (e.g., "Make this more concise").
- **Quick Refiners**: One-click buttons to "Add Tests", "Simplify", or "Make Production-Ready".
- **Copilot Forwarding**: A seamless **"Send to Copilot"** button that injects the final enhanced prompt directly into the main GitHub Copilot chat session.

---

# 📖 How to Use ClarityAI

ClarityAI is designed to be a natural part of your VS Code workflow. Here is a step-by-step guide on how to leverage its full power.

## 1. Getting Started
Open the **VS Code Chat Panel** (typically `Ctrl+Shift+I` on Windows/Linux or `Cmd+Shift+I` on macOS) and type `@clarity` to start interacting with the extension.

## 2. Basic Prompt Enhancement
Just type your request after the `@clarity` participant:
```markdown
@clarity make a login form with validation
```
ClarityAI will analyze the complexity, inject workspace context, and provide an enhanced version of your prompt.

## 3. Using Specialized Modes
If you want to bypass the smart routing and force a specific engine:
- **`@clarity-fast`**: High-speed, lightweight improvements.
- **`@clarity-thinking`**: Deep reasoning for complex logic and architecture.

## 4. Activating Expert Personas
Use subcommands to focus the enhancement on specific technical domains:
```markdown
@clarity /architect design a notification system
@clarity /security review this authentication logic
@clarity /tester write tests for this utility function
```
*Supported personas: `/architect`, `/security`, `/reviewer`, `/tester`, `/documentation`, `/performance`, `/frontend`.*

## 5. Working with Templates
Templates provide structured blueprints for common tasks.
- **List all templates**: `@clarity templates`
- **Use a template**: `@clarity t:template-id`
- **Use with parameters**: `@clarity t:rest-api resource=orders method=GET`

## 6. Managing your Prompt Vault
The Vault allows you to save and reuse your best prompts.
- **Save a prompt**: Click the **"🏺 Save to Vault"** button after an enhancement. You can choose to save it locally or to the project's **Team Vault**.
- **Access the Vault**: Type `@clarity /vault` to see all saved prompts and instantly use them.

## 7. Configuring Project Rules
Create a `.clarityrules` file in your repository's root directory. ClarityAI will automatically read this file and inject its contents into every enhancement.
Example `.clarityrules`:
```text
- Always use TypeScript with strict typing.
- Use Tailwind CSS for all styling.
- Prefer functional components over classes.
```

## 8. Interactive Refinement
After an enhancement, use the built-in action buttons to iterate:
- **"🤖 Send to Copilot"**: Forwards the prompt directly to GitHub Copilot.
- **"💬 Tweak Enhancement"**: Opens an input box to provide follow-up instructions (e.g., "Make it more secure").
- **"🏗️ Generate Test Cases"**: Instantly creates a test plan based on the implementation details.
- **Refinement Shortcuts**: Quick buttons for "Add More Details", "Simplify", or "Beginner-Friendly".

## 9. Visualizing with Mermaid
If your prompt results in a Mermaid.js diagram:
- View the render directly in the chat.
- Click **"🌐 Open in Mermaid Live"** to edit the diagram in the online editor.

---
*Type `@clarity help` in the chat panel at any time to see a quick reference of these commands.*
