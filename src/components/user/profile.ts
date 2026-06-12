import { DOWNLOADS_FORMATTER } from "@/components/tui/format";
import { loaderBadges } from "@/components/tui/loader-list";
import { type PageInfo, pageBadge } from "@/components/tui/page";
import { projectCell } from "@/components/tui/project-cell";
import { badge, bold, muted } from "@/components/tui/style";
import { table } from "@/components/tui/table";
import { versionRange } from "@/components/tui/versions";
import type { OwnedProject } from "@/modrinth/users";

interface OwnerInfo {
  bio?: string;
  id: string;
  kind: "organization" | "user";
  name?: string;
  role?: string;
  slug: string;
}

export function ownerCard(owner: OwnerInfo, totalProjects: number) {
  const displayName = owner.name ?? owner.slug;
  const kind = owner.kind === "organization" ? "organization" : "user";
  const role = owner.role ? ` • ${owner.role}` : "";
  const bio = owner.bio ? `${owner.bio}\n` : "";

  return `${bold(displayName)} ${badge(owner.slug)}\n${muted(`${kind}${role} • ${owner.id} • ${totalProjects} projects`)}\n${bio}`;
}

export function ownedProjectsTable(projects: OwnedProject[], page: PageInfo) {
  if (projects.length === 0) {
    return `${muted("No projects found.")}\n${pageBadge(page, 0)}\n`;
  }

  const rows = projects.map((project) => [
    projectCell(project.title, project.slug),
    project.project_type,
    loaderBadges(project.loaders),
    versionRange(project.game_versions),
    DOWNLOADS_FORMATTER.format(project.downloads),
  ]);

  return `${table(["Project", "Type", "Loaders", "Versions", "Downloads"], rows)}${pageBadge(page, projects.length)}\n`;
}
