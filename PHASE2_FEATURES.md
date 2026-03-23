# ClarityAI Phase 2 Features Documentation

## Overview

Phase 2 introduces four major feature sets that significantly enhance ClarityAI's capabilities:

1. **Interactive Onboarding** - 6-step guided experience
2. **Team Vault** - Collaborative prompt management with approvals
3. **Prompt Suggestions** - Context-aware AI recommendations
4. **Analytics & Privacy** - Privacy-first event tracking

---

## 1. Interactive Onboarding

### Purpose
Guides new users through ClarityAI's capabilities with an engaging, non-intrusive flow.

### Features

#### 6-Step Flow
1. **Welcome** - Introduction to ClarityAI
2. **Quick Start** - Basic usage in 30 seconds
3. **Three Modes** - Smart, Fast, and Thinking modes explained
4. **Templates** - 50+ pre-built prompt templates
5. **Privacy & Security** - Secret Shield and data protection
6. **Get Started** - Ready to enhance prompts!

#### Technical Details
- **Location**: `src/onboarding.ts`
- **Size**: 600 LOC
- **State**: Persistent in VS Code globalState
- **Trigger**: Automatic on first activation
- **Commands**:
  - `clarity.showOnboarding` - Manual trigger

#### User Experience
```
@clarity /onboarding    → Shows first step
[Next] [Previous]       → Navigation
[Skip for now]          → Manual skip option
Progress: 33%           → Visual progress bar
```

#### Implementation
- Webview-based UI with responsive design
- Markdown to HTML rendering
- Session persistence
- Network-free (all content local)

### API Usage

```typescript
import { OnboardingManager } from './onboarding';

const onboarding = new OnboardingManager(context, logger);

// Check if user needs onboarding
if (onboarding.shouldShowOnboarding()) {
    await onboarding.showStep(0); // Show first step
}

// Mark as complete
await onboarding.completeOnboarding();

// Reset for testing
await onboarding.resetOnboarding();
```

---

## 2. Team Vault - Approval Workflow

### Purpose
Enables teams to collaboratively build and maintain a library of high-quality prompts with structured approval workflows.

### Features

#### Vault States
```
Draft → Pending Approval → (Approved / Rejected)
```

#### Role-Based Access
- **Admin**: Create, approve, export vault
- **Reviewer**: Approve/reject submissions
- **Contributor**: Submit prompts for approval

#### Operations

##### Save to Draft
```typescript
const prompt = await vault.saveToDraft(
    'Validator Function',
    'Original prompt text',
    'Enhanced prompt text',
    ['testing', 'validation'] // tags
);
```

##### Submit for Approval
```typescript
await vault.submitForApproval(promptId, 'Please review');
// Triggers notifications to team reviewers
```

##### Review Operations
```typescript
// Approve
if (reviewer.canApprove) {
    await vault.approvePrompt(promptId);
}

// Reject
await vault.rejectPrompt(promptId, 'Needs more security focus');
```

##### Get Vault Data
```typescript
// All prompts
const all = vault.getPrompts();

// By status
const drafts = vault.getPrompts('draft');
const pending = vault.getPendingApprovals();
const approved = vault.getApprovedPrompts();

// Statistics
const stats = vault.getStatistics();
// {
//   total: 15,
//   draft: 3,
//   pending: 2,
//   approved: 10,
//   rejected: 0,
//   totalUsage: 245,
//   mostUsed: { id: '123', title: 'API Design', usage: 45 }
// }
```

##### Export & Backup
```typescript
// Export only approved prompts for sharing
const exported = vault.exportVault(true);
// Save to JSON for backup
```

#### Technical Details
- **Location**: `src/teamVault.ts`
- **Size**: 350 LOC
- **Storage**: VS Code globalState (globalState API)
- **Commands**:
  - `clarity.vault.submit` - Submit for approval

### API Usage

```typescript
import { TeamVaultManager } from './teamVault';

const vault = new TeamVaultManager(context, logger, errorTracker);

// Initialize team configuration
await vault.initializeTeamVault({
    teamName: 'Engineering Team',
    teamId: 'team-abc123',
    members: [
        {
            id: 'user-1',
            name: 'Alice',
            email: 'alice@company.com',
            role: 'admin',
            canApprove: true
        }
    ],
    requireApproval: true,
    autoApproveAfterRewrites: false
});

// Set current user context
vault.setCurrentUser(currentUser);

// Save and submit
const prompt = await vault.saveToDraft(title, original, enhanced, tags);
await vault.submitForApproval(prompt.id, notes);
```

