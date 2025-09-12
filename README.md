# ClarityAI - Intelligent Prompt Enhancement for VS Code

**ClarityAI** is a VS Code ex## ⚙️ Configuration

| Setting | Description | Default | Required |
|---------|-------------|---------|----------|
| `clarity.geminiApiKey` | Your API key for AI enhancement | *(empty)* | Yes |

*Note: ClarityAI uses advanced AI technology to enhance your prompts. An API key is required for the enhancement service.* that transforms your simple prompts into professional, detailed specifications using advanced AI technology. Get better results from GitHub Copilot Chat with enhanced, structured prompts.

## ✨ Features

- **🤖 AI-Powered Enhancement**: Advanced AI technology for intelligent prompt improvement
- **📝 Grammar & Spelling Correction**: Automatically fixes typos and grammatical errors
- **🎯 Smart Enhancement**: Transforms vague prompts into detailed, actionable specifications
- **🔗 Seamless Copilot Integration**: Works directly with GitHub Copilot Chat
- **⚡ One-Click Operation**: Simple `@clarity` command in VS Code Chat
- **🔄 Context-Aware Follow-ups**: Smart suggestions based on your enhanced prompts
- **✂️ Flexible Options**: Add detail, simplify, or restructure your prompts

## 🎮 How to Use @clarity

### Basic Usage
1. **Open VS Code Chat Panel** (Ctrl+Shift+I or Cmd+Shift+I)
2. **Type `@clarity` followed by your prompt**:
   ```
   @clarity make a website
   @clarity fix my authentication bug
   @clarity explain how React hooks work
   ```
3. **Get enhanced prompts** with action buttons and smart follow-ups

### 🔄 Operation Modes

#### **Confirmation Mode** ✅ (Current)
- Shows the enhanced prompt with action buttons
- **"🤖 Send to Copilot"** - Forwards clean prompt to Copilot Chat
- **"📋 Copy Prompt"** - Copies enhanced prompt to clipboard
- **Smart Follow-ups** - Context-aware suggestions for further enhancement

#### **Instant Mode** ⚡ (Soon)
- Coming soon: Automatically enhance and send prompts directly to Copilot
- Perfect for seamless, rapid workflow

## 📸 Screenshots

### ClarityAI in Action
![ClarityAI Enhancement](screenshots/clarity-mode.png)
*Shows enhanced prompt with "Send to Copilot" and "Copy" buttons plus smart follow-ups*

## 🛠️ Installation & Setup

### 1. Install the Extension
```bash
# Install from VSIX
code --install-extension clarity-0.0.1.vsix

# Or search "ClarityAI" in VS Code Extensions
```

