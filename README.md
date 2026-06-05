# modrinth-cli

Modrinth for agents, scripts, and terminal-native Minecraft workflows.

## Development

```bash
bun install
bun run dev -- --help
bun run check
```

## Build

```bash
bun run build
```

## Design

The CLI is read-only and uses public Modrinth API data. Machine-facing commands will support `--json` with data written to stdout and diagnostics written to stderr.
