import dagre, {
  type EdgeLabel,
  type Graph,
  type GraphLabel,
  type NodeLabel,
} from "@dagrejs/dagre";

import {
  type Direction,
  type GraphModel,
  type PlacedEdge,
  type PlacedGraph,
  type PlacedNode,
  type Point,
} from "./model.js";

const actorWidth = 120;
const actorHeight = 46;
const actorSpacing = 190;
const messageSpacing = 70;
const margin = 80;

export function layoutGraph(graph: GraphModel): PlacedGraph {
  if (graph.type === "sequence") {
    return layoutSequence(graph);
  }
  return layoutDagre(graph);
}

function layoutDagre(graph: GraphModel): PlacedGraph {
  const g: Graph<GraphLabel, NodeLabel, EdgeLabel> = new dagre.graphlib.Graph({
    directed: true,
    multigraph: true,
    compound: false,
  });
  g.setGraph({
    rankdir: rankDir(graph.direction),
    nodesep: 55,
    ranksep: 80,
    edgesep: 24,
    marginx: 30,
    marginy: 30,
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes.values()) {
    const size = estimateNodeSize(node.label, node.shape);
    g.setNode(node.id, { width: size.width, height: size.height });
  }

  graph.edges.forEach((edge, index) => {
    g.setEdge(
      edge.src,
      edge.dst,
      {
        label: edge.label,
        width: edge.label ? estimateTextWidth(edge.label, 12) : 0,
        height: 18,
      },
      String(index),
    );
  });

  dagre.layout(g);

  const placedNodes: PlacedNode[] = [];
  for (const node of graph.nodes.values()) {
    const pos = g.node(node.id) as
      | { x: number; y: number; width: number; height: number }
      | undefined;
    const fallback = estimateNodeSize(node.label, node.shape);
    placedNodes.push({
      node,
      x: pos?.x ?? 0,
      y: pos?.y ?? 0,
      width: pos?.width ?? fallback.width,
      height: pos?.height ?? fallback.height,
    });
  }

  const placedEdges: PlacedEdge[] = graph.edges.map((edge, index) => {
    const value = g.edge(edge.src, edge.dst, String(index)) as
      | { points?: Point[] }
      | undefined;
    return {
      edge,
      points:
        value?.points?.map((point) => ({ x: point.x, y: point.y })) ??
        fallbackEdge(edge, placedNodes),
    };
  });

  const graphInfo = g.graph() as { width?: number; height?: number };
  const bounds = graphBounds(placedNodes, placedEdges);
  return {
    graph,
    placedNodes,
    placedEdges,
    width: graphInfo.width ?? bounds.width,
    height: graphInfo.height ?? bounds.height,
  };
}

function layoutSequence(graph: GraphModel): PlacedGraph {
  const actors = [...graph.nodes.values()];
  const messages = graph.edges;
  const width = Math.max(1, actors.length) * actorSpacing + margin * 2;
  const height = messages.length * messageSpacing + actorHeight + margin * 2;
  const actorY = margin + actorHeight / 2;
  const bottomY = height - margin;
  const actorXs = new Map<string, number>();
  const placedNodes: PlacedNode[] = [];
  const placedEdges: PlacedEdge[] = [];

  actors.forEach((actor, index) => {
    const x = margin + actorWidth / 2 + index * actorSpacing;
    actorXs.set(actor.id, x);
    placedNodes.push({
      node: actor,
      x,
      y: actorY,
      width: actorWidth,
      height: actorHeight,
    });
    placedEdges.push({
      edge: {
        src: actor.id,
        dst: actor.id,
        label: "",
        kind: "dotted",
        arrow: "open",
      },
      points: [
        { x, y: actorY + actorHeight / 2 },
        { x, y: bottomY },
      ],
    });
  });

  messages.forEach((message, index) => {
    const y = actorY + actorHeight / 2 + messageSpacing * (index + 1);
    placedEdges.push({
      edge: message,
      points: [
        { x: actorXs.get(message.src) ?? margin, y },
        { x: actorXs.get(message.dst) ?? margin, y },
      ],
    });
  });

  return { graph, placedNodes, placedEdges, width, height };
}

function rankDir(direction: Direction): "TB" | "BT" | "LR" | "RL" {
  if (direction === "TD") return "TB";
  return direction;
}

function estimateNodeSize(
  label: string,
  shape: string,
): { width: number; height: number } {
  const lines = label.split("\n");
  const width =
    Math.max(...lines.map((line) => estimateTextWidth(line, 16))) + 46;
  const height = lines.length * 24 + 28;

  if (shape === "circle" || shape === "double-circle") {
    const size = Math.max(width, height, 92);
    return { width: size, height: size };
  }
  if (shape === "diamond" || shape === "hexagon") {
    return {
      width: Math.max(width + 46, 120),
      height: Math.max(height + 28, 74),
    };
  }
  if (shape === "stadium") {
    return { width: Math.max(width, 118), height: Math.max(height, 54) };
  }
  return { width: Math.max(width, 98), height: Math.max(height, 54) };
}

function estimateTextWidth(text: string, fontSize: number): number {
  return Math.max(text.length * fontSize * 0.56, 20);
}

function fallbackEdge(
  edge: { src: string; dst: string },
  nodes: PlacedNode[],
): Point[] {
  const src = nodes.find((node) => node.node.id === edge.src);
  const dst = nodes.find((node) => node.node.id === edge.dst);
  if (!src || !dst) return [];
  return [
    { x: src.x, y: src.y },
    { x: dst.x, y: dst.y },
  ];
}

function graphBounds(
  nodes: PlacedNode[],
  edges: PlacedEdge[],
): { width: number; height: number } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const node of nodes) {
    xs.push(node.x - node.width / 2, node.x + node.width / 2);
    ys.push(node.y - node.height / 2, node.y + node.height / 2);
  }
  for (const edge of edges) {
    for (const point of edge.points) {
      xs.push(point.x);
      ys.push(point.y);
    }
  }
  if (xs.length === 0 || ys.length === 0) return { width: 100, height: 100 };
  return {
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}
