# Renderer Recommendation

## Summary

`ariel` should evaluate replacing Manim as the long-term animation backend.

Manim is excellent for precise mathematical and explanatory animations, but
`ariel` is a diagram animation tool. The project needs predictable rendering of
boxes, labels, paths, arrowheads, themes, and layout-derived geometry across
both static images and videos. The current implementation is already working
around Manim's model by manually constructing nodes, edges, arrowheads, labels,
static frames, and reveal animations.

The best next step is to prototype a Motion Canvas backend behind a renderer
abstraction, while keeping the current parser, layout, and theme model.

## Implementation Update

The TypeScript rewrite chose the controlled SVG frame-rendering path first:

```text
Mermaid text
  -> TypeScript parser
  -> dagre / sequence layout
  -> renderer-neutral scene model
  -> SVG frame renderer
       -> Sharp PNG output
       -> FFmpeg video output
```

This is the "SVG + frame capture + FFmpeg" recommendation adapted to avoid a
browser dependency in the first rewrite. It keeps the most important invariant:
static images and video frames are rendered from the same scene model and SVG
geometry.

## Previous Python Situation

The previous Python pipeline was:

```text
Mermaid text
  -> ariel parser
  -> ariel layout
  -> Manim mobjects
  -> PNG / MP4 / WebM / GIF
```

This has produced several classes of bugs that are specific to the rendering
layer:

- video output and static image output can diverge
- edge reveals can disagree with final edge geometry
- arrowheads require low-level correction
- node contact points require custom geometry logic
- label, path, and scaling behavior require manual tuning

The right architectural goal is a renderer-neutral scene representation:

```text
Mermaid text
  -> ariel parser
  -> ariel layout
  -> renderer-neutral scene JSON
  -> backend renderer
       -> static image
       -> video
```

That way the same scene geometry drives every output format.

## Recommended Backend: Motion Canvas

Motion Canvas is the strongest fit for `ariel`.

It is a TypeScript, Canvas-based animation system designed for code-authored
animated videos. Its model maps well to diagram animation:

- timeline and generator-based animation flow
- easing and tweening primitives
- canvas-native 2D rendering
- path and spline support
- curve trimming via start/end values for path reveal effects
- frame rate and resolution controls
- image sequence and FFmpeg video export
- snapshot support for still images
- browser/editor preview during development

This is a closer match to `ariel` than Manim because diagrams are primarily
2D motion graphics, not mathematical scenes.

Useful references:

- Motion Canvas rendering docs source: https://github.com/motion-canvas/motion-canvas/blob/main/packages/docs/docs/getting-started/rendering/index.mdx
- Motion Canvas FFmpeg exporter docs source: https://github.com/motion-canvas/motion-canvas/blob/main/packages/docs/docs/getting-started/rendering/video.mdx
- Motion Canvas tweening docs source: https://github.com/motion-canvas/motion-canvas/blob/main/packages/docs/docs/getting-started/tweening.mdx
- Motion Canvas path docs source: https://github.com/motion-canvas/motion-canvas/blob/main/packages/docs/docs/components/path.mdx
- Motion Canvas spline docs source: https://github.com/motion-canvas/motion-canvas/blob/main/packages/docs/docs/components/spline.mdx
- Motion Canvas line component source: https://github.com/motion-canvas/motion-canvas/blob/main/packages/2d/src/lib/components/Line.ts

## Strong Alternative: SVG + Playwright + FFmpeg

A custom SVG renderer with Playwright frame capture and FFmpeg encoding is also
a strong option.

The pipeline would be:

```text
renderer-neutral scene JSON
  -> SVG at time t
  -> Playwright screenshots
  -> FFmpeg encode
```

Advantages:

- maximum control over geometry and animation semantics
- excellent image/video parity because both come from the same SVG-at-time
  function
- no heavy animation framework assumptions
- easy inspection and debugging of intermediate SVG
- direct compatibility with browser text, SVG paths, masks, and CSS

Costs:

- `ariel` would own the timeline engine
- `ariel` would own easing, sequencing, and path reveal behavior
- frame capture and encoding must be implemented and tested carefully
- browser font rendering must be made deterministic enough for tests

Useful references:

- Playwright screenshots: https://playwright.dev/docs/screenshots
- FFmpeg documentation: https://www.ffmpeg.org/documentation.html

