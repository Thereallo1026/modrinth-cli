import { spawnSync } from "node:child_process";
import { describe, expect, test } from "vitest";

const TEST_DIRECTORY_PATTERN = /\/src\/tests$/;

describe("modrinth CLI", () => {
  test("prints help", () => {
    const result = spawnSync("bun", ["run", "src/bin.ts", "--help"], {
      cwd: import.meta.dirname.replace(TEST_DIRECTORY_PATTERN, ""),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("Usage: modrinth");
  });
});
