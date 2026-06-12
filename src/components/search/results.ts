import { DOWNLOADS_FORMATTER } from "@/components/tui/format";
import { loaderBadges } from "@/components/tui/loader-list";
import { type PageInfo, pageBadge } from "@/components/tui/page";
import { projectCell } from "@/components/tui/project-cell";
import { muted } from "@/components/tui/style";
import { table } from "@/components/tui/table";
import { versionRange } from "@/components/tui/versions";
import type { SearchHit } from "@/modrinth/projects";

export function searchResults(hits: SearchHit[], page: PageInfo) {
  if (hits.length === 0) {
    return `${muted("No projects found.")}\n${pageBadge(page, 0)}\n`;
  }

  const rows = hits.map((hit) => [
    projectCell(hit.title, hit.slug ?? hit.project_id),
    hit.author ?? "Unknown",
    loaderBadges(hit.categories),
    versionRange(hit.versions ?? []),
    DOWNLOADS_FORMATTER.format(hit.downloads),
  ]);

  return `${table(["Project", "Author", "Loaders", "Versions", "Downloads"], rows)}${pageBadge(page, hits.length)}\n`;
}
