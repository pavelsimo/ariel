import type { Point } from "../model.js";
import type { SceneEdge, SceneModel, SceneNode } from "../scene.js";

interface RenderState {
  time: number;
  staticFrame: boolean;
  timeline: Timeline;
}

interface Timeline {
  duration: number;
  nodeStarts: Map<string, number>;
  edgeStarts: Map<number, number>;
  nodeDuration: number;
  edgeDuration: number;
}

export function buildTimeline(scene: SceneModel, speed: number): Timeline {
  if (speed <= 0) {
    throw new Error("animation speed must be greater than zero");
  }
  const nodeDuration = 0.35 / speed;
  const edgeDuration = 0.25 / speed;
  const nodeStarts = new Map<string, number>();
  const edgeStarts = new Map<number, number>();
  let time = 0;

  for (const node of scene.nodes) {
    nodeStarts.set(node.id, time);
    time += nodeDuration * 0.75;
  }
  scene.edges.forEach((_edge, index) => {
    edgeStarts.set(index, time);
    time += edgeDuration * 0.8;
  });

  return {
    duration: time + 0.75 / speed,
    nodeStarts,
    edgeStarts,
    nodeDuration,
    edgeDuration,
  };
}

export function renderSvg(
  scene: SceneModel,
  state?: Partial<RenderState>,
): string {
  const timeline = state?.timeline ?? buildTimeline(scene, 1);
  const renderState: RenderState = {
    time: state?.time ?? timeline.duration,
    staticFrame: state?.staticFrame ?? true,
    timeline,
  };

  const edgeLayers = scene.edges
    .map((edge, index) => renderEdge(edge, index, scene, renderState))
    .join("\n");
  const nodeLayers = scene.nodes
    .map((node) => renderNode(node, scene, renderState))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">
  <rect width="100%" height="100%" fill="${escapeAttr(scene.background)}"/>
  <g font-family="${escapeAttr(scene.theme.fontFamily)}">
${edgeLayers}
${nodeLayers}
  </g>
</svg>
`;
}

function renderNode(
  node: SceneNode,
  scene: SceneModel,
  state: RenderState,
): string {
  const progress = state.staticFrame
    ? 1
    : progressAt(
        state.time,
        state.timeline.nodeStarts.get(node.id) ?? 0,
        state.timeline.nodeDuration,
      );
  const scale = 0.94 + progress * 0.06;
  const transform = `translate(${fmt(node.x)} ${fmt(node.y)}) scale(${fmt(scale)}) translate(${fmt(-node.x)} ${fmt(-node.y)})`;
  const shape = nodeShape(node, scene);
  const text = nodeText(node, scene);
  return `    <g opacity="${fmt(progress)}" transform="${transform}">
${shape}
${text}
    </g>`;
}

function nodeShape(node: SceneNode, scene: SceneModel): string {
  const stroke = escapeAttr(scene.theme.nodeStroke);
  const fill = escapeAttr(scene.theme.nodeFill);
  const width = fmt(scene.theme.nodeStrokeWidth);
  const common = `fill="${fill}" stroke="${stroke}" stroke-width="${width}"`;
  const x = node.x - node.width / 2;
  const y = node.y - node.height / 2;

  switch (node.shape) {
    case "rounded":
      return `      <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(node.width)}" height="${fmt(node.height)}" rx="${fmt(Math.min(18, node.height / 3))}" ${common}/>`;
    case "stadium":
      return `      <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(node.width)}" height="${fmt(node.height)}" rx="${fmt(node.height / 2)}" ${common}/>`;
    case "diamond":
      return `      <polygon points="${fmt(node.x)},${fmt(y)} ${fmt(x + node.width)},${fmt(node.y)} ${fmt(node.x)},${fmt(y + node.height)} ${fmt(x)},${fmt(node.y)}" ${common}/>`;
    case "hexagon": {
      const inset = Math.min(node.width * 0.18, node.height / 2);
      return `      <polygon points="${fmt(x + inset)},${fmt(y)} ${fmt(x + node.width - inset)},${fmt(y)} ${fmt(x + node.width)},${fmt(node.y)} ${fmt(x + node.width - inset)},${fmt(y + node.height)} ${fmt(x + inset)},${fmt(y + node.height)} ${fmt(x)},${fmt(node.y)}" ${common}/>`;
    }
    case "circle":
    case "double-circle": {
      const inner =
        node.shape === "double-circle"
          ? `\n      <ellipse cx="${fmt(node.x)}" cy="${fmt(node.y)}" rx="${fmt(node.width * 0.36)}" ry="${fmt(node.height * 0.36)}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`
          : "";
      return `      <ellipse cx="${fmt(node.x)}" cy="${fmt(node.y)}" rx="${fmt(node.width / 2)}" ry="${fmt(node.height / 2)}" ${common}/>${inner}`;
    }
    case "subroutine": {
      const inset = Math.min(node.width * 0.08, 18);
      return `      <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(node.width)}" height="${fmt(node.height)}" ${common}/>
      <line x1="${fmt(x + inset)}" y1="${fmt(y)}" x2="${fmt(x + inset)}" y2="${fmt(y + node.height)}" stroke="${stroke}" stroke-width="${width}"/>
      <line x1="${fmt(x + node.width - inset)}" y1="${fmt(y)}" x2="${fmt(x + node.width - inset)}" y2="${fmt(y + node.height)}" stroke="${stroke}" stroke-width="${width}"/>`;
    }
    case "cylinder": {
      const cap = Math.min(node.height * 0.28, 28);
      return `      <path d="M ${fmt(x)} ${fmt(y + cap / 2)} C ${fmt(x)} ${fmt(y - cap / 2)} ${fmt(x + node.width)} ${fmt(y - cap / 2)} ${fmt(x + node.width)} ${fmt(y + cap / 2)} L ${fmt(x + node.width)} ${fmt(y + node.height - cap / 2)} C ${fmt(x + node.width)} ${fmt(y + node.height + cap / 2)} ${fmt(x)} ${fmt(y + node.height + cap / 2)} ${fmt(x)} ${fmt(y + node.height - cap / 2)} Z" ${common}/>
      <ellipse cx="${fmt(node.x)}" cy="${fmt(y + cap / 2)}" rx="${fmt(node.width / 2)}" ry="${fmt(cap / 2)}" fill="none" stroke="${stroke}" stroke-width="${width}"/>
      <path d="M ${fmt(x)} ${fmt(y + node.height - cap / 2)} C ${fmt(x)} ${fmt(y + node.height + cap / 2)} ${fmt(x + node.width)} ${fmt(y + node.height + cap / 2)} ${fmt(x + node.width)} ${fmt(y + node.height - cap / 2)}" fill="none" stroke="${stroke}" stroke-width="${width}"/>`;
    }
    case "asymmetric": {
      const notch = Math.min(node.width * 0.16, node.height / 2);
      return `      <polygon points="${fmt(x)},${fmt(y)} ${fmt(x + node.width)},${fmt(y)} ${fmt(x + node.width)},${fmt(y + node.height)} ${fmt(x)},${fmt(y + node.height)} ${fmt(x + notch)},${fmt(node.y)}" ${common}/>`;
    }
    default:
      return `      <rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(node.width)}" height="${fmt(node.height)}" ${common}/>`;
  }
}

