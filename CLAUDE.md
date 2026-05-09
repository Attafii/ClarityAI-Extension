# ClarityAI Protocol for Claude Code

This file contains instructions for Claude Code to properly interact with ClarityAI projects.

## Session Start Protocol

When starting a session in a ClarityAI project, you MUST:

1. **Read the Protocol Files** (in order):
   ```bash
   cat .clarity/map.md      # Understand project structure
   cat .clarity/aesthetic.md # Design standards
   cat .clarity/constraints.md # What's forbidden
   cat .clarity/checkpoint.md  # Current goal state
   cat .clarity/stack.md     # Technology versions
   cat .clarity/intent.md    # Why decisions were made
   ```

2. **Run `clarity map`** (if map.md is stale or missing):
   ```bash
   clarity map
   ```
   This updates the semantic architecture map with current project state.

3. **Check `clarity checkpoint`** before making changes:
   ```bash
   clarity checkpoint --json
   ```
   This shows the current goal, completed steps, and blockers.

## Before Making Edits

Before editing any file in a ClarityAI project:

1. **Review constraints.md** - Know what's forbidden
2. **Check stack.md** - Verify version compatibility
3. **Review aesthetic.md** - Follow design standards
4. **Check map.md** - Understand the dependency structure

## After Completing Work

After completing any task or set of changes:

1. **Update checkpoint.md**:
   ```bash
   clarity checkpoint --update
   ```
   This records completed steps and updated goals.

2. **Update map.md** if dependencies changed:
   ```bash
   clarity map
   ```

3. **Record significant decisions in intent.md** if the work involved architectural changes.

## CLI Commands Reference

| Command | Purpose |
|---------|---------|
| `clarity init` | Initialize protocol files |
| `clarity map` | Update dependency map |
| `clarity checkpoint` | Show/update state |
| `clarity distill <prompt>` | Compress prompt to token budget |
| `clarity generate <blueprint>` | Use a blueprint template |
| `clarity enhance <prompt>` | Enhance a prompt (legacy) |
| `clarity analyze <prompt>` | Analyze complexity (legacy) |

## Blueprint Workflows

For common tasks, use the appropriate workflow:

1. **Issue Diagnosis**: `clarity generate diagnose`
2. **Code Refinement**: `clarity generate refine`
3. **Security Hardening**: `clarity generate fortify`

## Output Format

When ClarityAI outputs structured markdown, parse it carefully:

- Code blocks contain runnable code
- Checkpoints are in markdown checkbox format
- Maps use node/edge notation
- Blueprints contain variable placeholders `{var}`

## Anti-Patterns to Avoid

From `constraints.md`:

- ❌ Don't use `eval()` or `innerHTML` with user input
- ❌ Don't concatenate strings in SQL queries
- ❌ Don't hardcode secrets or credentials
- ❌ Don't create god objects (classes that do everything)
- ❌ Don't use sync file operations in request handlers
- ❌ Don't make N+1 database queries in loops

## Version Awareness

Always verify versions from `stack.md` before:
- Suggesting library upgrades
- Using language features newer than the project version
- Recommending Node.js API changes

## Context Protocol

Before every significant command:

1. Read relevant protocol files
2. Check current checkpoint state
3. Verify version compatibility
4. Plan changes against constraints

This prevents "logic drift" — making inconsistent decisions across sessions.

---

**Version**: 1.5.0
**For**: Claude Code agent
**Requires**: ClarityAI CLI v1.5.0+