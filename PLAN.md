# ariel TypeScript Rewrite Plan

`ariel` is now a TypeScript CLI for rendering Mermaid diagrams as static PNGs
and animated videos.

## Architecture

```text
Mermaid text
  -> parser
  -> layout
  -> renderer-neutral scene model
  -> SVG frame renderer
       -> Sharp PNG output
       -> FFmpeg video output
```

## Runtime

- Node.js 22+
- `@dagrejs/dagre` for graph layout
- bespoke layout for sequence diagrams
- `sharp` for SVG-to-PNG rendering
- `ffmpeg` for MP4, WebM, and GIF output
- Commander for the CLI

## Package

- npm package: `ariel-mermaid`
- executable: `ariel`
- local development: `npm ci && npm run build`
- package verification: `npm run ci`

## Commands

```bash
ariel types
ariel parse examples/flowchart.mmd
ariel render examples/flowchart.mmd -o /tmp/flow.png
ariel animate examples/flowchart.mmd -o /tmp/flow.mp4
```

## CI/CD

CI runs:

```bash
npm run fmt-check
npm run lint
npm run test
npm run build
npm pack --dry-run
```

Release builds the npm package tarball, attaches it to the GitHub release, and
publishes to npm when `NPM_TOKEN` is configured.

## Acceptance Checks

Before considering the rewrite complete:

- all TypeScript tests pass
- npm package dry-run includes compiled `dist/` files
- docs site builds
- static PNG output renders for bundled examples
- MP4 output renders for representative diagram types
- generated videos are verified with `ffprobe`
