import { badge, style } from "@/components/tui/style";

export interface PageInfo {
  gameVersion?: string;
  limit: number;
  loader?: string;
  page: number;
  total?: number;
}

export function pageBadge(page: PageInfo, itemCount: number) {
  const totalPages = page.total
    ? Math.max(1, Math.ceil(page.total / page.limit))
    : undefined;
  const pageText = totalPages
    ? `Page ${pageNumber(page.page)} of ${pageNumber(totalPages)}`
    : `Page ${pageNumber(page.page)}`;
  const itemText = `${pageNumber(itemCount)} ${itemCount === 1 ? "Item" : "Items"}`;

  return badge(`${pageText} • ${itemText}`);
}

function pageNumber(value: number) {
  return style(String(value), "1;37;40");
}
