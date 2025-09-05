# ClarityAI - Intelligent Prompt Enhancement for VS Code

 **ClarityAI** is a VS Code extension that enhances vague user prompts using **Gemini 2.0 Flash API** to provide detailed, expert-level specifications that ensure high-quality results.

##  Features

- ** AI-Powered Enhancement**: Uses Google Gemini 2.0 Flash to intelligently enhance prompts
- ** Domain Detection**: Automatically detects the field/domain from any input
- ** Expert Mode**: Acts as a domain expert to provide comprehensive guidelines
- ** Structured Output**: Returns detailed, actionable prompts with best practices
- ** VS Code Integration**: Works seamlessly via `@clarity` chat participant

##  How It Works

For any input prompt (no matter how vague), ClarityAI:

1. **Parses & Classifies** the prompt to detect the field/domain
2. **Infers missing details** using Gemini 2.0 Flash to act as a domain expert  
3. **Returns a structured, enhanced prompt** that's detailed and actionable

##  Examples

| **Original Prompt** | **Enhanced Result** |
|-------------------|-------------------|
| `"make a website"` | Comprehensive web development spec with responsive design, accessibility, SEO, performance optimization |
| `"debug function"` | Structured debugging workflow with root cause analysis steps |
| `"explain AI"` | Complete guide covering types, workflow, applications, ethics |
| `"create API"` | Full REST API specification with authentication, documentation, security |
| `"optimize code"` | Performance optimization framework with bottleneck analysis |

##  Installation

1. **Install the Extension**:
   ```bash
   code --install-extension clarity-0.0.1.vsix
   ```

2. **Configure API Key**:
   - Open VS Code Settings
   - Search for "clarity"
   - Set your Gemini API key in `clarity.geminiApiKey`

##  Usage

1. **Open VS Code Chat Panel**
2. **Use the `@clarity` participant**:
   ```
   @clarity make a website
   @clarity fix my bug  
   @clarity explain machine learning
   @clarity create an API
   ```

3. **Get Enhanced Prompts**:
   - Receive detailed, expert-level specifications
   - Use the enhanced prompts for better results

##  Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| `clarity.mode` | Operation mode: `instant` or `confirmation` | `confirmation` |
| `clarity.useExternalLLM` | Enable Gemini 2.0 Flash enhancement | `true` |
| `clarity.geminiApiKey` | Your Google Gemini API key | Required |

##  Architecture

```
src/
 extension.ts     # VS Code chat participant registration
 llmClient.ts     # Gemini 2.0 Flash API integration  
 autocorrect.ts   # Core prompt improvement logic
 config.ts        # Configuration management
 forward.ts       # Copilot integration utilities
```

##  Key Benefits

- ** Better Results**: Detailed prompts lead to higher quality AI responses
- ** Productivity**: Save time writing comprehensive prompts manually
- ** Expert Knowledge**: Leverage domain expertise in any field
- ** Consistency**: Standardized, structured prompt format
- ** User-Friendly**: Simple `@clarity` command in VS Code chat

##  Before vs After

**Before ClarityAI:**
```
User: "make a website"
AI: Creates basic HTML page
```

**After ClarityAI:**
```
User: "@clarity make a website"
ClarityAI: "Create a modern, responsive website with HTML5 semantic structure, 
CSS Grid/Flexbox layout, mobile-first responsive design, accessibility 
features (ARIA labels, semantic HTML), clean JavaScript interactions, 
navigation menu, hero section, content areas, footer, performance 
optimization, and SEO best practices..."
AI: Creates comprehensive, professional website
```

##  Contributing

ClarityAI is built with TypeScript and the VS Code Extension API. The core enhancement logic uses Google's Gemini 2.0 Flash model for intelligent prompt improvement.

##  License

This project is licensed under the MIT License.

---

**Transform vague prompts into expert-level specifications with ClarityAI! **
