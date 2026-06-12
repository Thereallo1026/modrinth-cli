import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { loadPackwiz } from "@/packwiz/pack";

let tempDirs: string[] = [];

async function packRoot() {
  const root = await mkdtemp(join(tmpdir(), "modrinth-packwiz-test-"));
  tempDirs.push(root);
  await mkdir(join(root, "mods"), { recursive: true });
  return root;
}

describe("loadPackwiz", () => {
  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true })));
    tempDirs = [];
  });

  test("loads pack.toml, index.toml, and metafiles into install targets", async () => {
    const root = await packRoot();
    const output = join(root, "minecraft");

    await writeFile(
      join(root, "pack.toml"),
      `
name = "Demo Pack"
pack-format = "packwiz:1.1.0"

[index]
file = "index.toml"
hash-format = "sha256"
hash = "abc"

[versions]
minecraft = "1.21.11"
fabric = "0.17.3"
`.trim()
    );
    await writeFile(
      join(root, "index.toml"),
      `
hash-format = "sha256"

[[files]]
file = "mods/sodium.pw.toml"
hash = "def"
metafile = true
`.trim()
    );
    await writeFile(
      join(root, "mods", "sodium.pw.toml"),
      `
name = "Sodium"
filename = "sodium.jar"
side = "client"

[download]
url = "https://cdn.modrinth.com/data/AANobbMI/versions/example/sodium.jar"
hash-format = "sha512"
hash = "123"

[update.modrinth]
mod-id = "AANobbMI"
version = "abc123"
`.trim()
    );

    const pack = await loadPackwiz({
      output,
      packFile: join(root, "pack.toml"),
    });

    expect(pack.name).toBe("Demo Pack");
    expect(pack.versions).toEqual({
      minecraft: "1.21.11",
      fabric: "0.17.3",
    });
    expect(pack.files).toHaveLength(1);
    expect(pack.files[0]).toMatchObject({
      name: "Sodium",
      relativeMetadata: "mods/sodium.pw.toml",
      relativeDestination: "mods/sodium.jar",
      destinationPath: join(output, "mods", "sodium.jar"),
      hashFormat: "sha512",
      hash: "123",
      side: "client",
      update: {
        modrinth: {
          projectId: "AANobbMI",
          versionId: "abc123",
        },
      },
    });
  });

  test("rejects index entries that escape the pack root", async () => {
    const root = await packRoot();

    await writeFile(
      join(root, "pack.toml"),
      `
name = "Bad Pack"
pack-format = "packwiz:1.1.0"

[index]
file = "index.toml"
hash-format = "sha256"
hash = "abc"

[versions]
minecraft = "1.21.11"
`.trim()
    );
    await writeFile(
      join(root, "index.toml"),
      `
hash-format = "sha256"

[[files]]
file = "../escape.pw.toml"
hash = "def"
metafile = true
`.trim()
    );

    await expect(
      loadPackwiz({ output: root, packFile: join(root, "pack.toml") })
    ).rejects.toMatchObject({
      code: "INVALID_PACKWIZ_PATH",
      message: "Packwiz path escapes the pack root.",
    });
  });
});
