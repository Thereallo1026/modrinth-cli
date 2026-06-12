import { bold, italic, muted } from "@/components/tui/style";
import { versionRange } from "@/components/tui/versions";
import type { Project } from "@/modrinth/projects";

export function installCard(
  project: Pick<Project, "description" | "title">,
  attribution: string,
  gameVersions: string[]
) {
  const heading = `${bold(project.title)} by ${italic(attribution)} ${muted(`(${versionRange(gameVersions)})`)}`;

  return `${heading}\n${project.description}\n\n`;
}
