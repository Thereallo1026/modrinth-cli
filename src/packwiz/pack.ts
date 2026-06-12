import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { parse } from "smol-toml";
import { z } from "zod";

import type { HashFormat } from "@/lib/download-file";
import { CliError } from "@/lib/errors";
import { packPath } from "@/packwiz/paths";

const hashFormatSchema = z.enum(["md5", "murmur2", "sha1", "sha256", "sha512"]);

const packSchema = z.object({
  name: z.string().catch("packwiz pack"),
  "pack-format": z.string().catch("packwiz:1.1.0"),
  index: z.object({
    file: z.string().catch("index.toml"),
    hash: z.string().optional(),
    "hash-format": hashFormatSchema.catch("sha256"),
  }),
  versions: z.record(z.string(), z.string()).catch({}),
});

const indexFileSchema = z.object({
  file: z.string(),
  hash: z.string().optional(),
  alias: z.string().optional(),
  "hash-format": hashFormatSchema.optional(),
  metafile: z.boolean().catch(false),
  preserve: z.boolean().catch(false),
});

const indexSchema = z.object({
  "hash-format": hashFormatSchema.catch("sha256"),
  files: z.array(indexFileSchema).catch([]),
});

const modrinthUpdateSchema = z
  .object({
    "mod-id": z.string().optional(),
    version: z.string().optional(),
  })
  .catch({});

const metafileSchema = z.object({
  name: z.string(),
  filename: z.string(),
  side: z.string().optional(),
  download: z.object({
    url: z.string().min(1),
    hash: z.string(),
    "hash-format": hashFormatSchema,
  }),
  update: z
    .object({
      modrinth: modrinthUpdateSchema.optional(),
    })
    .optional(),
});

export interface PackwizFile {
  destinationPath: string;
  hash: string;
  hashFormat: HashFormat;
  metadataPath: string;
  name: string;
  preserve: boolean;
  relativeDestination: string;
  relativeMetadata: string;
  side?: string;
  update?: {
    modrinth?: {
      projectId?: string;
      versionId?: string;
    };
  };
  url: string;
}

export interface PackwizPack {
  file: string;
  files: PackwizFile[];
  indexFile: string;
  name: string;
  parseMs: number;
  root: string;
  versions: Record<string, string>;
}

export async function loadPackwiz(input: {
  output: string;
  packFile?: string;
}) {
  const startedAt = performance.now();
  const packFile = resolve(input.packFile ?? "pack.toml");
  const packRoot = dirname(packFile);
  const rawPack = parse(await readFile(packFile, "utf8"));
  const pack = packSchema.parse(rawPack);
  const indexFile = packPath(packRoot, pack.index.file);
  const indexRoot = dirname(indexFile);
  const rawIndex = parse(await readFile(indexFile, "utf8"));
  const index = indexSchema.parse(rawIndex);
  const outputRoot = resolve(input.output === "." ? indexRoot : input.output);
  const files: PackwizFile[] = [];

  for (const entry of index.files) {
    if (!entry.metafile) {
      continue;
    }

    const metadataPath = packPath(indexRoot, entry.file);
    const rawMetafile = parse(await readFile(metadataPath, "utf8"));
    const metafile = metafileSchema.parse(rawMetafile);
    const metadataDirectory = dirname(entry.file);
    const relativeDestination =
      metadataDirectory === "."
        ? metafile.filename
        : `${metadataDirectory}/${metafile.filename}`;

    files.push({
      destinationPath: packPath(outputRoot, relativeDestination),
      hash: metafile.download.hash,
      hashFormat: metafile.download["hash-format"],
      metadataPath,
      name: metafile.name,
      preserve: entry.preserve,
      relativeDestination,
      relativeMetadata: entry.file,
      side: metafile.side,
      url: metafile.download.url,
      update: {
        modrinth: {
          projectId: metafile.update?.modrinth?.["mod-id"],
          versionId: metafile.update?.modrinth?.version,
        },
      },
    });
  }

  if (files.length === 0) {
    throw new CliError("PACKWIZ_EMPTY", "No packwiz metafiles were found.", {
      packFile,
      indexFile,
    });
  }

  return {
    file: packFile,
    files,
    indexFile,
    name: pack.name,
    parseMs: performance.now() - startedAt,
    root: indexRoot,
    versions: pack.versions,
  } satisfies PackwizPack;
}
