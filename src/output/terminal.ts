import type { Project, SearchHit } from "@/modrinth/projects";
import type { OwnedProject } from "@/modrinth/users";
import type { Version } from "@/modrinth/versions";
import { knownLoader, loaderInfo } from "./loaders";
import { versionRange } from "./versions";

interface PageInfo {
  gameVersion?: string;
  limit: number;
  loader?: string;
  page: number;
  total?: number;
}

interface OwnerInfo {
  bio?: string;
  id: string;
  kind: "organization" | "user";
  name?: string;
  role?: string;
  slug: string;
}

const DOWNLOADS_FORMATTER = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function searchTable(hits: SearchHit[], page: PageInfo) {
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

export function projectCard(project: Project, attribution: string) {
  const heading = `${bold(project.title)} by ${italic(attribution)} ${muted(`(${versionRange(project.game_versions)})`)}`;
  const loaders = loaderNames(project.loaders, " • ");
  const stats = muted(
    `${DOWNLOADS_FORMATTER.format(project.downloads)} downloads • ${DOWNLOADS_FORMATTER.format(project.followers)} followers • ${project.slug}`
  );

  return `${heading}\n${loaders}\n${project.description}\n${stats}\n`;
}

export function downloadCard(
  project: Pick<Project, "description" | "title">,
  attribution: string,
  gameVersions: string[]
) {
  const heading = `${bold(project.title)} by ${italic(attribution)} ${muted(`(${versionRange(gameVersions)})`)}`;

  return `${heading}\n${project.description}\n\n`;
}

export function progressBar(percent?: number) {
  if (percent === undefined) {
    return `${muted("Downloading...")}`;
  }

  const width = 40;
  const filled = Math.min(
    width,
    Math.max(0, Math.round((percent / 100) * width))
  );
  const empty = width - filled;

  return `${colorize("▰".repeat(filled), 45)}${muted("▱".repeat(empty))} ${bold(`${percent}%`)}`;
}

export function downloadResult(path: string) {
  return `${badge(`Saved ${path}`)}\n`;
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

  return `${versionTitle(project.title, page)}\n${table(
    ["Name", "Version", "Loaders", "Type", "Published"],
    rows
  )}${footer}`;
}

function versionTitle(title: string, page?: PageInfo) {
  const parts = [bold(title)];

  if (page?.gameVersion) {
    parts.push(page.gameVersion);
  }

  if (page?.loader) {
    parts.push(`on ${loaderName(page.loader)}`);
  } else {
    parts.push("builds");
  }

  return parts.join(" ");
}

function projectCell(title: string, slug: string) {
  return `${bold(title)} ${badge(slug)}`;
}

function table(headers: string[], rows: string[][]) {
  const allRows = [headers, ...rows];
  const widths = headers.map((_, columnIndex) =>
    Math.max(...allRows.map((row) => visibleLength(row[columnIndex] ?? "")))
  );
  const formattedRows = allRows.map((row, rowIndex) =>
    row
      .map((cell, columnIndex) =>
        padCell(rowIndex === 0 ? bold(cell) : cell, widths[columnIndex] ?? 0)
      )
      .join("  ")
      .trimEnd()
  );
  const divider = widths.map((width) => muted("─".repeat(width))).join("  ");

  return `${formattedRows[0]}\n${divider}\n${formattedRows.slice(1).join("\n")}\n`;
}

function loaderNames(loaders: string[], separator = "  ") {
  const loaderNames = loaders.filter(knownLoader);
  const displayLoaders = loaderNames.length > 0 ? loaderNames : loaders;

  return displayLoaders.map(loaderName).join(separator);
}

function loaderBadges(loaders: string[]) {
  const loaderNames = loaders.filter(knownLoader);
  const displayLoaders = loaderNames.length > 0 ? loaderNames : loaders;

  return displayLoaders.map(loaderBadge).join(" ");
}

function loaderName(loader: string) {
  const info = loaderInfo(loader);
  const label = info?.label ?? titleCase(loader);

  if (!info) {
    return label;
  }

  return colorize(label, info.color);
}

function loaderBadge(loader: string) {
  const info = loaderInfo(loader);
  const label = info?.badge ?? titleCase(loader);

  if (!info) {
    return label;
  }

  return colorize(label, info.color);
}

function date(value: string) {
  return value.slice(0, 10);
}

function titleCase(value: string) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function padCell(value: string, width: number) {
  return `${value}${" ".repeat(Math.max(0, width - visibleLength(value)))}`;
}

function visibleLength(value: string) {
  let length = 0;

  for (let index = 0; index < value.length; index += 1) {
    if (value.charCodeAt(index) === 27 && value[index + 1] === "[") {
      index += 2;

      while (index < value.length && value[index] !== "m") {
        index += 1;
      }

      continue;
    }

    length += 1;
  }

  return length;
}

function bold(value: string) {
  return style(value, "1");
}

function italic(value: string) {
  return style(value, "3");
}

function muted(value: string) {
  return style(value, "2");
}

function badge(value: string) {
  return style(` ${value} `, "90;40");
}

function pageBadge(page: PageInfo, itemCount: number) {
  const totalPages = page.total
    ? Math.max(1, Math.ceil(page.total / page.limit))
    : undefined;
  const pageText = totalPages
    ? `Page ${pageBadgeNumber(page.page)} of ${pageBadgeNumber(totalPages)}`
    : `Page ${pageBadgeNumber(page.page)}`;
  const itemText = `${pageBadgeNumber(itemCount)} ${itemCount === 1 ? "Item" : "Items"}`;

  return badge(`${pageText} • ${itemText}`);
}

function pageBadgeNumber(value: number) {
  return style(String(value), "1;37;40");
}

function colorize(value: string, color: number) {
  return style(value, `38;5;${color}`);
}

function style(value: string, code: string) {
  if (process.env.NO_COLOR) {
    return value;
  }

  return `\u001b[${code}m${value}\u001b[0m`;
}
