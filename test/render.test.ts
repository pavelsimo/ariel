import { existsSync, statSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

import { describe, expect, it } from "vitest";

import { defaultFps, defaultSpeed } from "../src/config.js";
import { layoutGraph } from "../src/layout.js";
import { parseMermaid } from "../src/parser.js";
import { renderGraph } from "../src/render/index.js";
import { buildScene } from "../src/scene.js";
import { getTheme } from "../src/theme.js";

const sample = `flowchart TD
  A[Start] --> B{Decision}
  B -->|Yes| C[Ship it]
  B -->|No| D[Debug]
`;

describe("renderer", () => {
  it("renders a png from the shared scene path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ariel-test-"));
    const output = join(dir, "diagram.png");
    const placed = layoutGraph(parseMermaid(sample));
    await renderGraph(placed, getTheme("excalidraw"), {
      output,
      format: "png",
      quality: "l",
      fps: defaultFps,
      speed: defaultSpeed,
      staticFrame: true,
    });

    expect(existsSync(output)).toBe(true);
    expect(statSync(output).size).toBeGreaterThan(1000);
  });

  it("snaps edges to diamond boundaries in the scene model", () => {
    const placed = layoutGraph(
      parseMermaid(`flowchart TD
        A{Decision} --> B[Done]
      `),
    );
    const scene = buildScene(placed, getTheme("excalidraw"), {
      width: 1280,
      height: 720,
    });
    const diamond = scene.nodes.find((node) => node.id === "A");
    const edge = scene.edges.find(
      (item) => item.src === "A" && item.dst === "B",
    );
    expect(diamond).toBeDefined();
    expect(edge).toBeDefined();

    const start = edge?.points[0];
    expect(start).toBeDefined();
    if (!diamond || !start) return;
    const dx = Math.abs(start.x - diamond.x) / (diamond.width / 2);
    const dy = Math.abs(start.y - diamond.y) / (diamond.height / 2);
    expect(dx + dy).toBeCloseTo(1, 1);
  });

  it.skipIf(!hasCommand("ffmpeg"))(
    "renders an mp4 animation from the shared scene path",
    async () => {
      const dir = await mkdtemp(join(tmpdir(), "ariel-test-"));
      const output = join(dir, "diagram.mp4");
      const placed = layoutGraph(parseMermaid(sample));
      await renderGraph(placed, getTheme("excalidraw"), {
        output,
        format: "mp4",
        quality: "l",
        fps: 10,
        speed: 1.5,
      });

      expect(existsSync(output)).toBe(true);
      expect(statSync(output).size).toBeGreaterThan(1000);
    },
  );
});

function hasCommand(command: string): boolean {
  try {
    execFileSync(command, ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}
