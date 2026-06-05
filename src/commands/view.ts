import type { Command } from "commander";
import { z } from "zod";
import { getProjectAttribution, resolveProject } from "@/modrinth/projects";
import { listProjectVersions } from "@/modrinth/versions";
import { renderError, writeJson } from "@/output/json";
import { formatProjectView, formatVersionTable } from "@/output/terminal";

const viewOptionsSchema = z.object({
  json: z.boolean().default(false),
  loader: z.string().optional(),
  version: z.string().optional(),
});

export function registerViewCommand(program: Command) {
  program
    .command("view")
    .description("View a Modrinth project.")
    .argument("<project>", "Project slug, project ID, or search name.")
    .option("--version <version>", "Minecraft game version.")
    .option("--loader <loader>", "Mod loader.")
    .option("--json", "Write machine-readable JSON.")
    .action(async (project: string, options: unknown) => {
      const parsedOptions = viewOptionsSchema.parse(options);

      try {
        if (parsedOptions.version) {
          const listed = await listProjectVersions({
            project,
            gameVersion: parsedOptions.version,
            loader: parsedOptions.loader,
          });

          if (parsedOptions.json) {
            writeJson(listed);
            return;
          }

          process.stdout.write(
            formatVersionTable(listed.project, listed.versions)
          );
          return;
        }

        const resolved = await resolveProject(project);
        const attribution = await getProjectAttribution(resolved.project);

        if (parsedOptions.json) {
          writeJson({ ...resolved, attribution });
          return;
        }

        process.stdout.write(formatProjectView(resolved.project, attribution));
      } catch (error) {
        renderError(error, parsedOptions.json);
      }
    });
}
