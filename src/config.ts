export type OutputFormat = "mp4" | "gif" | "webm" | "png";
export type Quality = "l" | "m" | "h" | "p" | "k";

export const defaultFormat: OutputFormat = "mp4";
export const defaultQuality: Quality = "m";
export const defaultFps = 30;
export const defaultSpeed = 2 / 3;

export interface RenderSize {
  width: number;
  height: number;
}

export function sizeForQuality(quality: Quality): RenderSize {
  switch (quality) {
    case "l":
      return { width: 854, height: 480 };
    case "m":
      return { width: 1280, height: 720 };
    case "h":
      return { width: 1920, height: 1080 };
    case "p":
      return { width: 2560, height: 1440 };
    case "k":
      return { width: 3840, height: 2160 };
  }
}

export function parseFormat(value: string): OutputFormat {
  if (
    value === "mp4" ||
    value === "gif" ||
    value === "webm" ||
    value === "png"
  ) {
    return value;
  }
  throw new Error(`unsupported output format: ${value}`);
}

export function parseQuality(value: string): Quality {
  if (
    value === "l" ||
    value === "m" ||
    value === "h" ||
    value === "p" ||
    value === "k"
  ) {
    return value;
  }
  throw new Error(`unsupported quality preset: ${value}`);
}
