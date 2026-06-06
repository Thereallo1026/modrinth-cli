import { lstatSync } from "node:fs";
import { join, resolve } from "node:path";

export function destinationFor(output: string, filename: string) {
  const resolved = resolve(output);

  try {
    if (lstatSync(resolved).isDirectory()) {
      return join(resolved, filename);
    }
  } catch {
    if (output === ".") {
      return join(resolved, filename);
    }
  }

  return resolved;
}
