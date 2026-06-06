import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";
import { USER_AGENT } from "@/modrinth/client";

const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MANIFEST_URL =
  "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";

const manifestSchema = z.object({
  latest: z.object({
    release: z.string(),
    snapshot: z.string(),
  }),
  versions: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
    })
  ),
});

const cacheSchema = z.object({
  fetchedAt: z.string(),
  latest: z.object({
    release: z.string(),
    snapshot: z.string(),
  }),
  versions: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
    })
  ),
});

export type MinecraftVersion = z.infer<typeof cacheSchema>["versions"][number];

export async function minecraftVersions() {
  const cachePath = minecraftVersionCachePath();
  const cached = await readCache(cachePath);

  if (cached && fresh(cached.fetchedAt)) {
    return cached.versions;
  }

  try {
    const latest = await fetchVersions();
    await writeCache(cachePath, latest);

    return latest.versions;
  } catch {
    return cached?.versions ?? [];
  }
}

function minecraftVersionCachePath() {
  const baseDirectory =
    process.env.XDG_CACHE_HOME ??
    (process.platform === "darwin"
      ? join(homedir(), "Library", "Caches")
      : join(homedir(), ".cache"));

  return join(baseDirectory, "modrinth-cli", "minecraft-versions.json");
}

async function readCache(path: string) {
  try {
    return cacheSchema.parse(JSON.parse(await readFile(path, "utf8")));
  } catch {
    return;
  }
}

async function writeCache(path: string, cache: z.infer<typeof cacheSchema>) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(cache, null, 2)}\n`);
}

async function fetchVersions() {
  const response = await fetch(MANIFEST_URL, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Minecraft version manifest failed with ${response.status}.`
    );
  }

  const manifest = manifestSchema.parse(await response.json());

  return {
    fetchedAt: new Date().toISOString(),
    latest: manifest.latest,
    versions: manifest.versions.toReversed(),
  };
}

function fresh(fetchedAt: string) {
  const fetchedAtMs = Date.parse(fetchedAt);

  if (!Number.isFinite(fetchedAtMs)) {
    return false;
  }

  return Date.now() - fetchedAtMs < CACHE_MAX_AGE_MS;
}
