import { describe, expect, it } from "vitest";

import { detectType, parseMermaid } from "../src/parser.js";

describe("parser", () => {
  it.each([
    ["flowchart TD\nA --> B", "flowchart"],
    ["graph LR\nA --> B", "flowchart"],
    ["sequenceDiagram\nA->>B: hi", "sequence"],
    ["classDiagram\nclass A", "class"],
    ["stateDiagram-v2\n[*] --> A", "state"],
    ["erDiagram\nA ||--o{ B : msg", "er"],
    ["", "unknown"],
  ])("detects %s", (source, expected) => {
    expect(detectType(source)).toBe(expected);
  });

  it("parses flowchart shapes without later implicit references overwriting them", () => {
    const graph = parseMermaid(`flowchart TD
      A[Rectangle] --> B(Rounded)
      B --> C{Diamond}
      C --> D((Circle))
      C --> E([Stadium])
      C --> F[[Subroutine]]
      C --> G[(Cylinder)]
      C --> H>Asymmetric]
      C --> I{{Hexagon}}
    `);

    expect(graph.nodes.get("B")?.shape).toBe("rounded");
    expect(graph.nodes.get("C")?.shape).toBe("diamond");
    expect(graph.nodes.get("D")?.shape).toBe("circle");
    expect(graph.nodes.get("E")?.shape).toBe("stadium");
    expect(graph.nodes.get("F")?.shape).toBe("subroutine");
    expect(graph.nodes.get("G")?.shape).toBe("cylinder");
    expect(graph.nodes.get("H")?.shape).toBe("asymmetric");
    expect(graph.nodes.get("I")?.shape).toBe("hexagon");
  });

  it("parses edge labels, dotted edges, thick edges, and chains", () => {
    const graph = parseMermaid(`flowchart LR
      A -->|Yes| B -.-> C ==> D
    `);

    expect(graph.direction).toBe("LR");
    expect(graph.edges).toHaveLength(3);
    expect(graph.edges[0]).toMatchObject({
      src: "A",
      dst: "B",
      label: "Yes",
      kind: "normal",
    });
    expect(graph.edges[1]).toMatchObject({
      src: "B",
      dst: "C",
      kind: "dotted",
    });
    expect(graph.edges[2]).toMatchObject({ src: "C", dst: "D", kind: "thick" });
  });

  it("parses class members and relationships", () => {
    const graph = parseMermaid(`classDiagram
      class BankAccount
      BankAccount : +String owner
      BankAccount : +deposit(amount)
      Customer "1" --> "*" BankAccount : owns
      Customer *-- Address : composition
    `);

    expect(graph.type).toBe("class");
    expect(graph.nodes.get("BankAccount")?.label).toContain("+String owner");
    expect(graph.edges).toHaveLength(2);
    expect(graph.edges[1]?.arrow).toBe("composition");
  });

  it("parses er entity fields", () => {
    const graph = parseMermaid(`erDiagram
      CUSTOMER ||--o{ ORDER : places
      CUSTOMER {
        string name
      }
    `);

    expect(graph.type).toBe("er");
    expect(graph.nodes.get("CUSTOMER")?.label).toContain("string name");
    expect(graph.edges[0]?.label).toBe("places");
  });
});
