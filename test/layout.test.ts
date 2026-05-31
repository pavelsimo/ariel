import { describe, expect, it } from "vitest";

import { layoutGraph } from "../src/layout.js";
import { parseMermaid } from "../src/parser.js";

describe("layout", () => {
  it("lays out a top-down flowchart", () => {
    const placed = layoutGraph(
      parseMermaid("flowchart TD\nA[Start] --> B[End]"),
    );
    const positions = new Map(
      placed.placedNodes.map((node) => [node.node.id, node]),
    );

    expect(placed.placedNodes).toHaveLength(2);
    expect(placed.placedEdges).toHaveLength(1);
    expect(placed.width).toBeGreaterThan(0);
    expect(positions.get("A")?.y).toBeLessThan(positions.get("B")?.y ?? 0);
  });

  it("lays out a left-right flowchart", () => {
    const placed = layoutGraph(
      parseMermaid("flowchart LR\nA[Input] --> B[Output]"),
    );
    const positions = new Map(
      placed.placedNodes.map((node) => [node.node.id, node]),
    );

    expect(positions.get("A")?.x).toBeLessThan(positions.get("B")?.x ?? 0);
  });

  it("uses a bespoke sequence layout with lifelines", () => {
    const placed = layoutGraph(
      parseMermaid(`sequenceDiagram
      participant Alice
      participant Bob
      Alice->>Bob: hello
    `),
    );

    expect(placed.graph.type).toBe("sequence");
    expect(placed.placedNodes).toHaveLength(2);
    expect(placed.placedEdges).toHaveLength(3);
  });
});
