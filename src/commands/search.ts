import type { Command } from "commander";
import { z } from "zod";
import { searchProjects } from "@/modrinth/projects";
import { renderError, writeJson } from "@/output/json";
import { formatSearchTable } from "@/output/terminal";

const searchOptionsSchema = z.object({
  type: z.string().default("mod"),
  loader: z.string().optional(),
  version: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  json: z.boolean().default(false),
});

export function registerSearchCommand(program: Command) {
  program
    .command("search")
    .description("Search Modrinth projects.")
    .argument("<query>", "Search query.")
    .option("--type <type>", "Project type.", "mod")
    .option("--loader <loader>", "Mod loader.")
    .option("--version <version>", "Minecraft game version.")
    .option("--limit <count>", "Maximum result count.", "10")
    .option("--json", "Write machine-readable JSON.")
    .action(async (query: string, options: unknown) => {
      const parsedOptions = searchOptionsSchema.parse(options);

      try {
        const results = await searchProjects({
          query,
          projectType: parsedOptions.type,
          loader: parsedOptions.loader,
          gameVersion: parsedOptions.version,
          limit: parsedOptions.limit,
        });

        if (parsedOptions.json) {
          writeJson(results);
          return;
        }

        process.stdout.write(formatSearchTable(results.hits));
      } catch (error) {
        renderError(error, parsedOptions.json);
      }
    });
}
