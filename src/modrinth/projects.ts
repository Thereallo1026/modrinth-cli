import type { Labrinth } from "@modrinth/api-client";

import { CliError } from "@/lib/errors";

import { modrinthClient } from "./client";

interface SearchProjectsInput {
  gameVersion?: string;
  limit?: number;
  loader?: string;
  offset?: number;
  projectType?: string;
  query: string;
}

export function search(input: SearchProjectsInput) {
  return modrinthClient.labrinth.projects_v2.search({
    query: input.query,
    facets: facetsFor(input),
    limit: input.limit ?? 10,
    offset: input.offset,
  });
}

export function members(project: string) {
  return modrinthClient.labrinth.projects_v3.getMembers(project);
}

export async function attributionFor(project: Project) {
  const results = await search({
    query: project.slug,
    limit: 10,
  });
  const hit = results.hits.find(
    (candidate) => candidate.project_id === project.id
  );

  if (!hit) {
    return "Unknown";
  }

  if ("organization" in hit && typeof hit.organization === "string") {
    return hit.organization;
  }

  return hit.author;
}

export async function resolve(project: string) {
  try {
    const directProject =
      await modrinthClient.labrinth.projects_v2.get(project);

    return {
      resolution: "direct",
      project: directProject,
      candidates: [],
    };
  } catch {
    const results = await search({
      query: project,
      projectType: "mod",
      limit: 5,
    });
    const bestHit = results.hits[0];

    if (!bestHit) {
      throw new CliError(
        "PROJECT_NOT_FOUND",
        `No Modrinth project matched "${project}".`,
        {
          query: project,
        }
      );
    }

    const resolvedProject = await modrinthClient.labrinth.projects_v2.get(
      bestHit.project_id
    );

    return {
      resolution: "search",
      project: resolvedProject,
      candidates: results.hits,
    };
  }
}

function facetsFor(input: SearchProjectsInput) {
  const facets: string[][] = [];

  if (input.projectType) {
    facets.push([`project_type:${input.projectType}`]);
  }

  if (input.loader) {
    facets.push([`categories:${input.loader}`]);
  }

  if (input.gameVersion) {
    facets.push([`versions:${input.gameVersion}`]);
  }

  return facets;
}

export type Project = Labrinth.Projects.v2.Project;
export type SearchHit = Labrinth.Projects.v2.SearchResultHit;
export type TeamMember = Labrinth.Projects.v3.TeamMember;
