import { loaderNames } from "@/components/tui/loader-list";
import { type PageInfo, pageBadge } from "@/components/tui/page";
import { muted } from "@/components/tui/style";
import { table } from "@/components/tui/table";
import { versionRange } from "@/components/tui/versions";
import type { Project } from "@/modrinth/projects";
import type { Version } from "@/modrinth/versions";

export function versionTable(
  project: Pick<Project, "slug" | "title">,
  versions: Version[],
  page?: PageInfo
) {
  if (versions.length === 0) {
    const footer = page ? `${pageBadge(page, 0)}\n` : "";

    return `${muted(`No versions found for ${project.slug}.`)}\n${footer}`;
  }

  const rows = versions.map((version) => [
    version.name,
    versionRange(version.game_versions),
    loaderNames(version.loaders, " "),
    version.version_type,
    date(version.date_published),
  ]);

  const footer = page ? `${pageBadge(page, versions.length)}\n` : "";

  return `${table(["Name", "Version", "Loaders", "Type", "Published"], rows)}${footer}`;
}

function date(value: string) {
  return value.slice(0, 10);
}
