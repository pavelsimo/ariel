import {
  type ArrowKind,
  type DiagramType,
  type Direction,
  type EdgeKind,
  type GraphModel,
  type ShapeKind,
  addEdge,
  createGraph,
  ensureNode,
} from "./model.js";

const idPattern = "[A-Za-z0-9_.$:-]+|\\[\\*\\]";
const edgePattern = /(.+?)\s*(-->|---|-.->|==>)\s*(.+)/;

export function detectType(text: string): DiagramType | "unknown" {
  const first = firstMeaningfulLine(text);
  if (!first) return "unknown";
  if (/^(flowchart|graph)\b/.test(first)) return "flowchart";
  if (/^sequenceDiagram\b/.test(first)) return "sequence";
  if (/^classDiagram\b/.test(first)) return "class";
  if (/^stateDiagram(?:-v2)?\b/.test(first)) return "state";
  if (/^erDiagram\b/.test(first)) return "er";
  return "unknown";
}

export function parseMermaid(text: string, diagramType = "auto"): GraphModel {
  const type = diagramType === "auto" ? detectType(text) : diagramType;
  switch (type) {
    case "flowchart":
      return parseFlowchart(text);
    case "sequence":
      return parseSequence(text);
    case "class":
      return parseClass(text);
    case "state":
      return parseState(text);
    case "er":
      return parseEr(text);
    default:
      throw new Error(`unsupported diagram type: ${type}`);
  }
}

function firstMeaningfulLine(text: string): string {
  return (
    lines(text).find((line) => line.length > 0 && !line.startsWith("%%")) ?? ""
  );
}

function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function stripComment(line: string): string {
  const commentIndex = line.indexOf("%%");
  return (commentIndex >= 0 ? line.slice(0, commentIndex) : line).trim();
}

function parseDirection(value: string | undefined): Direction {
  if (value === "TB" || value === "BT" || value === "LR" || value === "RL")
    return value;
  return "TD";
}

