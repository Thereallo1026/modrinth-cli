import type { Command } from "commander";
import { z } from "zod";
import { downloadFile } from "@/lib/download-file";
import { resolveOutputPath } from "@/lib/paths";
import { findDownloadTarget } from "@/modrinth/versions";
import { renderError, writeJson } from "@/output/json";

const downloadOptionsSchema = z.object({
  json: z.boolean().default(false),
  loader: z.string().optional(),
  output: z.string().default("."),
  release: z.string().optional(),
  version: z.string().optional(),
});

export function registerDownloadCommand(program: Command) {
  program
    .command("download")
    .description(
      "Download the best matching project file into the current directory."
    )
    .argument("<project>", "Project slug, project ID, or search name.")
    .option("--version <version>", "Minecraft game version.")
    .option(
      "--release <release>",
      "Exact Modrinth version ID, number, or name."
    )
    .option(
      "--loader <loader>",
      "Mod loader, such as fabric, forge, quilt, or neoforge."
    )
    .option("-o, --output <path>", "Output directory or file path.", ".")
    .option("--json", "Write machine-readable JSON.")
    .action(async (project: string, options: unknown) => {
      const parsedOptions = downloadOptionsSchema.parse(options);

      try {
        const target = await findDownloadTarget({
          project,
          gameVersion: parsedOptions.version,
          loader: parsedOptions.loader,
          modVersion: parsedOptions.release,
        });
        const outputPath = resolveOutputPath(
          parsedOptions.output,
          target.file.filename
        );
        const downloaded = await downloadFile({
          url: target.file.url,
          outputPath,
          expectedSha512: target.file.hashes.sha512,
        });
        const result = {
          project: target.project,
          version: target.version,
          file: target.file,
          path: downloaded.path,
          bytes: downloaded.bytes,
          sha512: downloaded.sha512,
        };

        if (parsedOptions.json) {
          writeJson(result);
          return;
        }

        process.stdout.write(`${downloaded.path}\n`);
      } catch (error) {
        renderError(error, parsedOptions.json);
      }
    });
}
