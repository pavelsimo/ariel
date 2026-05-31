# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- rewrite the CLI in TypeScript for npm/npx distribution
- replace the Manim/Graphviz renderer with a shared SVG frame renderer for PNG and video output
- move CI, release, linting, formatting, and tests to the Node.js toolchain

## [0.1.0] - 2026-05-31

### Added
- render animated Mermaid diagrams as videos and static PNGs from the CLI
- support flowchart, sequence, class, state, and ER diagrams
- add Excalidraw-style rendering with bundled handwriting font and theme assets
- configure animation speed with `ariel animate --speed`, with slower pacing as the default

### Changed
- publish the Python distribution as `ariel-mermaid` while keeping the `ariel` CLI command
- share rendered geometry between image and video output for consistent diagrams
- scale diagrams to fit the output frame automatically

### Fixed
- draw complete Graphviz spline edges in static and video renders
- keep video edge reveal connected to the final rendered edge shape
- align arrowheads with edge direction and rendered node boundaries
- render dashed lines and themed backgrounds consistently

[Unreleased]: https://github.com/pavelsimo/ariel/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/pavelsimo/ariel/releases/tag/v0.1.0
