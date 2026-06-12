import { bold, gray } from "@/components/tui/style";

export function commandHeader(command: string, version: string) {
  return `${bold(`modrinth ${command}`)} ${gray(`v${version}`)}\n\n`;
}
