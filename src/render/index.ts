import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

import sharp from "sharp";

import {
  type OutputFormat,
  type Quality,
  defaultFps,
  defaultSpeed,
  sizeForQuality,
} from "../config.js";
import type { PlacedGraph } from "../model.js";
import { buildScene } from "../scene.js";
import type { Theme } from "../theme.js";
import { buildTimeline, renderSvg } from "./svg.js";

const execFileAsync = promisify(execFile);

export interface RenderOptions {
  output: string;
  format: OutputFormat;
  quality: Quality;
  fps: number;
  speed: number;
  background?: string | undefined;
  staticFrame?: boolean | undefined;
}

export async function renderGraph(
  placed: PlacedGraph,
  theme: Theme,
  options: RenderOptions,
): Promise<string> {
  const output = resolve(options.output);
  const size = sizeForQuality(options.quality);
  const scene = buildScene(
    placed,
    theme,
    size,
    options.background ?? theme.background,
  );

  if (options.staticFrame || options.format === "png") {
    await renderPng(scene, output);
    return output;
  }

  await renderVideo(scene, output, options.format, options.fps, options.speed);
  return output;
}

async function renderPng(
  scene: ReturnType<typeof buildScene>,
  output: string,
): Promise<void> {
  const svg = renderSvg(scene, { staticFrame: true });
  await sharp(Buffer.from(svg)).png().toFile(output);
}

async function renderVideo(
  scene: ReturnType<typeof buildScene>,
  output: string,
  format: Exclude<OutputFormat, "png">,
  fps = defaultFps,
  speed = defaultSpeed,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), "ariel-"));
  const timeline = buildTimeline(scene, speed);
  const frameCount = Math.max(2, Math.ceil(timeline.duration * fps));

  try {
    for (let index = 0; index < frameCount; index += 1) {
      const time = index / fps;
      const svg = renderSvg(scene, { time, staticFrame: false, timeline });
      const frame = join(dir, `frame-${String(index).padStart(5, "0")}.png`);
      await sharp(Buffer.from(svg)).png().toFile(frame);
    }

    await encodeFrames(dir, output, format, fps);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
}

async function encodeFrames(
  dir: string,
  output: string,
  format: Exclude<OutputFormat, "png">,
  fps: number,
): Promise<void> {
  const input = join(dir, "frame-%05d.png");
  const args = [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-framerate",
    String(fps),
    "-i",
    input,
  ];

  if (format === "mp4") {
    args.push(
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-movflags",
      "+faststart",
      output,
    );
  } else if (format === "webm") {
    args.push("-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", output);
  } else {
    args.push("-loop", "0", output);
  }

  try {
    await execFileAsync("ffmpeg", args, { maxBuffer: 1024 * 1024 });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`ffmpeg failed while encoding ${format}: ${detail}`);
  }
}
