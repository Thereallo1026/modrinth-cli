import type { Labrinth } from "@modrinth/api-client";
import { CliError } from "@/lib/errors";
import { modrinthClient } from "./client";

export function user(name: string) {
  return modrinthClient.labrinth.users_v2.get(name);
}

interface UserProjectsInput {
  limit: number;
  name: string;
  offset: number;
}

export async function userProjects(input: UserProjectsInput) {
  try {
    const resolvedUser = await user(input.name);
    const projects = await modrinthClient.labrinth.users_v2.getProjects(
      resolvedUser.id
    );

    return {
      owner: {
        bio: resolvedUser.bio,
        id: resolvedUser.id,
        kind: "user" as const,
        name: resolvedUser.name,
        role: resolvedUser.role,
        slug: resolvedUser.username,
      },
      projects: page(projects, input),
      total: projects.length,
    };
  } catch {
    try {
      const organization = await modrinthClient.labrinth.organizations_v3.get(
        input.name
      );
      const organizationProjects =
        await modrinthClient.labrinth.organizations_v3.getProjects(
          organization.id
        );
      const projects = await modrinthClient.labrinth.projects_v2.getMultiple(
        organizationProjects.map((project) => project.id)
      );

      return {
        owner: {
          bio: organization.description,
          id: organization.id,
          kind: "organization" as const,
          name: organization.name,
          slug: organization.slug,
        },
        projects: page(projects, input),
        total: projects.length,
      };
    } catch {
      throw new CliError(
        "USER_NOT_FOUND",
        `No Modrinth user or organization matched "${input.name}".`,
        {
          query: input.name,
        }
      );
    }
  }
}

export type OwnedProject = Labrinth.Projects.v2.Project;

function page(projects: OwnedProject[], input: UserProjectsInput) {
  return projects
    .toSorted((first, second) => second.downloads - first.downloads)
    .slice(input.offset, input.offset + input.limit);
}
