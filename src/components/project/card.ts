import { DOWNLOADS_FORMATTER } from "@/components/tui/format";
import { loaderNames } from "@/components/tui/loader-list";
import { bold, italic, muted } from "@/components/tui/style";
import { versionRange } from "@/components/tui/versions";
import type { Project } from "@/modrinth/projects";

export function projectCard(project: Project, attribution: string) {
  const heading = `${bold(project.title)} by ${italic(attribution)} ${muted(`(${versionRange(project.game_versions)})`)}`;
  const loaders = loaderNames(project.loaders, " • ");
  const stats = muted(
    `${DOWNLOADS_FORMATTER.format(project.downloads)} downloads • ${DOWNLOADS_FORMATTER.format(project.followers)} followers • ${project.slug}`
  );

  return `${heading}\n${loaders}\n${project.description}\n${stats}\n`;
}
