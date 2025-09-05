# Clarity - Prompt Improver for Copilot

**Clarity** is a VS Code extension that automatically improves your prompts by fixing grammar, spelling, and clarity before sending them to GitHub Copilot Chat. Get better AI responses with clearer, more professional prompts.

## ✨ Features

- **🚀 Two Operation Modes**: Choose between Instant and Confirmation modes
- **🤖 AI-Powered Enhancement**: Uses Google Gemini 2.0 Flash for intelligent prompt improvement
- **📝 Grammar & Spelling Correction**: Automatically fixes typos and grammatical errors
- **🎯 Clarity Enhancement**: Transforms vague prompts into detailed, actionable specifications
- **🔗 Seamless Copilot Integration**: Works directly with GitHub Copilot Chat
- **⚡ One-Click Operation**: Simple `@clarity` command in VS Code Chat

## 🎮 How to Use @clarity

### Basic Usage
1. **Open VS Code Chat Panel** (Ctrl+Shift+I or Cmd+Shift+I)
2. **Type `@clarity` followed by your prompt**:
   ```
   @clarity make a website
   @clarity fix my authentication bug
   @clarity explain how React hooks work
   ```
3. **Get improved prompts** and choose your preferred mode

### 🔄 Two Operation Modes

#### **Instant Mode** ⚡
- Automatically improves your prompt and sends it directly to Copilot
- Perfect for quick, seamless workflow
- Enable via: `Clarity: Switch to Instant Mode` command

#### **Confirmation Mode** ✅ (Default)
- Shows the improved prompt with action buttons
- **"Send to Copilot"** - Forwards to Copilot Chat
- **"Copy to Clipboard"** - Copies for manual use
- More control over the process

## 📸 Screenshots

### Confirmation Mode in Action
![Confirmation Mode](screenshots/confirmation-mode.png)
*Shows improved prompt with "Send to Copilot" and "Copy" buttons*

### Instant Mode in Action  
![Instant Mode](screenshots/instant-mode.png)
*Automatically forwards enhanced prompts to Copilot*

## 🛠️ Installation & Setup

### 1. Install the Extension
```bash
# Install from VSIX
code --install-extension clarity-0.0.1.vsix

# Or search "Clarity" in VS Code Extensions
```

### 2. Configure API Key
1. Open VS Code Settings (`Ctrl+,`)
2. Search for "clarity"
3. Add your Google Gemini API key to `clarity.geminiApiKey`
4. Get your API key from: [Google AI Studio](https://aistudio.google.com/app/apikey)

### 3. Choose Your Mode
- **Default**: Confirmation Mode (shows buttons)
- **Switch to Instant**: Run `Clarity: Switch to Instant Mode` command

## ⚙️ Configuration

| Setting | Description | Default | Options |
|---------|-------------|---------|---------|
| `clarity.mode` | How Clarity handles improved prompts | `confirmation` | `instant`, `confirmation` |
| `clarity.useExternalLLM` | Use Gemini API for enhancement | `true` | `true`, `false` |
| `clarity.geminiApiKey` | Your Google Gemini API key | *(required)* | Your API key |

## 📝 Examples

### Before & After Enhancement

| **Your Input** | **Clarity's Enhancement** |
|----------------|---------------------------|
| `make a website` | "Create a modern, responsive website with HTML5 semantic structure, CSS Grid/Flexbox layout, mobile-first design, accessibility features, clean navigation, and SEO optimization" |
| `fix bug` | "Debug and fix the authentication bug by analyzing error logs, checking token validation, verifying API endpoints, and implementing proper error handling" |
| `explain hooks` | "Provide a comprehensive explanation of React Hooks including useState, useEffect, custom hooks, rules of hooks, and practical examples with best practices" |

### Workflow Examples

#### Instant Mode Flow:
```
You: @clarity make a REST API
↓
Clarity: [Enhances prompt automatically]
↓
Copilot: [Receives detailed API specification]
↓
Result: Complete API implementation
```

#### Confirmation Mode Flow:
```
You: @clarity optimize performance
↓  
Clarity: Shows enhanced prompt with buttons
↓
You: Click "Send to Copilot" 
↓
Copilot: [Receives detailed optimization guide]
↓
Result: Comprehensive performance improvements
```

## 🏗️ Architecture

```
src/
├── extension.ts     # Main extension entry point & chat participant
├── llmClient.ts     # Google Gemini 2.0 Flash API integration
├── autocorrect.ts   # Core prompt enhancement logic
├── config.ts        # Settings and configuration management
└── forward.ts       # Copilot integration and command handling
```

## 🚀 Key Benefits

- **🎯 Better AI Results**: Detailed prompts = higher quality responses
- **⏱️ Time Saving**: No more writing long, detailed prompts manually  
- **🧠 Expert Knowledge**: Leverage domain expertise automatically
- **🔄 Seamless Workflow**: Integrates directly with your existing Copilot workflow
- **🎛️ Flexible Control**: Choose between instant or confirmation modes

## 💡 Why Use Clarity?

**Without Clarity:**
```
You: "make a website"
Copilot: Creates basic HTML page with minimal styling
```

**With Clarity:**
```
You: "@clarity make a website"
Clarity: Enhances to detailed specification
Copilot: Creates professional, responsive website with best practices
```

## 🔧 Commands

| Command | Description |
|---------|-------------|
| `Clarity: Switch to Instant Mode` | Auto-forward enhanced prompts to Copilot |
| `Clarity: Switch to Confirmation Mode` | Show buttons for manual control |

## 📋 Requirements

- VS Code 1.90.0 or higher
- GitHub Copilot extension (for forwarding functionality)
- Google Gemini API key (free tier available)

## 🤝 Contributing

Contributions are welcome! This extension is built with:
- **TypeScript** for type safety
- **VS Code Extension API** for chat participants
- **Google Gemini 2.0 Flash** for AI enhancement

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/Attafii/ClarityAI)
- [Get Gemini API Key](https://aistudio.google.com/app/apikey)
- [VS Code Extension Guidelines](https://code.visualstudio.com/api)

---

**✨ Transform your prompts from vague to expert-level with Clarity!**

*Made with ❤️ for the VS Code community*
