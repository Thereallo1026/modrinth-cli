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

interface DownloadConstraints {
  gameVersion?: string;
  loader?: string;
  type?: Labrinth.Versions.v2.VersionType;
}

export interface DownloadTarget {
  file: Labrinth.Versions.v2.VersionFile;
  project: ReturnType<typeof projectSummary>;
  version: ReturnType<typeof versionSummary>;
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
    fullVersion: version,
  };
}

async function pickDependencyVersion(
  dep: Labrinth.Versions.v2.Dependency,
  projectId: string | undefined,
  constraints: DownloadConstraints,
  warn: (message: string) => void
): Promise<{
  depVersion: Labrinth.Versions.v2.Version;
  target: DownloadTarget;
} | null> {
  let depVersion: Labrinth.Versions.v2.Version;

  if ("version_id" in dep && dep.version_id) {
    depVersion = await modrinthClient.labrinth.versions_v2.getVersion(
      dep.version_id
    );
  } else if (projectId) {
    const listed = await modrinthClient.labrinth.versions_v2.getProjectVersions(
      projectId,
      {
        game_versions: constraints.gameVersion
          ? [constraints.gameVersion]
          : undefined,
        loaders: constraints.loader ? [constraints.loader] : undefined,
        include_changelog: false,
        limit: 100,
        offset: 0,
      }
    );
    const filtered = constraints.type
      ? listed.filter((v) => v.version_type === constraints.type)
      : listed;
    depVersion = chooseVersion(filtered);
  } else {
    warn("Skipping dependency with no project_id or version_id.");
    return null;
  }

  const depResolved = await resolve(depVersion.project_id);
  const target: DownloadTarget = {
    project: projectSummary(depResolved.project),
    version: versionSummary(depVersion),
    file: chooseFile(depVersion),
  };

  return { depVersion, target };
}

interface WalkContext {
  constraints: DownloadConstraints;
  results: DownloadTarget[];
  seen: Set<string>;
  warn: (message: string) => void;
}

async function walkDep(
  dep: Labrinth.Versions.v2.Dependency,
  ctx: WalkContext
): Promise<void> {
  const projectId = "project_id" in dep ? dep.project_id : undefined;

  if (projectId && ctx.seen.has(projectId)) {
    return;
  }

  if (projectId) {
    ctx.seen.add(projectId);
  }

  try {
    const resolved = await pickDependencyVersion(
      dep,
      projectId,
      ctx.constraints,
      ctx.warn
    );

    if (!resolved) {
      return;
    }

    const resolvedProjectId = resolved.depVersion.project_id;

    if (resolvedProjectId !== projectId) {
      if (ctx.seen.has(resolvedProjectId)) {
        return;
      }

      ctx.seen.add(resolvedProjectId);
    }

    ctx.results.push(resolved.target);
    await walkVersion(resolved.depVersion, ctx);
  } catch (error) {
    const label =
      "version_id" in dep && dep.version_id
        ? dep.version_id
        : (projectId ?? "unknown");
    ctx.warn(
      `Could not resolve dependency "${label}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

async function walkVersion(
  version: Labrinth.Versions.v2.Version,
  ctx: WalkContext
): Promise<void> {
  const required = version.dependencies.filter(
    (dep) => dep.dependency_type === "required"
  );

  for (const dep of required) {
    await walkDep(dep, ctx);
  }
}

export async function resolveDependencies(
  rootVersion: Labrinth.Versions.v2.Version,
  constraints: DownloadConstraints,
  warn: (message: string) => void
): Promise<DownloadTarget[]> {
  const ctx: WalkContext = {
    constraints,
    results: [],
    seen: new Set<string>([rootVersion.project_id]),
    warn,
  };

  await walkVersion(rootVersion, ctx);
  return ctx.results;
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
