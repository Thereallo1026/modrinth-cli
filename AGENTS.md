This repository contains a CLI project for Modrinth. Treat it as production code in a major repo.

## Working Rules

- Keep track of every change you make. Check `git status --short` before edits, after edits, and before the final response.
- Keep the working tree readable. Place source code under `src/`, tests under `src/tests`, generated output under `dist/`, and scratch work outside the repo.
- Write optimized code. Favor direct data flow, bounded allocations, streaming I/O for installs, and explicit error handling.
- Use Bun for commands, scripts, tests, and builds.
- Keep the CLI authless. Use public Modrinth endpoints and public data only.
- Keep package dependencies small and purposeful.
- Write code as if this repo will grow into many commands, contributors, and tests.
- Treat `src/` as the working directory for code. Create feature folders there as the command surface grows.
- Prefer `@/` imports for code inside `src/`. Use `../` only when importing files outside `src`, such as `package.json`.

## Project Structure

- `src/commands` hosts top-level CLI commands.
- `src/components` hosts terminal UI components.
  - `src/components/install/card.ts` owns the install project card.
  - `src/components/install/headers.ts` owns install-specific header lines, such as packwiz parse timing.
  - `src/components/install/installed.ts` owns installed mod list and install summary output.
  - `src/components/install/status.ts` owns one-line package progress output.
  - `src/components/search/results.ts` owns search result tables.
  - `src/components/project/card.ts` owns project summary cards.
  - `src/components/version/table.ts` owns version/build tables.
  - `src/components/user/profile.ts` owns user and organization display.
  - `src/components/tui` hosts shared terminal UI helpers used across components.
- `src/modrinth` hosts code that works with `@modrinth/api-client` and Modrinth API concepts.
- `src/packwiz` hosts packwiz pack parsing, safe path resolution, metadata interpretation, and pack install planning.
- `src/output` hosts machine-readable JSON output and CLI error formatting.
- `src/lib` hosts helpers and functions reused across multiple commands or modules.
  - `src/lib/concurrency.ts` owns bounded concurrent task execution.
  - `src/lib/download-file.ts` owns streaming downloads, hash verification, and atomic file writes.
  - `src/lib/errors.ts` owns shared error classes.
  - `src/lib/minecraft-versions.ts` owns dynamic Mojang version loading and caching.
  - `src/lib/page.ts` owns pagination math.
  - `src/lib/paths.ts` owns output path helpers.
- `src/tests` hosts tests.
- `temp/packwiz-manual-test` hosts the manual large packwiz fixture.
- Keep command names flat. Prefer `modrinth search`, `modrinth install`, `modrinth view`, and `modrinth user`.
- Avoid nested action commands like `version get` and `version list`.

## TUI Components

- `src/components/tui/style.ts` owns ANSI styling primitives, color helpers, badges, and visible-width measurement.
- `src/components/tui/table.ts` owns plain terminal table rendering and width padding.
- `src/components/tui/page.ts` owns pagination footer badges.
- `src/components/tui/header.ts` owns the shared command header.
- `src/components/tui/loader-list.ts` owns loader name and badge rendering.
- `src/components/tui/loaders.ts` owns the known Modrinth loader metadata.
- `src/components/tui/project-cell.ts` owns the shared bold-title plus gray slug cell.
- `src/components/tui/format.ts` owns shared number formatters.
- `src/components/tui/versions.ts` owns Minecraft version range formatting.
- Build command-specific display from small components in `src/components/<domain>/`.
- Keep raw ANSI escape codes inside `src/components/tui/style.ts`.
- Keep command files focused on orchestration, data fetching, and choosing output mode.

## Testing

- Write tests only when they protect meaningful behavior.
- Avoid useless tests that only assert implementation trivia.
- Put every test under `src/tests`.
- Prefer tests for command contracts, error shapes, project resolution, version selection, and file-download safety.
- Keep tests fast and deterministic. Use live Modrinth calls only for explicit smoke checks.

## Checks And Formatting

- Run `bun check` to check linter and formatter issues.
- Run `bun fix` before manually fixing linter or formatter issues.
- Run `bun tsc` after TypeScript or API shape changes.
- Run `bun test` after behavior changes or test changes.
- Use manual edits for logic changes after automated formatting has done the mechanical cleanup.

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