This is probably the best choice if the project values full control more than
borrowing a motion design framework.

## Possible Shortcut: Mermaid SVG + Animation Layer

Another option is to use Mermaid's own renderer to produce SVG, then animate
the generated SVG.

Advantages:

- broad Mermaid diagram support comes from Mermaid itself
- less parser and layout work inside `ariel`
- static SVG/PNG support becomes easier

Costs:

- semantic animation is harder because generated SVG structure is an output
  artifact, not a stable scene graph API
- custom themes and Excalidraw-style rendering become harder to control
- changes in Mermaid's generated SVG can break animations
- contact-point and reveal behavior may be difficult to customize cleanly

Useful references:

- Mermaid API usage: https://mermaid.js.org/config/usage.html
- Mermaid CLI: https://github.com/mermaid-js/mermaid-cli

This is attractive for format coverage, but weaker for custom animation quality.

## Less Ideal: Remotion

Remotion is strong for programmatic videos and browser-based rendering, but it
is not the best default dependency for this project.

Advantages:

- mature video rendering pipeline
- React component model
- still image and video rendering support
- many media-oriented packages

Concerns:

- heavier React/browser project model than `ariel` needs
- animation primitives are not as diagram-specific as Motion Canvas
- licensing is awkward for a general open-source CLI: Remotion is free for
  individuals, nonprofits, small for-profit organizations up to 3 employees,
  and evaluation, but larger for-profit organizations need a company license

Useful references:

- Remotion rendering: https://www.remotion.dev/docs/render
- Remotion CLI render: https://www.remotion.dev/docs/cli/render
- Remotion license: https://www.remotion.dev/docs/license

## Why Manim Was Replaced

Manim was useful for the initial implementation and helped prove the CLI shape,
but it is no longer part of the TypeScript rewrite.

Reasons it was useful initially:

- Python-only packaging is simpler
- Manim already handles video encoding and still frames

Reasons it should not remain the long-term backend:

- its design center is mathematical animation
- diagram animation requires too much manual geometry correction
- image/video parity is easy to accidentally break
- polished motion graphics require fighting the abstraction

## Recommended Migration Plan

1. Add a renderer backend boundary.

   ```python
   renderGraph(..., backend="svg")
   ```

   Keep the backend boundary explicit so Motion Canvas or a browser renderer can
   be evaluated later.

2. Introduce a renderer-neutral scene model.

   The scene model should contain only stable drawing and timing data:

   - canvas size
   - background
   - nodes with shape, position, size, label, style
   - edges with points, arrow type, label, style
   - animation timeline steps
   - output settings

3. Make static and animated rendering consume the same scene model.

   This is the critical part. Static output should be "render scene at final
   time", not a separate path that rebuilds geometry differently.

4. Prototype Motion Canvas using one hard example.

   Use `examples/flowchart_shapes.mmd` first because it exercises:

   - many node shapes
   - arrow contact points
   - arrowhead orientation
   - edge reveal behavior
   - label placement
   - static/video parity

5. Compare outputs against previous Manim artifacts.

   Generate:

   - final PNG
   - MP4 at HD quality
   - at least one slow animation variant

   Compare by visual inspection first, then add focused regression checks for
   geometry where possible.

6. Decide backend direction.

   If Motion Canvas produces better animation quality and acceptable packaging
   complexity, make it the preferred backend. If packaging or runtime complexity
   is too high, evaluate the SVG + Playwright + FFmpeg path.

## Proposed Target Architecture

```text
ariel/
  parser/                 Mermaid parsing
  layout/                 Graph layout
  scene_model.py           renderer-neutral scene data
  render/
    __init__.py            backend selection
    svg.ts                 current SVG frame renderer
    motion-canvas.ts       possible future prototype backend
```

The important boundary is that `geometry.py` should stop being Manim-specific.
It should produce renderer-neutral geometry, and each backend should translate
that geometry into its own primitives.

## Recommendation

Prototype Motion Canvas first.

It is the best fit for `ariel`'s actual job: polished, code-generated 2D diagram
animations with reliable static/video parity. The current TypeScript rewrite
uses the SVG frame-rendering path first, and `examples/flowchart_shapes.mmd`
remains the first acceptance test for any future backend.