### 2. Configure API Key
1. Open VS Code Settings (`Ctrl+,`)
2. Search for "clarity"
3. Add your API key to `clarity.geminiApiKey`
4. Get your API key from: [Google AI Studio](https://aistudio.google.com/app/apikey)

### 3. Start Using
- Open VS Code Chat Panel
- Type `@clarity` followed by your prompt
- Enjoy enhanced prompts with smart follow-ups!

## ⚙️ Configuration

| Setting | Description | Default | Options |
|---------|-------------|---------|---------|
| `clarity.mode` | How Clarity handles improved prompts | `confirmation` | `instant`, `confirmation` |
| `clarity.useExternalLLM` | Use Gemini API for enhancement | `true` | `true`, `false` |
| `clarity.geminiApiKey` | Your Google Gemini API key | *(required)* | Your API key |

## 📝 Examples

### Before & After Enhancement

| **Your Input** | **ClarityAI's Enhancement** |
|----------------|-----------------------------|
| `make a website` | "Create a modern, responsive website with HTML5 semantic structure, CSS Grid/Flexbox layout, mobile-first design, accessibility features, clean navigation, and SEO optimization" |
| `fix bug` | "Debug and fix the authentication bug by analyzing error logs, checking token validation, verifying API endpoints, and implementing proper error handling" |
| `explain hooks` | "Provide a comprehensive explanation of React Hooks including useState, useEffect, custom hooks, rules of hooks, and practical examples with best practices" |

### Workflow Examples

#### Current Workflow:
```
You: @clarity make a REST API
↓
ClarityAI: [Shows enhanced prompt with buttons]
↓
You: Click "🤖 Send to Copilot" 
↓
Copilot: [Receives detailed API specification]
↓
Result: Complete API implementation
```

#### Smart Follow-ups:
```
You: @clarity optimize performance
↓  
ClarityAI: Shows enhanced prompt + follow-up suggestions:
  🎯 Add More Detail
  🔰 Make Beginner-Friendly  
  ✂️ Simplify Prompt
  ⚙️ Add Constraints
  📋 Make Step-by-Step
```

## 🏗️ Architecture

```
src/
├── extension.ts     # Main extension entry point & chat participant
├── llmClient.ts     # AI API integration and response cleaning
├── autocorrect.ts   # Core prompt enhancement logic
├── config.ts        # Settings and configuration management
└── forward.ts       # Copilot integration and command handling
```

## 🚀 Key Benefits

- **🎯 Better AI Results**: Detailed prompts = higher quality responses
- **⏱️ Time Saving**: No more writing long, detailed prompts manually  
- **🧠 Expert Knowledge**: Leverage domain expertise automatically
- **🔄 Seamless Workflow**: Integrates directly with your existing Copilot workflow
- **🤖 Smart Follow-ups**: Context-aware suggestions for prompt refinement
- **🧹 Clean Integration**: Removes AI commentary, sends pure prompts to Copilot

## 💡 Why Use ClarityAI?

**Without ClarityAI:**
```
You: "make a website"
Copilot: Creates basic HTML page with minimal styling
```

**With ClarityAI:**
```
You: "@clarity make a website"
ClarityAI: Enhances to detailed specification
Copilot: Creates professional, responsive website with best practices
```

## 💸 Don't Worry, We're Not Spending Your Money! 

**🤑 The Good News**: When you chat with `@clarity`, we're NOT burning through your expensive Claude 4 or GPT-4 credits!

**🎭 Here's the Comedy:**
- **You**: "@clarity help me code"
- **Your Wallet**: 😴 *Still sleeping peacefully*
- **ClarityAI**: *Uses our own AI magic* ✨
- **Your Premium Models**: 🛋️ *Chilling on the couch, completely untouched*

**💰 Cost Breakdown (The Truth):**
```
@clarity enhance my prompt = ~$0.001 (our treat!)
Click "Send to Copilot" = Uses YOUR subscription (but worth it!)
```

**🎪 Fun Fact**: ClarityAI is like having a professional prompt writer who works for peanuts, so you can save your premium AI budget for the *real* heavy lifting! We enhance, you decide when to splurge on the fancy stuff. 

*Translation: Chat with ClarityAI all day long without guilt! 🎉*

## 🔧 Commands

| Command | Description |
|---------|--------------|
| `@clarity [prompt]` | Enhance your prompt with AI and get action buttons |
| `clarity.forwardToCopilot` | Send enhanced prompt to Copilot (triggered by button) |
| `clarity.copyPrompt` | Copy enhanced prompt to clipboard (triggered by button) |

*Additional commands and instant mode coming soon!*

## 📋 Requirements

- VS Code 1.90.0 or higher
- GitHub Copilot extension (for forwarding functionality)
- API key for AI enhancement service (free tier available)

## 🤝 Contributing

Contributions are welcome! This extension is built with:
- **TypeScript** for type safety
- **VS Code Extension API** for chat participants
- **Advanced AI Technology** for intelligent enhancement

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🔗 Links

- [GitHub Repository](https://github.com/Attafii/ClarityAI)
- [Get API Key](https://aistudio.google.com/app/apikey)
- [VS Code Extension Guidelines](https://code.visualstudio.com/api)

---

**✨ Transform your prompts from vague to expert-level with ClarityAI!**

*Made with ❤️ for the VS Code community*
