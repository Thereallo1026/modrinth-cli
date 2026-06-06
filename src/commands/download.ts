import type { Command } from "commander";
import { z } from "zod";
import { download } from "@/lib/download-file";
import { destinationFor } from "@/lib/paths";
import { attributionFor, resolve } from "@/modrinth/projects";
import { pickDownload } from "@/modrinth/versions";
import { printJson, showError } from "@/output/json";
import { downloadCard, downloadResult, progressBar } from "@/output/terminal";

const downloadOptionsSchema = z.object({
  json: z.boolean().default(false),
  loader: z.string().optional(),
  output: z.string().default("."),
  release: z.string().optional(),
  type: z.enum(["release", "beta", "alpha"]).optional(),
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
    .option("--type <type>", "Build type: release, beta, or alpha.")
    .option(
      "--loader <loader>",
      "Mod loader, such as fabric, forge, quilt, or neoforge."
    )
    .option("-o, --output <path>", "Output directory or file path.", ".")
    .option("--json", "Write machine-readable JSON.")
    .action(async (project: string, options: unknown) => {
      const parsedOptions = downloadOptionsSchema.parse(options);

      try {
        const target = await pickDownload({
          project,
          gameVersion: parsedOptions.version,
          loader: parsedOptions.loader,
          modVersion: parsedOptions.release,
          type: parsedOptions.type,
        });
        const outputPath = destinationFor(
          parsedOptions.output,
          target.file.filename
        );
        const resolved = parsedOptions.json
          ? undefined
          : await resolve(target.project.id);
        const attribution = resolved
          ? await attributionFor(resolved.project)
          : undefined;

        if (!(parsedOptions.json || !resolved || !attribution)) {
          process.stdout.write(
            downloadCard(
              resolved.project,
              attribution,
              target.version.game_versions
            )
          );
        }

        let lastPercent: number | undefined;

        if (!parsedOptions.json) {
          process.stdout.write(`\r${progressBar(0)}`);
        }

        const downloaded = await download({
          url: target.file.url,
          outputPath,
          expectedSha512: target.file.hashes.sha512,
          onProgress: parsedOptions.json
            ? undefined
            : ({ percent }) => {
                if (percent === lastPercent) {
                  return;
                }

                lastPercent = percent;
                process.stdout.write(`\r${progressBar(percent)}`);
              },
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
          printJson(result);
          return;
        }

        if (lastPercent !== 100) {
          process.stdout.write(`\r${progressBar(100)}`);
        }

        process.stdout.write(`\n${downloadResult(downloaded.path)}`);
      } catch (error) {
        showError(error, parsedOptions.json);
      }
    });
}
