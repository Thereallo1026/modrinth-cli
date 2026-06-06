import { beforeAll, describe, expect, test, vi } from "vitest";
import { loadMinecraftVersions, versionRange } from "../output/versions";

vi.mock("@/lib/minecraft-versions", () => ({
  minecraftVersions: async () => [
    { id: "1.16.5", type: "release" },
    { id: "1.17", type: "release" },
    { id: "1.17.1", type: "release" },
    { id: "1.18", type: "release" },
    { id: "1.18.1", type: "release" },
    { id: "1.18.2", type: "release" },
    { id: "1.19", type: "release" },
    { id: "1.19.1", type: "release" },
    { id: "1.19.2", type: "release" },
    { id: "1.19.3", type: "release" },
    { id: "1.19.4", type: "release" },
    { id: "1.20", type: "release" },
    { id: "1.20.1", type: "release" },
    { id: "26.1", type: "release" },
    { id: "26.1.1", type: "release" },
    { id: "26.1.2", type: "release" },
    { id: "b1.7.3", type: "old_beta" },
    { id: "b1.8", type: "old_beta" },
    { id: "b1.8.1", type: "old_beta" },
    { id: "26.2-pre-1", type: "snapshot" },
    { id: "26.2-pre-2", type: "snapshot" },
  ],
}));

describe("versionRange", () => {
  beforeAll(async () => {
    await loadMinecraftVersions();
  });

  test("keeps contiguous Minecraft runs compact", () => {
    expect(
      versionRange([
        "1.16.5",
        "1.17",
        "1.17.1",
        "1.18",
        "1.18.1",
        "1.18.2",
        "1.19",
        "1.19.1",
        "1.19.2",
        "1.19.3",
      ])
    ).toBe("1.16.5 - 1.19.3");
  });

  test("splits ranges when a patch is skipped", () => {
    expect(
      versionRange([
        "1.16.5",
        "1.17",
        "1.17.1",
        "1.18",
        "1.18.1",
        "1.18.2",
        "1.19",
        "1.19.1",
        "1.19.2",
        "1.19.3",
        "1.20",
        "26.1",
        "26.1.1",
        "26.1.2",
      ])
    ).toBe("1.16.5 - 1.19.3, 1.20, 26.1 - 26.1.2");
  });

  test("supports old beta and snapshot versions from Mojang", () => {
    expect(versionRange(["b1.7.3", "b1.8", "b1.8.1"])).toBe("b1.7.3 - b1.8.1");
    expect(versionRange(["26.2-pre-1", "26.2-pre-2"])).toBe(
      "26.2-pre-1 - 26.2-pre-2"
    );
  });
});
