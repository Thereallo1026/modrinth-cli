import { bold, gray } from "@/components/tui/style";

export function projectCell(title: string, slug: string) {
  return `${bold(title)} ${gray(slug)}`;
}
