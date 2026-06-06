This repository contains a CLI project for Modrinth. Treat it as production code in a major repo.

## Working Rules

- Keep track of every change you make. Check `git status --short` before edits, after edits, and before the final response.
- Keep the working tree readable. Place source code under `src/`, tests under `src/tests`, generated output under `dist/`, and scratch work outside the repo.
- Write optimized code. Favor direct data flow, bounded allocations, streaming I/O for downloads, and explicit error handling.
- Use Bun for commands, scripts, tests, and builds.
- Keep the CLI authless. Use public Modrinth endpoints and public data only.
- Keep package dependencies small and purposeful.
- Write code as if this repo will grow into many commands, contributors, and tests.
- Treat `src/` as the working directory for code. Create feature folders there as the command surface grows.

## Project Structure

- `src/commands` hosts top-level CLI commands.
- `src/modrinth` hosts code that works with `@modrinth/api-client` and Modrinth API concepts.
- `src/output` hosts output formatting, CLI error formatting, and machine-readable response details.
- `src/lib` hosts helpers and functions reused across multiple commands or modules.
- `src/tests` hosts tests.
- Keep command names flat. Prefer `modrinth search`, `modrinth download`, `modrinth view`, and `modrinth user`.
- Avoid nested action commands like `version get` and `version list`.

## Testing

- Write tests only when they protect meaningful behavior.
- Avoid useless tests that only assert implementation trivia.
- Put every test under `src/tests`.
- Prefer tests for command contracts, error shapes, project resolution, version selection, and file-download safety.
- Keep tests fast and deterministic. Use live Modrinth calls only for explicit smoke checks.

## Function Design

- Never write helper functions that only serve one purpose.
- Prefer human names for functions. Use verbs and plain domain language like `download`, `search`, `resolve`, `versionsFor`, `pickDownload`, `printJson`, and `showError`.
- Avoid stiff implementation names like `downloadFile`, `formatProjectView`, `findDownloadTarget`, or `renderError` when a shorter domain name is clear.
- Prefer named domain functions that model durable concepts: project resolution, version selection, file download, JSON output, and CLI error handling.
- Keep one-off logic inside the command that owns it.
- Extract shared logic after a second real use appears.
- Keep functions small enough to read quickly and concrete enough to test.

## CLI Contract

- `--json` writes valid JSON to stdout.
- Diagnostics, progress, warnings, and errors go to stderr.
- Exit codes must stay stable.
- Errors should have a stable machine-readable shape when `--json` is active.
- Commands should avoid prompts.
- Download commands should write through a temporary file, verify hashes when available, and rename atomically.

## Modrinth Rules

- Send a clear `User-Agent`.
- Respect Modrinth rate limits.
- Use Modrinth project IDs for durable references.
- Treat names, titles, and slugs as lookup inputs.
- Resolve ambiguous names into explicit candidates.
- Avoid authenticated endpoints, private data, write operations, scraping, and undocumented internal APIs.