---

## 3. Prompt Suggestions

### Purpose
Intelligently recommends prompt improvements based on your current code context.

### Features

#### Smart Detection
Analyzes:
- File type (test, code, documentation)
- Language (TypeScript, Python, etc.)
- Code complexity (simple, moderate, complex)
- Gaps (missing tests, missing docs)

#### 8 Categories
1. **Testing** - Unit, integration, test coverage
2. **Documentation** - Comments, JSDoc, README
3. **Refactoring** - Code clarity, complexity reduction
4. **Optimization** - Performance, bundle size
5. **Architecture** - Design patterns, API design
6. **Security** - Vulnerability analysis, validation
7. **Debugging** - Debugging strategies
8. **Feature** - Add functionality

#### Suggestion Properties
```typescript
interface Suggestion {
    id: string;
    title: string;
    description: string;
    prompt: string; // Ready to use in @clarity
    category: SuggestionCategory;
    confidence: number; // 0-100
    learnMoreUrl?: string;
}
```

#### Confidence Scoring
- **95+**: Critical gaps (missing tests/docs)
- **85-94**: High-value improvements
- **75-84**: Beneficial additions
- **60-74**: Nice-to-haves

#### Deduplication
- Tracks suggestion history
- Avoids showing same suggestion repeatedly
- Clears with `clearHistory()`

#### Technical Details
- **Location**: `src/promptSuggestions.ts`
- **Size**: 400 LOC
- **Latency**: <100ms context detection
- **Commands**:
  - `clarity.suggestions.show` - Quick pick UI

### API Usage

```typescript
import { PromptSuggestionsManager } from './promptSuggestions';

const suggestions = new PromptSuggestionsManager(logger);

// Get suggestions for active editor
const editor = vscode.window.activeTextEditor;
const suggestions = await suggestions.getSuggestions(editor, 5);

// Get by category
const testingTips = suggestions.getOptimizationSuggestions();
const securityTips = suggestions.getSecuritySuggestions();

// Clear repetition history
suggestions.clearHistory();
```

---

## 4. Analytics & Privacy Compliance

### Purpose
Understand how users interact with ClarityAI while respecting privacy and GDPR compliance.

### Features

#### Event Tracking (15+ Types)

**Extension Lifecycle**
- `extension_activated` - Version info
- `extension_deactivated` - Session end

**Usage Events**
- `prompt_enhanced` - Model, duration, success
- `model_selected` - Fast/thinking/smart mode
- `vault_created` - Item count
- `vault_submitted` - Approval requests
- `vault_approved` - Approvals granted
- `vault_rejected` - Rejected prompts
- `suggestion_shown` - Category, count
- `suggestion_selected` - Selection tracking

**User Journey**
- `onboarding_started` - First run
- `onboarding_completed` - Completion rate
- `onboarding_skipped` - Drop-off tracking

**Feedback & Errors**
- `feedback_provided` - User ratings
- `error_occurred` - Error tracking
- `quota_exceeded` - Limit tracking

#### Privacy by Design

**What We Collect**
✅ Event types and timestamps
✅ Model selection (fast/thinking)
✅ Prompt length ranges
✅ Error types (anonymized)
✅ Feature usage counts

**What We Never Collect**
❌ Your actual code or prompts
❌ Personal information (names, emails)
❌ API keys or credentials
❌ File paths or project structure
❌ IP addresses or location data

#### Consent Management

**Consent States**
```
First Run → Banner Shown → User Chooses
└─ Enable Analytics → Events tracked
└─ Disable → Events discarded
```

**User Can Anytime**
- Enable/disable in preferences
- View privacy policy
- Access settings via `clarity.preferences`

#### Batching
- **Strategy**: Queue events, batch in groups of 20
- **Flush**: Every 5 minutes or when batch is full
- **Failure**: Silent - never disrupts main app

#### Technical Details
- **Location**: `src/analytics.ts`, `src/consent.ts`
- **Size**: 500 LOC combined
- **Infrastructure**: PostHog-compatible API
- **Anonymous IDs**: SHA256 hashed (no PII)

### API Usage

