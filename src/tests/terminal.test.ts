import { afterEach, describe, expect, test } from "vitest";

import { timedPackwizLine } from "@/components/install/headers";
import {
  installedList,
  installedSummary,
} from "@/components/install/installed";
import { packageStatus } from "@/components/install/status";
import { commandHeader } from "@/components/tui/header";

const ESC = String.fromCharCode(27);

describe("installedList", () => {
  afterEach(() => {
    delete process.env.NO_COLOR;
  });

  test("formats a single entry with green plus sign and name@version", () => {
    process.env.NO_COLOR = "1";
    const result = installedList([
      { name: "sodium", version: "mc1.20.1-0.5.3" },
    ]);

    expect(result).toBe("+ sodium@mc1.20.1-0.5.3");
  });

  test("formats multiple entries one per line", () => {
    process.env.NO_COLOR = "1";
    const result = installedList([
      { name: "sodium", version: "mc1.20.1-0.5.3" },
      { name: "fabric-api", version: "0.92.0+1.20.1" },
    ]);

    expect(result).toBe("+ sodium@mc1.20.1-0.5.3\n+ fabric-api@0.92.0+1.20.1");
  });

  test("returns empty string for empty entry list", () => {
    expect(installedList([])).toBe("");
  });

  test("bolds the name and grays the @version when NO_COLOR is unset", () => {
    delete process.env.NO_COLOR;
    const result = installedList([{ name: "iris", version: "1.6.4" }]);

    expect(result).toContain(`${ESC}[32m+${ESC}[0m`);
    expect(result).toContain(`${ESC}[1miris${ESC}[0m`);
    expect(result).toContain(`${ESC}[90m@1.6.4${ESC}[0m`);
  });
});

describe("installedSummary", () => {
  afterEach(() => {
    delete process.env.NO_COLOR;
  });

  test("pluralizes and formats seconds to two decimals", () => {
    process.env.NO_COLOR = "1";

    expect(installedSummary(5, 12.324)).toBe("5 mods installed [12.32s]");
  });

  test("uses singular for a single mod", () => {
    process.env.NO_COLOR = "1";

    expect(installedSummary(1, 0.5)).toBe("1 mod installed [0.50s]");
  });

  test("greens the count and grays the elapsed time when NO_COLOR is unset", () => {
    delete process.env.NO_COLOR;
    const result = installedSummary(3, 1.2);

    expect(result).toContain(`${ESC}[32m3${ESC}[0m`);
    expect(result).toContain(`${ESC}[90m[1.20s]${ESC}[0m`);
  });
});

describe("packageStatus", () => {
  afterEach(() => {
    delete process.env.NO_COLOR;
  });

  test("formats the current package and total count", () => {
    process.env.NO_COLOR = "1";

    expect(packageStatus("sodium", 2, 6)).toBe("📦 sodium... [2/6]");
  });

  test("bolds the counter when NO_COLOR is unset", () => {
    delete process.env.NO_COLOR;
    const result = packageStatus("fabric-api", 1, 3);

    expect(result).toContain("📦 fabric-api... [");
    expect(result).toContain(`${ESC}[1m1${ESC}[0m`);
    expect(result).toContain(`${ESC}[1m3${ESC}[0m`);
  });
});

describe("commandHeader", () => {
  afterEach(() => {
    delete process.env.NO_COLOR;
  });

  test("formats the command header without colors when NO_COLOR is set", () => {
    process.env.NO_COLOR = "1";

    expect(commandHeader("search", "1.2.34")).toBe(
      "modrinth search v1.2.34\n\n"
    );
  });
});

describe("timedPackwizLine", () => {
  afterEach(() => {
    delete process.env.NO_COLOR;
  });

  test("formats packwiz parse timing without colors when NO_COLOR is set", () => {
    process.env.NO_COLOR = "1";

    expect(timedPackwizLine(1.234, "pack.toml")).toBe(
      "[1.23ms] parsed packwiz file from pack.toml"
    );
  });

  test("colors the packwiz filename green when NO_COLOR is unset", () => {
    delete process.env.NO_COLOR;
    const result = timedPackwizLine(1.234, "pack.toml");

    expect(result).toContain(`${ESC}[90m[1.23ms] parsed packwiz file from `);
    expect(result).toContain(`${ESC}[32mpack.toml${ESC}[0m`);
  });
});
