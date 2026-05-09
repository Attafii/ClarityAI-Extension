# Changelog

## 1.5.0

### Added
- New `CLIManager` orchestration layer in `src/cliManager.ts` for command-line prompt enhancement, template filling, prompt suggestions, complexity analysis, quota checks, vault operations, consent status, onboarding status, and workspace context reporting.
- Command parsing support for `enhance`, `suggest`, `analyze`, `quota`, `template`, `templates`, `vault`, `context`, `consent`, `onboarding`, and `help` flows.
- Jest coverage for the CLI manager with a VS Code module mock so the new command flow can be validated in Node-based tests.
- Standalone terminal CLI entrypoint with `clarity` and `clarityai` bin aliases, Copilot-ready output, and local state persistence for quota and vault usage.

### Changed
- Prompt enhancement now composes context injection, privacy masking, template hints, and model recommendations into one CLI-friendly output.
- Quota checks now run before consuming CLI actions and return structured usage feedback.

## 1.4.4

### Changed
- Bumped ClarityAI to version 1.4.4 across the extension, README, and feature guide.
- Updated the help banner and release docs to reflect the latest version.

### Fixed
- `@clarity-thinking` now retries transient upstream 524/timeout responses on the fallback model instead of failing immediately.
- HTTP 524 is treated as a timeout for user-facing error handling.

## 1.4.3

### Added
- Cloud synchronization for vaults across Azure Blob Storage, AWS S3, and Firebase.
- Analytics dashboard for vault metrics, team activity, and trends.
- Advanced workflows for multi-reviewer approvals and change requests.

### Improved
- Expanded prompt enhancement features, personas, templates, and privacy tooling.