```typescript
import { AnalyticsManager } from './analytics';
import { ConsentManager } from './consent';

// Initialize analytics
const analytics = new AnalyticsManager(posthogApiKey);
const consent = new ConsentManager(context);

// Show consent banner on activation
if (!consent.hasConsentBannerBeenShown()) {
    const accepted = await consent.showConsentBanner();
    analytics.setConsent(accepted);
}

// Track events
analytics.trackPromptEnhanced('gpt-4', 500, true, 150);
analytics.trackVaultSubmitted();
analytics.trackError('API_TIMEOUT', 'high', 'llm_api_call');

// User can manage preferences anytime
analytics.setUserSegment({
    tier: 'premium',
    daysActive: 30,
    promptsEnhanced: 100,
    vaultSize: 15
});

// Get status
const status = analytics.getStatus();
// {
//   enabled: true,
//   queueSize: 5,
//   distinctId: '3f2d8e9c4b1a5f7e',
//   apiKeySet: true
// }
```

---

## Integration with VS Code Chat

### Commands Registered

```bash
@clarity /vault           # Show saved prompts
@clarity /help            # Show help

# New Phase 2 commands:
clarity.vault.submit     # Submit for team approval
clarity.suggestions.show # Show AI recommendations
```

### Command Examples

**Submit Prompt to Team Vault**
```typescript
vscode.commands.executeCommand('clarity.vault.submit',
    'Validator Function',
    enhancedPrompt
);
```

**Show Context Suggestions**
```typescript
vscode.commands.executeCommand('clarity.suggestions.show');
// Opens quick pick with AI recommendations
```

**Show Onboarding**
```typescript
vscode.commands.executeCommand('clarity.showOnboarding');
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run Phase 2 tests only
npm test -- phase2-e2e.test.ts

# Watch mode
npm test:watch

# Coverage
npm test:coverage
```

### Test Coverage

Phase 2 E2E test suite covers:
- ✅ Team vault CRUD operations
- ✅ Approval workflows
- ✅ Suggestion detection
- ✅ Analytics event tracking
- ✅ Consent management
- ✅ Onboarding flow
- ✅ Integration scenarios
- ✅ Privacy compliance

---

## Configuration

### Settings in package.json

```json
{
  "clarity.enableAnalytics": {
    "type": "boolean",
    "default": false,
    "description": "Enable anonymous usage analytics"
  },
  "clarity.vaultRequiresApproval": {
    "type": "boolean",
    "default": true,
    "description": "Require team approval for vault items"
  },
  "clarity.showOnboarding": {
    "type": "boolean",
    "default": true,
    "description": "Show onboarding on first activation"
  }
}
```

### Environment Variables

```bash
# For analytics (optional - PostHog integration)
CLARITY_ANALYTICS_KEY=phc_xxxxxxxxxxxxx

# For team features
CLARITY_TEAM_ID=team-abc123
CLARITY_TEAM_NAME="Engineering Team"
```

---

## Troubleshooting

### Onboarding Not Showing
```
Check: clarity.onboarded in globalState
Reset: clarity.resetOnboarding command
```

### Vault Not Saving
```
Check: VS Code globalState access
Clear: clarity.vault.prompts key
Retry: Save prompt again
```

### Analytics Not Batching
```
Verify: CLARITY_ANALYTICS_KEY is set
Check: Analytics consent is enabled
Monitor: analytics.getQueueSize()
```

### Suggestions Not Showing
```
Ensure: Active editor is open
Verify: File has supported language
Check: Code complexity is detected
```

---

## Performance Considerations

### Memory Usage
- Vault: ~1KB per prompt (1000 prompts = 1MB)
- Analytics queue: ~100 bytes per event
- Suggestion history: ~50 bytes per suggestion

### Startup Time
- Onboarding load: <50ms
- Vault initialization: <10ms
- Analytics init: <5ms
- Suggestions manager: <1ms

### Network Usage
- Batch size: 20 events per request
- Flush interval: 5 minutes
- Typical payload: 2-5KB per batch

---

## Future Enhancements

### Phase 3 (Planned)
- [ ] Cloud sync for vault (multi-device)
- [ ] Advanced approval workflows
- [ ] Suggestion AI fine-tuning
- [ ] Analytics dashboard
- [ ] Team reporting
- [ ] Mobile app support

---

## Support

For issues or questions:
- 📖 [Documentation](https://clarity-ai.app/docs)
- 🐛 [Report Bug](https://github.com/Attafii/ClarityAI-Extension/issues)
- 💬 [Community Chat](https://clarity-ai.app/community)
- 📧 [Email Support](mailto:support@clarity-ai.app)

---

**Version**: 1.3.0 (Phase 2 Complete)
**Last Updated**: March 23, 2026
**Status**: Production Ready ✅