function nodeText(node: SceneNode, scene: SceneModel): string {
  const lines = node.label.split("\n");
  const lineHeight = scene.theme.nodeFontSize * 1.25;
  const startY = node.y - ((lines.length - 1) * lineHeight) / 2;
  const spans = lines
    .map(
      (line, index) =>
        `        <tspan x="${fmt(node.x)}" y="${fmt(startY + index * lineHeight)}">${escapeText(line)}</tspan>`,
    )
    .join("\n");
  return `      <text text-anchor="middle" dominant-baseline="middle" fill="${escapeAttr(scene.theme.nodeTextColor)}" font-size="${scene.theme.nodeFontSize}">
${spans}
      </text>`;
}

function renderEdge(
  edge: SceneEdge,
  index: number,
  scene: SceneModel,
  state: RenderState,
): string {
  if (edge.points.length < 2) return "";
  const start = state.timeline.edgeStarts.get(index) ?? 0;
  const progress = state.staticFrame
    ? 1
    : progressAt(state.time, start, state.timeline.edgeDuration);
  const d = pathData(edge.points);
  const length = Math.max(pathLength(edge.points), 1);
  const strokeWidth =
    edge.kind === "thick" ? scene.theme.edgeWidth * 1.8 : scene.theme.edgeWidth;
  const dashAttrs =
    edge.kind === "dotted"
      ? `stroke-dasharray="${fmt(strokeWidth)} ${fmt(strokeWidth * 3)}"`
      : `stroke-dasharray="${fmt(length)}" stroke-dashoffset="${fmt(length * (1 - progress))}"`;
  const arrow = edge.arrow === "open" ? "" : arrowHead(edge, scene, progress);
  const label = edge.label ? edgeLabel(edge, scene, progress) : "";
  return `    <g opacity="${fmt(edge.kind === "dotted" ? progress : 1)}">
      <path d="${d}" fill="none" stroke="${escapeAttr(scene.theme.edgeColor)}" stroke-width="${fmt(strokeWidth)}" stroke-linecap="round" stroke-linejoin="round" ${dashAttrs}/>
${arrow}
${label}
    </g>`;
}

