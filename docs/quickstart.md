---
title: Quick Start
description: Get productive with ariel in 60 seconds
---

## Show help

```bash
ariel --help
```

## Check version

```bash
ariel version
```

## JSON output

Every command supports `--json` for scripting:

```bash
ariel --json <subcommand> | jq '.'
```

## Dry run

Preview changes before applying them:

```bash
ariel --dry-run <subcommand>
```

## Render a video

```bash
ariel animate examples/flowchart.mmd -o /tmp/flow.mp4
```

## Render a PNG

```bash
ariel render examples/flowchart.mmd -o /tmp/flow.png
```
