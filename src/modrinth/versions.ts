import type { Labrinth } from "@modrinth/api-client";
import { CliError } from "@/lib/errors";
import { modrinthClient } from "./client";
import { type Project, resolve } from "./projects";

interface FindDownloadTargetInput {
  gameVersion?: string;
  loader?: string;
  modVersion?: string;
  project: string;
  type?: Labrinth.Versions.v2.VersionType;
}

interface ListProjectVersionsInput {
  gameVersion?: string;
  limit?: number;
  loader?: string;
  offset?: number;
  project: string;
  type?: Labrinth.Versions.v2.VersionType;
}

export async function versionsFor(input: ListProjectVersionsInput) {
  const resolved = await resolve(input.project);
  const limit = input.limit ?? 10;
  const offset = input.offset ?? 0;
  const apiLimit = input.type ? 100 : limit;
  const apiOffset = input.type ? 0 : input.offset;
  const versions = await modrinthClient.labrinth.versions_v2.getProjectVersions(
    resolved.project.id,
    {
      game_versions: input.gameVersion ? [input.gameVersion] : undefined,
      loaders: input.loader ? [input.loader] : undefined,
      include_changelog: false,
      limit: apiLimit,
      offset: apiOffset,
    }
  );
  const visibleVersions = input.type
    ? versions
        .filter((version) => version.version_type === input.type)
        .slice(offset, offset + limit)
    : versions;

  return {
    project: projectSummary(resolved.project),
    versions: visibleVersions,
  };
}

export async function pickDownload(input: FindDownloadTargetInput) {
  const listed = await versionsFor(input);
  const version = chooseVersion(listed.versions, input.modVersion);
  const file = chooseFile(version);

  return {
    project: listed.project,
    version: versionSummary(version),
    file,
  };
}

function chooseVersion(
  versions: Labrinth.Versions.v2.Version[],
  modVersion?: string
) {
  if (modVersion) {
    const exactVersion = versions.find(
      (candidate) =>
        candidate.id === modVersion ||
        candidate.version_number === modVersion ||
        candidate.name === modVersion
    );

    if (!exactVersion) {
      throw new CliError(
        "VERSION_NOT_FOUND",
        `No matching Modrinth release matched "${modVersion}".`,
        {
          version: modVersion,
        }
      );
    }

    return exactVersion;
  }

  const releaseVersion =
    versions.find((candidate) => candidate.version_type === "release") ??
    versions[0];

  if (!releaseVersion) {
    throw new CliError(
      "VERSION_NOT_FOUND",
      "No matching Modrinth version was found."
    );
  }

  return releaseVersion;
}

export type Version = Labrinth.Versions.v2.Version;

function chooseFile(version: Labrinth.Versions.v2.Version) {
  const file =
    version.files.find((candidate) => candidate.primary) ?? version.files[0];

  if (!file) {
    throw new CliError(
      "FILE_NOT_FOUND",
      "No downloadable file was found for this version.",
      {
        versionId: version.id,
      }
    );
  }

  return file;
}

function projectSummary(project: Project) {
  return {
    description: project.description,
    id: project.id,
    project_type: project.project_type,
    slug: project.slug,
    title: project.title,
  };
}

function versionSummary(version: Labrinth.Versions.v2.Version) {
  return {
    id: version.id,
    name: version.name,
    version_number: version.version_number,
    game_versions: version.game_versions,
    loaders: version.loaders,
    version_type: version.version_type,
    date_published: version.date_published,
  };
}
