#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { stdin as input } from "node:process";

import { Command, Option } from "commander";

import {
  defaultFps,
  defaultFormat,
  defaultQuality,
  defaultSpeed,
  parseFormat,
  parseQuality,
} from "./config.js";
import { diagramStatus } from "./diagrams.js";
import { layoutGraph } from "./layout.js";
import { graphToJson } from "./model.js";
import { parseMermaid } from "./parser.js";
import { renderGraph } from "./render/index.js";
import { getTheme } from "./theme.js";

const version = packageVersion();

interface GlobalOptions {
  dryRun?: boolean;
  json?: boolean;
  noColor?: boolean;
  noInput?: boolean;
  quiet?: boolean;
  verbose?: boolean;
}

const program = new Command();

program
  .name("ariel")
  .description("animate Mermaid diagrams as images and videos")
  .version(version, "-V, --version", "Show version and exit.")
  .helpOption("-h, --help", "Show help.")
  .option("-v, --verbose", "Enable verbose output.")
  .option("-q, --quiet", "Suppress non-essential output.")
  .option("--json", "Output results as JSON.")
  .option("--no-color", "Disable ANSI color output.")
  .option("-n, --dry-run", "Preview without writing output.")
  .option("--no-input", "Disable interactive prompts.");

program
  .command("version")
  .description("Show the version and exit.")
  .action(() => {
    writeOutput(`ariel ${version}`);
  });

program
  .command("types")
  .description("List supported diagram types and their status.")
  .action(() => {
    const options = globals();
    const types = Object.entries(diagramStatus).map(([name, status]) => ({
      name,
      status,
    }));
    if (options.json) {
      writeOutput(JSON.stringify({ types }, null, 2));
      return;
    }
    const width = Math.max(...types.map((item) => item.name.length), 4);
    writeOutput(
      types
        .map((item) => `${item.name.padEnd(width)}  ${item.status}`)
        .join("\n"),
    );
  });

program
  .command("parse")
  .description("Emit parsed and laid-out diagram IR as JSON.")
  .argument("<source>", "Mermaid .mmd file, or - to read stdin.")
  .option("--type <type>", "Diagram type (auto-detected by default).", "auto")
  .action(async (source: string, options: { type: string }) => {
    await run(async () => {
      const text = await readSource(source);
      const graph = parseMermaid(text, options.type);
      const placed = layoutGraph(graph);
      writeOutput(JSON.stringify(graphToJson(placed), null, 2));
    });
  });

program
  .command("render")
  .description("Render a static single frame PNG.")
  .argument("<source>", "Mermaid .mmd file, or - to read stdin.")
  .requiredOption("-o, --output <path>", "Output PNG path.")
  .option("--background <color>", "Background color (name or #hex).")
  .option(
    "--theme <theme>",
    "Mermaid theme (default/dark/forest/neutral/excalidraw).",
    "excalidraw",
  )
  .option("--type <type>", "Diagram type (auto-detected by default).", "auto")
  .action(
    async (
      source: string,
      options: {
        background?: string;
        output: string;
        theme: string;
        type: string;
      },
    ) => {
      await run(async () => {
        const globalOptions = globals();
        if (globalOptions.dryRun) {
          writeError(`[dry-run] would render static PNG -> ${options.output}`);
          return;
        }
        const text = await readSource(source);
        const graph = parseMermaid(text, options.type);
        const placed = layoutGraph(graph);
        const theme = getTheme(options.theme);
        const output = await renderGraph(placed, theme, {
          output: options.output,
          format: "png",
          quality: defaultQuality,
          fps: defaultFps,
          speed: defaultSpeed,
          background: options.background,
          staticFrame: true,
        });
        emitResult(output, "png");
      });
    },
  );

program
  .command("animate")
  .description("Render an animated video from a Mermaid diagram.")
  .argument("<source>", "Mermaid .mmd file, or - to read stdin.")
  .requiredOption("-o, --output <path>", "Output file path.")
  .addOption(
    new Option("--format <format>", "Output format.")
      .choices(["mp4", "gif", "webm", "png"])
      .default(defaultFormat),
  )
  .addOption(
    new Option("--quality <quality>", "Render quality preset.")
      .choices(["l", "m", "h", "p", "k"])
      .default(defaultQuality),
  )
  .option("--fps <fps>", "Frames per second.", parseInteger, defaultFps)
  .option(
    "--speed <speed>",
    "Animation speed multiplier; lower values slow down.",
    parseFloatOption,
    defaultSpeed,
  )
  .option("--background <color>", "Background color (name or #hex).")
  .option(
    "--theme <theme>",
    "Mermaid theme (default/dark/forest/neutral/excalidraw).",
    "excalidraw",
  )
  .option("--type <type>", "Diagram type (auto-detected by default).", "auto")
  .action(
    async (
      source: string,
      options: {
        background?: string;
        format: string;
        fps: number;
        output: string;
        quality: string;
        speed: number;
        theme: string;
        type: string;
      },
    ) => {
      await run(async () => {
        const globalOptions = globals();
        const format = parseFormat(options.format);
        const quality = parseQuality(options.quality);
        if (options.speed < 0.1) {
          throw new Error("--speed must be at least 0.1");
        }
        if (globalOptions.dryRun) {
          writeError(
            `[dry-run] would render ${format} -> ${options.output} (quality=${quality}, fps=${options.fps}, speed=${options.speed})`,
          );
          return;
        }

        const text = await readSource(source);
        const graph = parseMermaid(text, options.type);
        const placed = layoutGraph(graph);
        const theme = getTheme(options.theme);
        if (globalOptions.verbose) {
          writeError(
            `parsed ${graph.nodes.size} nodes, ${graph.edges.length} edges; layout ${placed.width.toFixed(0)}x${placed.height.toFixed(0)}`,
          );
        }
        const output = await renderGraph(placed, theme, {
          output: options.output,
          format,
          quality,
          fps: options.fps,
          speed: options.speed,
          background: options.background,
        });
        emitResult(output, format);
      });
    },
  );

program.showHelpAfterError();
program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  writeError(message);
  process.exitCode = 1;
});

async function run(fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeError(message);
    process.exitCode = 1;
  }
}

async function readSource(source: string): Promise<string> {
  if (source === "-") {
    return readStdin();
  }
  try {
    return await readFile(source, "utf8");
  } catch {
    throw new Error(`no such file: ${source}`);
  }
}

async function readStdin(): Promise<string> {
  input.setEncoding("utf8");
  let text = "";
  for await (const chunk of input) {
    text += chunk;
  }
  return text;
}

function emitResult(output: string, format: string): void {
  if (globals().json) {
    writeOutput(JSON.stringify({ output, format }, null, 2));
  } else {
    writeOutput(output);
  }
}

function globals(): GlobalOptions {
  return program.opts<GlobalOptions>();
}

function parseInteger(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`invalid integer: ${value}`);
  }
  return parsed;
}

function parseFloatOption(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`invalid number: ${value}`);
  }
  return parsed;
}

function writeOutput(message: string): void {
  process.stdout.write(`${message}\n`);
}

function writeError(message: string): void {
  process.stderr.write(`${message}\n`);
}

function packageVersion(): string {
  const url = new URL("../package.json", import.meta.url);
  const data = JSON.parse(readFileSync(url, "utf8")) as { version?: string };
  return data.version ?? "0.0.0";
}
