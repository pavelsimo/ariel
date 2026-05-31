import type { PlacedGraph, Point } from "./model.js";
import type { Theme } from "./theme.js";

export interface SceneSize {
  width: number;
  height: number;
}

export interface SceneNode {
  id: string;
  label: string;
  shape: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SceneEdge {
  src: string;
  dst: string;
  label: string;
  kind: string;
  arrow: string;
  points: Point[];
}

export interface SceneModel {
  type: string;
  width: number;
  height: number;
  background: string;
  theme: Theme;
  nodes: SceneNode[];
  edges: SceneEdge[];
}

export function buildScene(
  placed: PlacedGraph,
  theme: Theme,
  size: SceneSize,
  background = theme.background,
): SceneModel {
  const bounds = boundsForPlacedGraph(placed);
  const padding = Math.min(size.width, size.height) * 0.075;
  const scale = Math.min(
    (size.width - padding * 2) / bounds.width,
    (size.height - padding * 2) / bounds.height,
  );

  const tx = (point: Point): Point => ({
    x: padding + (point.x - bounds.minX) * scale,
    y: padding + (point.y - bounds.minY) * scale,
  });

  const nodes = placed.placedNodes.map((node) => ({
    id: node.node.id,
    label: node.node.label,
    shape: node.node.shape,
    x: tx(node).x,
    y: tx(node).y,
    width: node.width * scale,
    height: node.height * scale,
  }));
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  const edges = placed.placedEdges.map((edge) => {
    const points = edge.points.map(tx);
    const src = nodesById.get(edge.edge.src);
    const dst = nodesById.get(edge.edge.dst);
    const adjusted =
      placed.graph.type === "sequence" || edge.edge.src === edge.edge.dst
        ? points
        : snapEdgeToNodes(points, src, dst);
    return {
      src: edge.edge.src,
      dst: edge.edge.dst,
      label: edge.edge.label,
      kind: edge.edge.kind,
      arrow: edge.edge.arrow,
      points: adjusted,
    };
  });

  return {
    type: placed.graph.type,
    width: size.width,
    height: size.height,
    background,
    theme,
    nodes,
    edges,
  };
}

function boundsForPlacedGraph(placed: PlacedGraph): {
  minX: number;
  minY: number;
  width: number;
  height: number;
} {
  const xs: number[] = [];
  const ys: number[] = [];

  for (const node of placed.placedNodes) {
    xs.push(node.x - node.width / 2, node.x + node.width / 2);
    ys.push(node.y - node.height / 2, node.y + node.height / 2);
  }
  for (const edge of placed.placedEdges) {
    for (const point of edge.points) {
      xs.push(point.x);
      ys.push(point.y);
    }
  }

  if (xs.length === 0 || ys.length === 0) {
    return { minX: 0, minY: 0, width: 100, height: 100 };
  }

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  };
}

function snapEdgeToNodes(
  points: Point[],
  src?: SceneNode,
  dst?: SceneNode,
): Point[] {
  if (points.length < 2) return points;
  const result = [...points];
  if (src) {
    const next = result[1];
    if (next) {
      result[0] = boundaryPoint(src, next);
    }
  }
  if (dst) {
    const previous = result[result.length - 2];
    if (previous) {
      result[result.length - 1] = boundaryPoint(dst, previous);
    }
  }
  return result;
}

function boundaryPoint(node: SceneNode, toward: Point): Point {
  const dx = toward.x - node.x;
  const dy = toward.y - node.y;
  if (dx === 0 && dy === 0) return { x: node.x, y: node.y };

  if (
    node.shape === "diamond" ||
    node.shape === "hexagon" ||
    node.shape === "asymmetric"
  ) {
    return polygonBoundaryPoint(node, toward);
  }

  if (
    node.shape === "circle" ||
    node.shape === "double-circle" ||
    node.shape === "cylinder"
  ) {
    const rx = node.width / 2;
    const ry = node.height / 2;
    const factor = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    return { x: node.x + dx * factor, y: node.y + dy * factor };
  }

  const hw = node.width / 2;
  const hh = node.height / 2;
  const scale = 1 / Math.max(Math.abs(dx) / hw, Math.abs(dy) / hh);
  return { x: node.x + dx * scale, y: node.y + dy * scale };
}

function polygonBoundaryPoint(node: SceneNode, toward: Point): Point {
  const vertices = polygonVertices(node);
  const origin = { x: node.x, y: node.y };
  const ray = { x: toward.x - origin.x, y: toward.y - origin.y };
  let best: Point | undefined;
  let bestT = Number.POSITIVE_INFINITY;

  for (let index = 0; index < vertices.length; index += 1) {
    const start = vertices[index];
    const end = vertices[(index + 1) % vertices.length];
    if (!start || !end) continue;
    const hit = raySegmentIntersection(origin, ray, start, {
      x: end.x - start.x,
      y: end.y - start.y,
    });
    if (hit && hit.t >= 0 && hit.u >= 0 && hit.u <= 1 && hit.t < bestT) {
      bestT = hit.t;
      best = {
        x: origin.x + ray.x * hit.t,
        y: origin.y + ray.y * hit.t,
      };
    }
  }

  return best ?? origin;
}

function polygonVertices(node: SceneNode): Point[] {
  const x = node.x - node.width / 2;
  const y = node.y - node.height / 2;
  if (node.shape === "diamond") {
    return [
      { x: node.x, y },
      { x: x + node.width, y: node.y },
      { x: node.x, y: y + node.height },
      { x, y: node.y },
    ];
  }
  if (node.shape === "hexagon") {
    const inset = Math.min(node.width * 0.18, node.height / 2);
    return [
      { x: x + inset, y },
      { x: x + node.width - inset, y },
      { x: x + node.width, y: node.y },
      { x: x + node.width - inset, y: y + node.height },
      { x: x + inset, y: y + node.height },
      { x, y: node.y },
    ];
  }
  const notch = Math.min(node.width * 0.16, node.height / 2);
  return [
    { x, y },
    { x: x + node.width, y },
    { x: x + node.width, y: y + node.height },
    { x, y: y + node.height },
    { x: x + notch, y: node.y },
  ];
}

function raySegmentIntersection(
  rayOrigin: Point,
  rayVector: Point,
  segmentOrigin: Point,
  segmentVector: Point,
): { t: number; u: number } | undefined {
  const denominator = cross(rayVector, segmentVector);
  if (Math.abs(denominator) < 1e-9) return undefined;
  const delta = {
    x: segmentOrigin.x - rayOrigin.x,
    y: segmentOrigin.y - rayOrigin.y,
  };
  return {
    t: cross(delta, segmentVector) / denominator,
    u: cross(delta, rayVector) / denominator,
  };
}

function cross(a: Point, b: Point): number {
  return a.x * b.y - a.y * b.x;
}
