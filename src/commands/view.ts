import type { Command } from "commander";
import { z } from "zod";
import { offsetFor, pageOptions } from "@/lib/page";
import { attributionFor, resolve } from "@/modrinth/projects";
import { versionsFor } from "@/modrinth/versions";
import { printJson, showError } from "@/output/json";
import { projectCard, versionTable } from "@/output/terminal";

const viewOptionsSchema = z.object({
  json: z.boolean().default(false),
  limit: pageOptions.limit,
  loader: z.string().optional(),
  page: pageOptions.page,
  type: z.enum(["release", "beta", "alpha"]).optional(),
  version: z.string().optional(),
});

export function registerViewCommand(program: Command) {
  program
    .command("view")
    .description("View a Modrinth project.")
    .argument("<project>", "Project slug, project ID, or search name.")
    .option("--version <version>", "Minecraft game version.")
    .option("--loader <loader>", "Mod loader.")
    .option("--type <type>", "Build type: release, beta, or alpha.")
    .option("--limit <count>", "Maximum build count.", "10")
    .option("--page <page>", "Build page.", "1")
    .option("--json", "Write machine-readable JSON.")
    .action(async (project: string, options: unknown) => {
      const parsedOptions = viewOptionsSchema.parse(options);

      try {
        const resolved = await resolve(project);
        const attribution = await attributionFor(resolved.project);
        const listed = await versionsFor({
          project: resolved.project.id,
          gameVersion: parsedOptions.version,
          loader: parsedOptions.loader,
          limit: parsedOptions.limit,
          offset: offsetFor(parsedOptions.page, parsedOptions.limit),
          type: parsedOptions.type,
        });

        if (parsedOptions.json) {
          printJson({ ...resolved, attribution, builds: listed.versions });
          return;
        }

        process.stdout.write(
          projectCard(resolved.project, attribution) +
            "\n" +
            versionTable(listed.project, listed.versions, {
              gameVersion: parsedOptions.version,
              limit: parsedOptions.limit,
              loader: parsedOptions.loader,
              page: parsedOptions.page,
            })
        );
      } catch (error) {
        showError(error, parsedOptions.json);
      }
    });
}
