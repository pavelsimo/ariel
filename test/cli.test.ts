import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const cli = resolve("node_modules/.bin/tsx");

describe("cli", () => {
  it("prints version", async () => {
    const result = await execFileAsync(cli, ["src/cli.ts", "--version"]);
    expect(result.stdout).toContain("0.1.0");
  });

  it("lists types as json", async () => {
    const result = await execFileAsync(cli, ["src/cli.ts", "--json", "types"]);
    const payload = JSON.parse(result.stdout) as {
      types: Array<{ name: string; status: string }>;
    };
    expect(
      payload.types.find((item) => item.name === "flowchart")?.status,
    ).toBe("supported");
  });

  it("supports dry-run animation", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ariel-cli-"));
    const input = join(dir, "diagram.mmd");
    await writeFile(input, "flowchart TD\nA[Start] --> B[End]\n");
    const result = await execFileAsync(cli, [
      "src/cli.ts",
      "--dry-run",
      "animate",
      input,
      "-o",
      join(dir, "diagram.mp4"),
      "--speed",
      "0.5",
    ]);
    expect(result.stderr).toContain("speed=0.5");
  });
});
