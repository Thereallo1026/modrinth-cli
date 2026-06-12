import { gray, style } from "@/components/tui/style";

export function timedPackwizLine(milliseconds: number, file: string) {
  return `${gray(`[${milliseconds.toFixed(2)}ms] parsed packwiz file from `)}${style(file, "32")}`;
}
