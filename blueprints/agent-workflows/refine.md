# Agent Workflow Blueprint: refine

## Purpose
A workflow for refining code to improve quality, readability, or performance.

## Context Gathering

Before refining, gather:
- **Target files**: Files to be refined
- **Goal**: What improvement is desired (readability, performance, type safety)
- **Current state**: Read the relevant code sections
- **Constraints**: Review constraints.md

## Workflow Steps

### 1. Evaluate Quality
- Run complexity analysis on target code
- Identify code smells (duplication, large functions, complex conditionals)
- Check type coverage (TypeScript strictness)
- Review error handling completeness

### 2. Define Scope
- Isolate the scope of changes
- Identify all call sites
- Check for side effects
- Ensure backward compatibility

### 3. Plan Refactoring
- Break large refactors into small steps
- Plan rollback strategy
- Identify test points

### 4. Execute
- Apply changes incrementally
- Run tests after each change
- Verify no breaking changes

### 5. Validate
- Run full test suite
- Check code coverage maintained
- Verify types still correct
- Review against constraints.md

### 6. Document
\`\`\`
clarity checkpoint --update
\`\`\`
- Note what was changed and why
- Update map.md if dependency structure changed
- Record any new ADRs in intent.md

## Code Quality Checklist

- [ ] Single responsibility (functions do one thing)
- [ ] No magic numbers (use named constants)
- [ ] Proper error handling (no silent failures)
- [ ] Type safety (no `any` without reason)
- [ ] Clean abstraction (no god objects)
- [ ] Composition over inheritance
- [ ] Dependency injection (explicit dependencies)

## Anti-Patterns to Avoid
- ❌ God Objects (classes that do everything)
- ❌ Spaghetti code (circular dependencies)
- ❌ Magic numbers (unexplained constants)
- ❌ Silent failures (swallowed errors)
- ❌ N+1 queries (looping DB calls)

## Output Format

\`\`\`markdown
# Refinement Report

## Target
[Files/functions refactored]

## Changes Made
- [Change 1]
- [Change 2]

## Quality Improvements
- [Improvement 1]
- [Improvement 2]

## Tests Added/Updated
- [Test file]: [Coverage added]

## Files Modified
- [File 1]
- [File 2]

## Verification
- [x] Tests pass
- [x] Types correct
- [x] No breaking changes
\`\`\`

## Next Step
After refinement, use `clarity generate test` to ensure coverage is maintained.