function arrowHead(
  edge: SceneEdge,
  scene: SceneModel,
  progress: number,
): string {
  const end = edge.points[edge.points.length - 1];
  const prev = edge.points[edge.points.length - 2];
  if (!end || !prev) return "";
  const angle = Math.atan2(end.y - prev.y, end.x - prev.x);
  const size = Math.max(scene.theme.edgeWidth * 4.2, 11);
  const p1 = polar(end, angle + Math.PI - 0.5, size);
  const p2 = polar(end, angle + Math.PI + 0.5, size);
  const fill =
    edge.arrow === "inheritance" || edge.arrow === "aggregation"
      ? "none"
      : escapeAttr(scene.theme.edgeColor);
  return `      <polygon points="${fmt(end.x)},${fmt(end.y)} ${fmt(p1.x)},${fmt(p1.y)} ${fmt(p2.x)},${fmt(p2.y)}" fill="${fill}" stroke="${escapeAttr(scene.theme.edgeColor)}" stroke-width="${fmt(scene.theme.edgeWidth)}" opacity="${fmt(progress)}"/>`;
}

function edgeLabel(
  edge: SceneEdge,
  scene: SceneModel,
  progress: number,
): string {
  const mid = pointAtFraction(edge.points, 0.5);
  const width = Math.max(
    edge.label.length * scene.theme.labelFontSize * 0.62 + 18,
    40,
  );
  const height = scene.theme.labelFontSize * 1.6;
  return `      <g opacity="${fmt(progress)}">
        <rect x="${fmt(mid.x - width / 2)}" y="${fmt(mid.y - height / 2)}" width="${fmt(width)}" height="${fmt(height)}" rx="4" fill="${escapeAttr(scene.theme.edgeLabelBg)}" opacity="0.92"/>
        <text x="${fmt(mid.x)}" y="${fmt(mid.y)}" text-anchor="middle" dominant-baseline="middle" fill="${escapeAttr(scene.theme.nodeTextColor)}" font-size="${scene.theme.labelFontSize}">${escapeText(edge.label)}</text>
      </g>`;
}

function progressAt(time: number, start: number, duration: number): number {
  if (time <= start) return 0;
  if (time >= start + duration) return 1;
  const t = (time - start) / duration;
  return 1 - Math.pow(1 - t, 3);
}

function pathData(points: Point[]): string {
  const [first, ...rest] = points;
  if (!first) return "";
  return `M ${fmt(first.x)} ${fmt(first.y)} ${rest.map((point) => `L ${fmt(point.x)} ${fmt(point.y)}`).join(" ")}`;
}

function pathLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const point = points[i];
    if (!prev || !point) continue;
    length += Math.hypot(point.x - prev.x, point.y - prev.y);
  }
  return length;
}

function pointAtFraction(points: Point[], fraction: number): Point {
  const total = pathLength(points);
  if (total <= 0) return points[0] ?? { x: 0, y: 0 };
  let remaining = total * fraction;
  for (let i = 1; i < points.length; i += 1) {
    const prev = points[i - 1];
    const point = points[i];
    if (!prev || !point) continue;
    const segment = Math.hypot(point.x - prev.x, point.y - prev.y);
    if (remaining <= segment) {
      const t = segment === 0 ? 0 : remaining / segment;
      return {
        x: prev.x + (point.x - prev.x) * t,
        y: prev.y + (point.y - prev.y) * t,
      };
    }
    remaining -= segment;
  }
  return points[points.length - 1] ?? { x: 0, y: 0 };
}

function polar(point: Point, angle: number, distance: number): Point {
  return {
    x: point.x + Math.cos(angle) * distance,
    y: point.y + Math.sin(angle) * distance,
  };
}

function escapeText(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(text: string): string {
  return escapeText(text).replaceAll('"', "&quot;");
}

function fmt(value: number): string {
  return Number.isFinite(value) ? value.toFixed(3).replace(/\.?0+$/, "") : "0";
}
