# ariel

animate Mermaid diagrams as images and videos

[![release](https://img.shields.io/github/v/release/pavelsimo/ariel?style=flat-square&color=4d9e4d&logoColor=white)](https://github.com/pavelsimo/ariel/releases)
[![license MIT](https://img.shields.io/badge/license-MIT-ffd60a?style=flat-square&logoColor=white)](LICENSE)
[![Node](https://img.shields.io/badge/Node-22+-339933?style=flat-square&logoColor=white)](https://nodejs.org)
[![npm](https://img.shields.io/npm/v/ariel-mermaid?style=flat-square&color=cb3837&logoColor=white)](https://www.npmjs.com/package/ariel-mermaid)
[![DeepWiki](https://img.shields.io/badge/DeepWiki-0088cc?style=flat-square&logoColor=white)](https://deepwiki.com/pavelsimo/ariel)

## Prerequisites

`ariel` is a TypeScript CLI for Node.js 22+. Static PNG rendering uses the same
SVG scene path as video rendering. Video export requires `ffmpeg` on `PATH`.

## Installation

### npx

```bash
npx ariel-mermaid --help
```

### npm

```bash
npm install -g ariel-mermaid
ariel --help
```

### Download binary

Release tarballs are available on the [Releases](https://github.com/pavelsimo/ariel/releases) page.

## Quick Start

Create a Mermaid file:

```bash
cat > flow.mmd <<'EOF'
flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Ship it]
    B -->|No| D[Debug]
    D --> B
EOF
```

Render it as an animated video:

```bash
ariel animate flow.mmd -o flow.mp4
```

Render the same diagram as a static PNG:

```bash
ariel render flow.mmd -o flow.png
```

The animated and static renderers share the same layout and geometry pipeline,
so arrows, shapes, labels, and themes should match between video and image
outputs.

## Examples

Render one of the bundled examples at HD quality:

```bash
ariel animate examples/flowchart_shapes.mmd -o /tmp/shapes.mp4 --quality h
```

Slow the animation down. `--speed` is a multiplier: values below `1.0` are
slower, values above `1.0` are faster. The default is `0.6666666666666666`.

```bash
ariel animate examples/sequence.mmd -o /tmp/sequence.mp4 --speed 0.5
```

Export a WebM or GIF instead of MP4:

```bash
ariel animate examples/state.mmd -o /tmp/state.webm --format webm
ariel animate examples/er.mmd -o /tmp/er.gif --format gif
```

Use a different theme or background:

```bash
ariel animate examples/class.mmd -o /tmp/class.mp4 --theme dark --background "#111827"
ariel render examples/class.mmd -o /tmp/class.png --theme neutral --background white
```

Read Mermaid source from stdin:

```bash
printf 'sequenceDiagram\nAlice->>Bob: hello\n' | ariel animate - -o /tmp/stdin.mp4
```

Inspect the parsed and laid-out diagram as JSON:

```bash
ariel parse examples/flowchart.mmd | jq '.nodes[] | {id, label, shape}'
```

Use global JSON output for script-friendly command results. Global flags go
before the subcommand:

```bash
ariel --json types
ariel --json animate examples/flowchart.mmd -o /tmp/flow.mp4
```

## Docs

Full documentation at **[pavelsimo.github.io/ariel](https://pavelsimo.github.io/ariel)**.

## License

MIT
