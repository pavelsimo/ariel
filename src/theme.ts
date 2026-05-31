export interface Theme {
  nodeFill: string;
  nodeStroke: string;
  nodeTextColor: string;
  nodeStrokeWidth: number;
  edgeColor: string;
  edgeLabelBg: string;
  edgeWidth: number;
  labelFontSize: number;
  nodeFontSize: number;
  fontFamily: string;
  background: string;
}

const defaultTheme: Theme = {
  nodeFill: "#ECECFF",
  nodeStroke: "#9370DB",
  nodeTextColor: "#333333",
  nodeStrokeWidth: 2,
  edgeColor: "#333333",
  edgeLabelBg: "#E8E8E8",
  edgeWidth: 2,
  labelFontSize: 14,
  nodeFontSize: 16,
  fontFamily: "Arial, sans-serif",
  background: "#FFFFFF",
};

const themes: Record<string, Theme> = {
  default: defaultTheme,
  dark: {
    ...defaultTheme,
    nodeFill: "#1F2020",
    nodeStroke: "#81B1DB",
    nodeTextColor: "#E0E0E0",
    edgeColor: "#81B1DB",
    edgeLabelBg: "#1F2020",
    background: "#1F2020",
  },
  forest: {
    ...defaultTheme,
    nodeFill: "#CDE498",
    nodeStroke: "#13540C",
    nodeTextColor: "#13540C",
    edgeColor: "#13540C",
    edgeLabelBg: "#CDE498",
  },
  neutral: {
    ...defaultTheme,
    nodeFill: "#F0F0F0",
    nodeStroke: "#666666",
    nodeTextColor: "#333333",
    edgeColor: "#666666",
    edgeLabelBg: "#F0F0F0",
  },
  excalidraw: {
    ...defaultTheme,
    nodeFill: "#E2D5FF",
    nodeStroke: "#1E1E1E",
    nodeTextColor: "#1E1E1E",
    nodeStrokeWidth: 2.5,
    edgeColor: "#1E1E1E",
    edgeLabelBg: "#FFFFFF",
    edgeWidth: 2.5,
    fontFamily: "Kalam, Comic Sans MS, Arial, sans-serif",
    nodeFontSize: 18,
  },
};

export function getTheme(name = "excalidraw"): Theme {
  const theme = themes[name];
  if (!theme) {
    throw new Error(
      `unknown theme: ${name} (available: ${Object.keys(themes).join(", ")})`,
    );
  }
  return theme;
}

export function listThemes(): string[] {
  return Object.keys(themes);
}
