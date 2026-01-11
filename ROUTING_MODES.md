# ClarityAI Routing Modes

ClarityAI now supports three different modes for prompt enhancement, each optimized for different use cases:

## 🤖 @clarity (Smart Routing)

The default smart mode that automatically analyzes your prompt complexity and chooses the best model:

- **Automatic Model Selection**: Analyzes prompt complexity using multiple factors
- **Optimal Performance**: Uses fast LLM for simple tasks, thinking mode for complex ones
- **Complexity Analysis**: Evaluates technical depth, multi-step requirements, and abstract thinking needs

### When Smart Mode Uses Fast LLM:
- Simple, straightforward prompts
- Quick fixes or basic code requests
- Single-step tasks
- Prompts under 25 words

### When Smart Mode Uses Thinking LLM:
- Complex technical concepts (algorithms, architecture, design patterns)
- Multi-step processes requiring planning
- Analytical or conceptual thinking
- Trade-off analysis or decision-making
- Complex coding challenges
- Questions requiring detailed explanations

### Complexity Factors Analyzed:
1. **Prompt Length**: Longer prompts indicate more detail
2. **Technical Keywords**: Architecture, algorithms, optimization, security, etc.
3. **Multi-Step Indicators**: Numbered lists, sequential requirements
4. **Abstract Thinking**: Explanations, comparisons, analysis
5. **Code Complexity**: Error handling, edge cases, performance concerns
6. **Question Complexity**: Multiple questions needing detailed answers

**Complexity Threshold**: Score ≥ 40/100 → Thinking Mode, < 40 → Fast Mode

## ⚡ @clarity-fast (Always Fast)

Always uses ClarityAI's fast engine:

- **Speed Optimized**: Quick responses for rapid iteration
- **Simple Tasks**: Perfect for straightforward requests
- **Quick Fixes**: Grammar, clarity improvements without deep analysis
- **Prototyping**: Fast iterations during development

### Best For:
- Simple code snippets
- Quick grammar/clarity fixes
- Straightforward feature requests
- Basic explanations
- Rapid prototyping
- Time-sensitive tasks

## 🧠 @clarity-thinking (Always Thinking)

Always uses ClarityAI's advanced reasoning mode for complex analysis:

- **Deep Analysis**: Thorough examination of complex problems
- **Multi-Step Planning**: Detailed breakdown of requirements
- **Technical Depth**: Advanced concepts and implementations
- **Best Practices**: Production-ready code with considerations

### Best For:
- Complex algorithms and data structures
- System architecture design
- Security and performance analysis
- Trade-off evaluation
- Production-ready implementations
- Learning and understanding complex topics
- Code reviews requiring deep analysis

## Configuration

### Default Models (ClarityAI Mode)
- **Fast Mode**: Optimized for speed and efficiency
- **Thinking Mode**: Optimized for reasoning and depth

### Custom Configuration
You can configure models in VS Code settings:

```json
{
  "clarity.apiMode": "custom",
  "clarity.fastModel": "your-fast-model",
  "clarity.thinkingModel": "your-reasoning-model"
}
```

## Usage Examples

### Smart Mode (Automatic)
```
@clarity create a REST API with authentication
```
→ Analyzes complexity and chooses thinking mode (complex technical requirement)

```
@clarity fix typos in my code comment
```
→ Analyzes complexity and chooses fast mode (simple task)

### Fast Mode (Explicit)
```
@clarity-fast create a button component
```
→ Always uses fast LLM for quick response

### Thinking Mode (Explicit)
```
@clarity-thinking design a scalable microservices architecture
```
→ Always uses thinking LLM for deep analysis

## Performance Comparison

| Mode | Speed | Quality | Best For |
|------|-------|---------|----------|
| Smart | Adaptive | Optimal | General use |
| Fast | ⚡⚡⚡ | Good | Simple tasks |
| Thinking | ⚡ | Excellent | Complex tasks |

## Complexity Score Examples

### Low Complexity (< 40) → Fast Mode
- "create a button" (Score: 0)
- "fix this typo" (Score: 10)
- "add a simple function" (Score: 20)
- "make it responsive" (Score: 15)

### High Complexity (≥ 40) → Thinking Mode
- "design a scalable authentication system with OAuth2 and JWT" (Score: 65)
- "explain the difference between REST and GraphQL with trade-offs" (Score: 58)
- "refactor this code using SOLID principles and design patterns" (Score: 73)
- "create a real-time chat app with WebSockets, state management, and error handling" (Score: 82)

## Tips for Best Results

1. **Use @clarity** for most tasks - let smart routing decide
2. **Use @clarity-fast** when you need quick iterations
3. **Use @clarity-thinking** for learning complex topics
4. **Be specific** - more details help complexity analysis
5. **Trust the system** - smart mode is optimized for accuracy

## Advanced: Complexity Analysis Algorithm

The complexity analyzer evaluates:
- Word count (50+ words = +15 points)
- Technical keywords (3+ = +25 points)
- Multi-step indicators (2+ = +20 points)
- Thinking keywords (2+ = +20 points)
- Code complexity indicators (2+ = +15 points)
- Simple task indicators (2+ = -20 points)
- Question marks (2+ = +15 points)

**Total Score Range**: 0-100
**Decision Boundary**: 40

This ensures fast responses for simple tasks while leveraging deep thinking for complex problems.
