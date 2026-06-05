import type { Project, SearchHit } from "@/modrinth/projects";
import type { Version } from "@/modrinth/versions";

const DOWNLOADS_FORMATTER = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const LOADER_COLORS = new Map([
  ["fabric", 45],
  ["forge", 196],
  ["neoforge", 208],
  ["quilt", 141],
  ["paper", 229],
  ["spigot", 214],
  ["bukkit", 34],
]);
const KNOWN_LOADERS = new Set(LOADER_COLORS.keys());

export function formatSearchTable(hits: SearchHit[]) {
  if (hits.length === 0) {
    return `${muted("No projects found.")}\n`;
  }

  const rows = hits.map((hit) => [
    bold(hit.title),
    hit.author,
    hit.slug,
    formatLoaderList(hit.categories),
    DOWNLOADS_FORMATTER.format(hit.downloads),
  ]);

  return renderTable(
    ["Project", "Author", "Slug", "Loaders", "Downloads"],
    rows
  );
}

export function formatProjectView(project: Project, attribution: string) {
  const versionRange = formatVersionRange(project.game_versions);
  const heading = `${bold(project.title)} by ${italic(attribution)} ${muted(`(${versionRange})`)}`;
  const loaders = formatLoaderList(project.loaders);
  const stats = muted(
    `${DOWNLOADS_FORMATTER.format(project.downloads)} downloads • ${DOWNLOADS_FORMATTER.format(project.followers)} followers • ${project.slug}`
  );

  return `${heading}\n${loaders}\n${project.description}\n${stats}\n`;
}

export function formatVersionTable(
  project: Pick<Project, "slug" | "title">,
  versions: Version[]
) {
  if (versions.length === 0) {
    return `${muted(`No versions found for ${project.slug}.`)}\n`;
  }

  const rows = versions.map((version) => [
    bold(version.version_number),
    version.name,
    formatLoaderList(version.loaders),
    version.game_versions.join(", "),
    version.version_type,
    formatDate(version.date_published),
  ]);

  return `${bold(project.title)} versions\n${renderTable(
    ["Version", "Name", "Loaders", "Minecraft", "Type", "Published"],
    rows
  )}`;
}

function renderTable(headers: string[], rows: string[][]) {
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

function formatLoaderList(loaders: string[]) {
  const loaderNames = loaders.filter((loader) => KNOWN_LOADERS.has(loader));
  const displayLoaders = loaderNames.length > 0 ? loaderNames : loaders;

  return displayLoaders.map(formatLoaderName).join(" ");
}

function formatLoaderName(loader: string) {
  const normalizedLoader = loader.toLowerCase();
  const color = LOADER_COLORS.get(normalizedLoader);
  const label =
    normalizedLoader === "neoforge" ? "NeoForge" : toTitleCase(loader);

  if (!color) {
    return label;
  }

  return colorize(label, color);
}

function formatVersionRange(versions: string[]) {
  const gameVersions = versions.filter((version) => version.startsWith("1."));

  if (gameVersions.length === 0) {
    return "unknown versions";
  }

  const first = gameVersions[0];
  const last = gameVersions.at(-1);

  return first === last ? first : `${first} - ${last}`;
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function toTitleCase(value: string) {
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

function colorize(value: string, color: number) {
  return style(value, `38;5;${color}`);
}

function style(value: string, code: string) {
  if (process.env.NO_COLOR) {
    return value;
  }

  return `\u001b[${code}m${value}\u001b[0m`;
}
