import { isAbsolute, relative, resolve, sep } from "node:path";

import { CliError } from "@/lib/errors";

export function packPath(root: string, path: string) {
  if (isAbsolute(path)) {
    throw new CliError(
      "INVALID_PACKWIZ_PATH",
      "Packwiz paths must be relative.",
      {
        path,
      }
    );
  }

  const resolvedRoot = resolve(root);
  const resolvedPath = resolve(resolvedRoot, path);
  const relativePath = relative(resolvedRoot, resolvedPath);

  if (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new CliError(
      "INVALID_PACKWIZ_PATH",
      "Packwiz path escapes the pack root.",
      { path }
    );
  }

  return resolvedPath;
}