function parseFlowchart(text: string): GraphModel {
  const sourceLines = lines(text).map(stripComment).filter(Boolean);
  const header = sourceLines.shift() ?? "flowchart TD";
  const direction = parseDirection(header.split(/\s+/)[1]);
  const graph = createGraph("flowchart", direction);
  const subgraphStack: string[] = [];

  for (const line of sourceLines) {
    if (/^subgraph\b/i.test(line)) {
      const match = /^subgraph\s+([^\s[]+)(?:\s+\[?(.+?)\]?)?$/.exec(line);
      if (match?.[1]) {
        graph.subgraphs.push({
          id: match[1],
          label: match[2] ?? match[1],
          nodeIds: [],
        });
        subgraphStack.push(match[1]);
      }
      continue;
    }
    if (line === "end") {
      subgraphStack.pop();
      continue;
    }

    if (edgePattern.test(line)) {
      parseFlowEdgeChain(graph, line);
    } else {
      const node = parseNodeExpression(line);
      ensureNode(graph, node.id, node.label, node.shape);
    }
  }

  return graph;
}

function parseFlowEdgeChain(graph: GraphModel, line: string): void {
  let rest = line;
  let left: string | undefined;

  while (true) {
    const match = edgePattern.exec(rest);
    if (!match?.[1] || !match[2] || !match[3]) break;

    left = left ?? match[1].trim();
    const arrowText = match[2];
    let right = match[3].trim();
    let label = "";
    const labelMatch = /^\|([^|]+)\|\s*(.+)$/.exec(right);
    if (labelMatch?.[1] && labelMatch[2]) {
      label = labelMatch[1].trim();
      right = labelMatch[2].trim();
    }

    const nextMatch = edgePattern.exec(right);
    const targetText = nextMatch?.[1]?.trim() ?? right;
    const src = parseNodeExpression(left);
    const dst = parseNodeExpression(targetText);
    ensureNode(graph, src.id, src.label, src.shape);
    ensureNode(graph, dst.id, dst.label, dst.shape);
    addEdge(
      graph,
      src.id,
      dst.id,
      label,
      edgeKind(arrowText),
      arrowText === "---" ? "open" : "arrow",
    );

    if (!nextMatch) break;
    left = targetText;
    rest = right;
  }
}

function parseNodeExpression(raw: string): {
  id: string;
  label: string;
  shape: ShapeKind;
} {
  const text = raw.trim();
  const patterns: Array<[RegExp, ShapeKind]> = [
    [new RegExp(`^(${idPattern})\\[\\[([^\\]]+)\\]\\]$`), "subroutine"],
    [new RegExp(`^(${idPattern})\\{\\{(.+)\\}\\}$`), "hexagon"],
    [new RegExp(`^(${idPattern})\\(\\((.+)\\)\\)$`), "circle"],
    [new RegExp(`^(${idPattern})\\(\\[([^\\]]+)\\]\\)$`), "stadium"],
    [new RegExp(`^(${idPattern})\\[\\(([^)]+)\\)\\]$`), "cylinder"],
    [new RegExp(`^(${idPattern})\\[([^\\]]+)\\]$`), "rectangle"],
    [new RegExp(`^(${idPattern})\\(([^)]+)\\)$`), "rounded"],
    [new RegExp(`^(${idPattern})\\{(.+)\\}$`), "diamond"],
    [new RegExp(`^(${idPattern})>(.+)\\]$`), "asymmetric"],
  ];

  for (const [pattern, shape] of patterns) {
    const match = pattern.exec(text);
    if (match?.[1] && match[2]) {
      return { id: match[1], label: match[2].trim(), shape };
    }
  }

  return {
    id: text,
    label: text,
    shape: text === "[*]" ? "double-circle" : "rectangle",
  };
}

function edgeKind(arrowText: string): EdgeKind {
  if (arrowText.includes(".")) return "dotted";
  if (arrowText.includes("=")) return "thick";
  return "normal";
}

function parseSequence(text: string): GraphModel {
  const graph = createGraph("sequence", "LR");
  for (const line of lines(text).slice(1).map(stripComment).filter(Boolean)) {
    const participant = /^participant\s+(.+)$/.exec(line);
    if (participant?.[1]) {
      const id = participant[1].trim();
      ensureNode(graph, id, id, "rectangle");
      continue;
    }

    const message = /^(.+?)\s*([-.]?-{1,2}>>?)\s*(.+?)\s*:\s*(.+)$/.exec(line);
    if (message?.[1] && message[3] && message[4]) {
      const src = message[1].trim();
      const dst = message[3].trim();
      ensureNode(graph, src, src, "rectangle");
      ensureNode(graph, dst, dst, "rectangle");
      addEdge(
        graph,
        src,
        dst,
        message[4].trim(),
        message[2]?.startsWith("--") ? "dotted" : "normal",
        "arrow",
      );
    }
  }
  return graph;
}

function parseClass(text: string): GraphModel {
  const graph = createGraph("class", "LR");
  for (const line of lines(text).slice(1).map(stripComment).filter(Boolean)) {
    const classDecl = /^class\s+(.+)$/.exec(line);
    if (classDecl?.[1]) {
      ensureNode(graph, classDecl[1].trim(), classDecl[1].trim(), "rectangle");
      continue;
    }

    const member = /^([A-Za-z0-9_.$:-]+)\s*:\s*(.+)$/.exec(line);
    if (member?.[1] && member[2]) {
      const node = ensureNode(graph, member[1], member[1], "rectangle");
      node.label =
        node.label === node.id
          ? `${node.id}\n${member[2]}`
          : `${node.label}\n${member[2]}`;
      continue;
    }

    const relation =
      /^([A-Za-z0-9_.$:-]+)(?:\s+"[^"]+")?\s+(\S*--\S*)\s+(?:"[^"]+"\s+)?([A-Za-z0-9_.$:-]+)(?:\s*:\s*(.+))?$/.exec(
        line,
      );
    if (relation?.[1] && relation[2] && relation[3]) {
      ensureNode(graph, relation[1], relation[1], "rectangle");
      ensureNode(graph, relation[3], relation[3], "rectangle");
      addEdge(
        graph,
        relation[1],
        relation[3],
        relation[4]?.trim() ?? "",
        "normal",
        classArrow(relation[2]),
      );
    }
  }
  return graph;
}

function classArrow(text: string): ArrowKind {
  if (text.includes("<|") || text.includes("|>")) return "inheritance";
  if (text.includes("*")) return "composition";
  if (text.includes("o")) return "aggregation";
  return "arrow";
}

function parseState(text: string): GraphModel {
  const graph = createGraph("state", "TD");
  for (const line of lines(text).slice(1).map(stripComment).filter(Boolean)) {
    const transition = /^(.+?)\s*-->\s*(.+?)(?:\s*:\s*(.+))?$/.exec(line);
    if (transition?.[1] && transition[2]) {
      const src = transition[1].trim();
      const dst = transition[2].trim();
      ensureNode(graph, src, src, src === "[*]" ? "double-circle" : "rounded");
      ensureNode(graph, dst, dst, dst === "[*]" ? "double-circle" : "rounded");
      addEdge(graph, src, dst, transition[3]?.trim() ?? "", "normal", "arrow");
    }
  }
  return graph;
}

function parseEr(text: string): GraphModel {
  const graph = createGraph("er", "LR");
  let currentEntity: string | undefined;

  for (const line of lines(text).slice(1).map(stripComment).filter(Boolean)) {
    if (line === "}") {
      currentEntity = undefined;
      continue;
    }

    const block = /^([A-Za-z0-9_.$:-]+)\s+\{$/.exec(line);
    if (block?.[1]) {
      currentEntity = block[1];
      ensureNode(graph, currentEntity, currentEntity, "rectangle");
      continue;
    }

    if (currentEntity) {
      const node = ensureNode(graph, currentEntity, currentEntity, "rectangle");
      node.label =
        node.label === node.id
          ? `${node.id}\n${line}`
          : `${node.label}\n${line}`;
      continue;
    }

    const relation =
      /^([A-Za-z0-9_.$:-]+)\s+\S+--\S+\s+([A-Za-z0-9_.$:-]+)(?:\s*:\s*(.+))?$/.exec(
        line,
      );
    if (relation?.[1] && relation[2]) {
      ensureNode(graph, relation[1], relation[1], "rectangle");
      ensureNode(graph, relation[2], relation[2], "rectangle");
      addEdge(
        graph,
        relation[1],
        relation[2],
        relation[3]?.trim() ?? "",
        "normal",
        "arrow",
      );
    }
  }
  return graph;
}
