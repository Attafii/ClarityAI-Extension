# Agent Workflow Blueprint: diagnose

## Purpose
A workflow for diagnosing issues in the codebase. AI agents should use this to systematically identify root causes.

## Context Gathering

Before diagnosing, gather:
- **Project name**: From package.json or map.md
- **Stack**: Node version, framework version (from stack.md)
- **Relevant files**: Identify files involved in the issue
- **Current goal**: What was being worked on when issue appeared
- **Symptoms**: Error messages, unexpected behavior, performance issues

## Workflow Steps

### 1. Inspect
\`\`\`
clarity map --focus [affected-files]
clarity checkpoint
\`\`\`
- Identify the component boundaries
- Map data flow through the system
- Trace the execution path

### 2. Trace
- Read configuration files (stack.md, constraints.md)
- Examine imports and dependencies
- Follow the call chain from entry point
- Look for data transformation points

### 3. Evaluate
- Compare expected vs actual behavior
- Identify the divergence point
- Check for: type errors, null/undefined values, logic errors, environmental issues

### 4. Hypothesize
- Form a testable hypothesis
- Identify what would confirm or deny
- Prioritize by likelihood

### 5. Verify
- Add diagnostic logging
- Run targeted tests
- Check version compatibility (stack.md)

### 6. Report
\`\`\`
clarity checkpoint --update
\`\`\`
- Document the root cause
- Suggest specific fix
- Identify files to modify
- Note constraints to follow

## Anti-Patterns (from constraints.md)
- ❌ Don't use eval() or innerHTML
- ❌ Don't make N+1 queries
- ❌ Don't ignore error handling
- ❌ Don't use sync file operations

## Output Format

\`\`\`markdown
# Diagnosis Report

## Symptom
[Describe the observed issue]

## Root Cause
[Explain what caused the issue]

## Evidence
- [Evidence point 1]
- [Evidence point 2]

## Fix
[Specific steps to resolve]

## Files to Modify
- [File 1]
- [File 2]

## Constraints
- [Constraint to follow during fix]
\`\`\`

## Next Step
After diagnosis, use `clarity generate refine` or `clarity generate streamline` as appropriate.