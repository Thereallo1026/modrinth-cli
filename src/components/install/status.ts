import { bold } from "@/components/tui/style";

export function packageStatus(name: string, current: number, total: number) {
  return `📦 ${name}... [${bold(String(current))}/${bold(String(total))}]`;
}
