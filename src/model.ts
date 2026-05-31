export type DiagramType = "flowchart" | "sequence" | "class" | "state" | "er";

export type ShapeKind =
  | "rectangle"
  | "rounded"
  | "stadium"
  | "diamond"
  | "hexagon"
  | "circle"
  | "double-circle"
  | "subroutine"
  | "cylinder"
  | "asymmetric"
  | "trapezoid"
  | "trapezoid-alt";

export type EdgeKind = "normal" | "thick" | "dotted";

export type ArrowKind =
  | "arrow"
  | "open"
  | "circle-end"
  | "cross"
  | "inheritance"
  | "composition"
  | "aggregation";

export type Direction = "TD" | "TB" | "BT" | "LR" | "RL";

export interface NodeModel {
  id: string;
  label: string;
  shape: ShapeKind;
}

export interface EdgeModel {
  src: string;
  dst: string;
  label: string;
  kind: EdgeKind;
  arrow: ArrowKind;
}

export interface SubgraphModel {
  id: string;
  label: string;
  nodeIds: string[];
}

export interface GraphModel {
  type: DiagramType;
  direction: Direction;
  nodes: Map<string, NodeModel>;
  edges: EdgeModel[];
  subgraphs: SubgraphModel[];
}

export interface PlacedNode {
  node: NodeModel;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PlacedEdge {
  edge: EdgeModel;
  points: Point[];
}

export interface PlacedGraph {
  graph: GraphModel;
  placedNodes: PlacedNode[];
  placedEdges: PlacedEdge[];
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export function createGraph(
  type: DiagramType = "flowchart",
  direction: Direction = "TD",
): GraphModel {
  return {
    type,
    direction,
    nodes: new Map(),
    edges: [],
    subgraphs: [],
  };
}

export function ensureNode(
  graph: GraphModel,
  id: string,
  label = id,
  shape: ShapeKind = "rectangle",
): NodeModel {
  const existing = graph.nodes.get(id);
  if (existing) {
    const explicit = label !== id || shape !== "rectangle";
    if (explicit && (label !== id || existing.label === existing.id)) {
      existing.label = label;
    }
    if (explicit) {
      existing.shape = shape;
    }
    return existing;
  }

  const node: NodeModel = { id, label: label || id, shape };
  graph.nodes.set(id, node);
  return node;
}

export function addEdge(
  graph: GraphModel,
  src: string,
  dst: string,
  label = "",
  kind: EdgeKind = "normal",
  arrow: ArrowKind = "arrow",
): EdgeModel {
  ensureNode(graph, src);
  ensureNode(graph, dst);
  const edge: EdgeModel = { src, dst, label, kind, arrow };
  graph.edges.push(edge);
  return edge;
}

export function graphToJson(placed: PlacedGraph): object {
  return {
    type: placed.graph.type,
    direction: placed.graph.direction,
    width: placed.width,
    height: placed.height,
    nodes: placed.placedNodes.map((pn) => ({
      id: pn.node.id,
      label: pn.node.label,
      shape: pn.node.shape,
      x: pn.x,
      y: pn.y,
      width: pn.width,
      height: pn.height,
    })),
    edges: placed.placedEdges.map((pe) => ({
      src: pe.edge.src,
      dst: pe.edge.dst,
      label: pe.edge.label,
      kind: pe.edge.kind,
      arrow: pe.edge.arrow,
      points: pe.points,
    })),
  };
}
