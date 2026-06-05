import type { Labrinth } from "@modrinth/api-client";
import { CliError } from "@/lib/errors";
import { modrinthClient } from "./client";
import { type Project, resolveProject } from "./projects";

interface FindDownloadTargetInput {
  gameVersion?: string;
  loader?: string;
  modVersion?: string;
  project: string;
}

interface ListProjectVersionsInput {
  gameVersion?: string;
  loader?: string;
  project: string;
}

export async function listProjectVersions(input: ListProjectVersionsInput) {
  const resolved = await resolveProject(input.project);
  const versions = await modrinthClient.labrinth.versions_v2.getProjectVersions(
    resolved.project.id,
    {
      game_versions: input.gameVersion ? [input.gameVersion] : undefined,
      loaders: input.loader ? [input.loader] : undefined,
      include_changelog: false,
      limit: 100,
    }
  );

  return {
    project: summarizeProject(resolved.project),
    versions,
  };
}

export async function findDownloadTarget(input: FindDownloadTargetInput) {
  const listed = await listProjectVersions(input);
  const version = selectVersion(listed.versions, input.modVersion);
  const file = selectVersionFile(version);

  return {
    project: listed.project,
    version: summarizeVersion(version),
    file,
  };
}

function selectVersion(
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

function selectVersionFile(version: Labrinth.Versions.v2.Version) {
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

function summarizeProject(project: Project) {
  return {
    id: project.id,
    slug: project.slug,
    title: project.title,
    project_type: project.project_type,
  };
}

function summarizeVersion(version: Labrinth.Versions.v2.Version) {
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
