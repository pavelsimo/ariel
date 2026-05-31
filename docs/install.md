---
title: Install
description: Install ariel on macOS, Linux, or Windows
---

## Prerequisites

`ariel` requires Node.js 22 or newer. Video export requires `ffmpeg` on `PATH`.
Static PNG rendering does not require `ffmpeg`.

## npx

```bash
npx ariel-mermaid --help
```

## npm

```bash
npm install -g ariel-mermaid
ariel --help
```

## From this repository

```bash
npm ci
npm run build
node dist/cli.js --help
```

## npm

Latest release: [npmjs.com/package/ariel-mermaid](https://www.npmjs.com/package/ariel-mermaid)

## Release Tarball

Download from [GitHub Releases](https://github.com/pavelsimo/ariel/releases).

## Verify

```bash
ariel version
```
