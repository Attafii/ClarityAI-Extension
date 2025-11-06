# ClarityAI Features Guide

## 🆕 What's New in v0.0.3

Three powerful new features to supercharge your prompt engineering:

### 1. 📚 Prompt Templates Library

Pre-built, professional templates for common development tasks.

**List all templates:**
```
@clarity templates
```

**Use a template:**
```
@clarity template:rest-api
@clarity t:react-component
@clarity template:unit-tests
```

**Templates with custom parameters:**
```
@clarity template:rest-api resource=users method=POST
@clarity t:form-component formPurpose="login" fields="email,password"
```

**Available Templates:**

#### 🌐 API Development
- `rest-api` - Complete REST API endpoint with validation
- `graphql-resolver` - GraphQL resolver with TypeScript types

#### 🎨 UI Components  
- `react-component` - React component with TypeScript & accessibility
- `form-component` - Form with validation and error handling

#### ✅ Testing
- `unit-tests` - Comprehensive unit tests with edge cases
- `integration-tests` - End-to-end integration tests

#### 💾 Database
- `database-schema` - Database schema with migrations

#### 🏗️ Architecture
- `clean-architecture` - Module following clean architecture

#### 🐛 Debugging
- `debug-error` - Error analysis and fix suggestions

#### 📝 General
- `refactor-code` - Code refactoring guidelines
- `documentation` - Documentation generation

---

### 2. 🔍 Automatic Code Context Injection

ClarityAI automatically detects your project and adds relevant context to prompts.

**What gets detected:**
- ✅ Current file (path, language, test file?)
- ✅ Framework (Next.js, React, Vue, Express, NestJS, etc.)
- ✅ TypeScript usage
- ✅ Key dependencies (Tailwind, Prisma, tRPC, shadcn, etc.)
- ✅ Build tool (Vite, Webpack, Turbo)
- ✅ Test framework (Jest, Vitest, Mocha)

**Example:**

Your prompt:
```
@clarity create a user dashboard
```

Auto-enhanced with context:
```
create a user dashboard

📋 Project Context:
- Working in: src/pages/dashboard.tsx (typescript)
- Tech stack: Next.js 15, TypeScript
- Using: tailwindcss, prisma, trpc, zod
- Build: Vite
- Tests: vitest
```

Then AI enhances further with specific Next.js 15, Tailwind, Prisma best practices!

**Settings:**
- `clarity.autoInjectContext` (default: `true`) - Toggle auto-injection

---

### 3. 📊 Enhanced Diff View

See exactly what was improved and why.

**Shows:**
- ✅ **Improvement metrics** - Words added, structure improvements
- 📈 **Before/After comparison** - Side-by-side view with syntax highlighting  
- 🔑 **Key additions** - What was specifically added:
  - TypeScript types
  - Error handling
  - Validation requirements
  - Testing considerations
  - Accessibility requirements
  - Responsive design
  - Performance optimizations

**Example output:**

```
## 📊 Prompt Comparison

### 📈 Improvements:
- ✅ 45 words added for clarity
- 📋 Structure added (headings, bullet points)
- 🎯 Specificity improved (types, requirements, examples)
- 📝 85% more detailed

### Before (Original):
make a todo app

### After (Enhanced):
Create a todo application with:

REQUIREMENTS:
- Add/edit/delete tasks
- Mark as complete
- Filter (all/active/completed)
- Persistent storage
...

### 🔑 Key Additions:
- TypeScript types specified
- Validation requirements
- Accessibility requirements
- Responsive design
```

**Settings:**
- `clarity.showDiffView` (default: `true`) - Toggle diff view

---

## 💡 Pro Tips

### Combine Features

Use templates with auto-context injection:
```
@clarity template:react-component
```
→ Template gets filled with your current Next.js/React/TypeScript stack!

### Quick Template Access

Shorthand syntax:
```
@clarity t:rest-api          (instead of template:rest-api)
@clarity t:unit-tests        (instead of template:unit-tests)
```

### Learn from Diff View

Use the diff view to understand what makes a good prompt:
- Notice patterns in what gets added
- See how vague becomes specific
- Understand best practices for your stack

### Customize Context

Turn off auto-injection if you prefer manual control:
1. Settings → Search "clarity"
2. Uncheck `clarity.autoInjectContext`

---

## 🎯 Real-World Examples

### Example 1: API with Context

**Your prompt:**
```
@clarity create user registration endpoint
```

**With auto-context (Next.js + Prisma detected):**
```
create user registration endpoint

📋 Project Context:
- Working in: src/app/api/auth/register/route.ts
- Tech stack: Next.js 15, TypeScript
- Using: prisma, zod
```

**Final enhanced prompt:**
```
Create a Next.js 15 App Router API route for user registration:

REQUIREMENTS:
- Route: /api/auth/register
- Validate input with Zod schema (email, password, name)
- Hash password with bcrypt
- Store user in Prisma database
- Return JWT token
- Handle duplicate email errors
- TypeScript types for request/response
...
```

### Example 2: Template + Parameters

**Your prompt:**
```
@clarity template:form-component formPurpose="checkout" fields="email,card,address"
```

**Gets filled and enhanced:**
```
Create a form component for checkout:

FORM FIELDS:
- Email (with validation)
- Card number (formatted, validated)
- Billing address (autocomplete)

VALIDATION:
- Email format (RFC 5322)
- Card number (Luhn algorithm)
- Required field checks
...
```

### Example 3: Debug with Context

**Your prompt:**
```
@clarity template:debug-error errorMessage="Cannot read property 'map' of undefined"
```

**Enhanced with your React context:**
```
Help me debug this error in React:

ERROR: Cannot read property 'map' of undefined

CONTEXT:
- Framework: React with TypeScript
- File: src/components/UserList.tsx

LIKELY CAUSES:
1. Data hasn't loaded yet (async)
2. API returned null/undefined
3. Missing optional chaining

SOLUTIONS:
1. Add loading state
2. Use optional chaining: data?.map()
3. Default to empty array: (data || []).map()
...
```

---

## 🚀 Coming Soon

- **Prompt History** - Search and reuse past successful prompts
- **Multi-language Support** - Translate prompts before enhancement
- **Custom Templates** - Create and share your own templates
- **Team Templates** - Share templates with your team via Git
- **Smart Validation** - Warnings for vague or incomplete prompts

---

## ❓ FAQ

**Q: Do templates work without context injection?**  
A: Yes! They work independently. Context just makes them better.

**Q: Can I create custom templates?**  
A: Not yet, but it's coming in v0.1.0!

**Q: Does context injection send my code to AI?**  
A: No! Only metadata (framework name, dependency names, file path) is sent. Never your actual code.

**Q: Can I disable specific features?**  
A: Yes! Check settings:
- `clarity.autoInjectContext` - Toggle context injection
- `clarity.showDiffView` - Toggle diff view

**Q: Are templates customizable per project?**  
A: Not yet, but team templates are planned!

---

## 📝 Feedback

Found a bug? Have a feature request? Template idea?

- GitHub Issues: [ClarityAI-Extension/issues](https://github.com/Attafii/ClarityAI-Extension/issues)
- Email: [Your contact]
- Twitter/X: [@yourhandle]

---

**Enjoy your productivity boost! 🚀**
