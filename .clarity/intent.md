# Architectural Intent

**Last Updated**: 2026-05-08T21:20:27.617Z
**Version**: 1.0

## Purpose

This file records major architectural decisions to prevent AI "logic drift" - ensuring consistent decision-making across sessions and agents.

## Decision Records (ADRs)

### ADR-001: Project Architecture

**Date**: 2026-05-08
**Status**: Accepted

**Context**:
ClarityAI is a VS Code extension with a CLI companion, designed to enhance developer prompts for AI coding assistants.

**Decision**:
- Use TypeScript for type safety
- Follow layered architecture (UI / Business Logic / Data)
- Keep VS Code extension logic separate from CLI logic
- Use JSON for configuration and state persistence

**Consequences**:
- + Strong type safety across codebase
- + Clear separation of concerns
- + Easy to test individual layers
- - Requires build step (TypeScript compilation)

## Notes

- Add new ADRs when making significant architectural decisions
- Include context, decision, and consequences for each ADR
