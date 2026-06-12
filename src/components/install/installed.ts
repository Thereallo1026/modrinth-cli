import { bold, gray, style } from "@/components/tui/style";

export interface InstalledEntry {
  name: string;
  version: string;
}

export function installedList(entries: InstalledEntry[]) {
  return entries
    .map(
      (entry) =>
        `${style("+", "32")} ${bold(entry.name)}${gray(`@${entry.version}`)}`
    )
    .join("\n");
}

export function installedSummary(count: number, seconds: number) {
  const label = count === 1 ? "mod" : "mods";

  return `${style(String(count), "32")} ${label} installed ${gray(`[${seconds.toFixed(2)}s]`)}`;
}
