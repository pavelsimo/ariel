# Agent Instructions — ariel

This file is the single canonical source of agent instructions for this repository.
`CLAUDE.md` is a symlink to this file. Do not create separate `CLAUDE.md` or `CODEX.md` variants.

## Project Structure

```
ariel/
├── src/                      # TypeScript source
│   ├── cli.ts                # Commander CLI, global flags, subcommands
│   ├── parser.ts             # Mermaid subset parser
│   ├── layout.ts             # dagre and sequence layout
│   ├── scene.ts              # renderer-neutral scene model
│   └── render/               # shared SVG/PNG/video renderer
├── test/                     # Vitest test suite
├── docs/                     # Markdown documentation source
├── scripts/                  # Build tooling (docs site builder, etc.)
├── .github/workflows/        # CI, release, and pages workflows
├── package.json              # npm metadata, deps, scripts, CLI bin
├── tsconfig.json             # TypeScript compiler config
├── Makefile                  # All developer tasks
└── .lefthook.yml             # Git hook configuration
```

## Build / Test / Dev Commands

```bash
make install      # npm ci (install project + dev deps)
make build        # tsc build to dist/
make test         # run Vitest
make coverage     # run Vitest with coverage
make lint         # run ESLint
make fmt          # run Prettier
make fmt-check    # CI-safe Prettier check
make ci           # full gate: fmt-check + lint + test + build
make docs         # build documentation site to dist/docs-site/
make tools        # install development tools (lefthook)
```

## Coding Style

- All errors written to stderr; primary data to stdout
- Use `process.stderr.write(...)` for diagnostics; `process.stdout.write(...)` for data
- Respect `NO_COLOR` env and `--no-color` flag everywhere color is used
- Prompts only when `process.stdin.isTTY` is true; `--no-input` disables all prompts
- Use `--dry-run` / `-n` before any state-changing operation
- Flag names are lowercase hyphenated; short flags only for the most common (`-v`, `-q`, `-n`, `-V`)
- Subcommands live in `src/cli.ts` or separate modules imported and registered there
- Type annotations on all public functions; TypeScript strict mode is enforced

## Testing Guidelines

- Tests live in `test/`, one file per module under test
- Use Vitest for unit and smoke tests
- Use `it.each` for table-driven tests
- Render smoke tests should verify output files exist and are non-empty
- Run tests: `npm run test`
- Run a single test: `npx vitest run test/cli.test.ts`

## Commit & PR Guidelines

Commits follow the [/commit skill](https://github.com/pavelsimo/commit) convention:
`<emoji> <lowercase imperative summary>`

The emoji carries the type signal — no `feat:` or `fix:` prefix. Body (after a blank line)
explains *why*, not how. No trailing period. All lowercase.

Common emoji:
- ✨ new feature · 🐛 bug fix · ♻️ refactor · 📝 docs
- 👷 CI/CD · 🔧 config · ⬆️ dependency bump · 🔥 remove code

PR description must include:
- What changed and why
- How it was tested
- Any new flags or breaking changes
