import { basename } from "node:path";

import { modrinthClient } from "@/modrinth/client";
import type { PackwizFile } from "@/packwiz/pack";

const PACKWIZ_META_SUFFIX_PATTERN = /\.pw\.toml$/u;
const TOML_SUFFIX_PATTERN = /\.toml$/u;
const ARCHIVE_SUFFIX_PATTERN = /\.(jar|zip)$/u;

export interface PackwizInstallEntry {
  name: string;
  version: string;
}

export async function describePackwizInstalls(files: PackwizFile[]) {
  const versionIds = [
    ...new Set(
      files
        .map((file) => file.update?.modrinth?.versionId)
        .filter((versionId): versionId is string => Boolean(versionId))
    ),
  ];
  let versions: Awaited<
    ReturnType<typeof modrinthClient.labrinth.versions_v2.getVersions>
  > = [];

  try {
    versions = versionIds.length
      ? await modrinthClient.labrinth.versions_v2.getVersions(versionIds)
      : [];
  } catch {
    versions = [];
  }
  const versionsById = new Map(
    versions.map((version) => [version.id, version.version_number])
  );

  return files.map((file) => ({
    name: cleanName(file),
    version:
      versionsById.get(file.update?.modrinth?.versionId ?? "") ??
      fileVersion(file),
  }));
}

function cleanName(file: PackwizFile) {
  const metadataName = basename(file.relativeMetadata)
    .replace(PACKWIZ_META_SUFFIX_PATTERN, "")
    .replace(TOML_SUFFIX_PATTERN, "");

  return metadataName || file.name;
}

function fileVersion(file: PackwizFile) {
  return basename(file.relativeDestination).replace(ARCHIVE_SUFFIX_PATTERN, "");
}
