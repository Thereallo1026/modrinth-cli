import { bold, muted, visibleLength } from "@/components/tui/style";

export function table(headers: string[], rows: string[][]) {
  const allRows = [headers, ...rows];
  const widths = headers.map((_, columnIndex) =>
    Math.max(...allRows.map((row) => visibleLength(row[columnIndex] ?? "")))
  );
  const formattedRows = allRows.map((row, rowIndex) =>
    row
      .map((cell, columnIndex) =>
        pad(rowIndex === 0 ? bold(cell) : cell, widths[columnIndex] ?? 0)
      )
      .join("  ")
      .trimEnd()
  );
  const divider = widths.map((width) => muted("─".repeat(width))).join("  ");

  return `${formattedRows[0]}\n${divider}\n${formattedRows.slice(1).join("\n")}\n`;
}

function pad(value: string, width: number) {
  return `${value}${" ".repeat(Math.max(0, width - visibleLength(value)))}`;
}
