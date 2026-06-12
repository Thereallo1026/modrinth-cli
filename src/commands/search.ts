import type { Command } from "commander";
import { z } from "zod";

import { searchResults } from "@/components/search/results";
import { offsetFor, pageOptions } from "@/lib/page";
import { search } from "@/modrinth/projects";
import { printJson, showError } from "@/output/json";

const searchOptionsSchema = z.object({
  json: z.boolean().default(false),
  loader: z.string().optional(),
  limit: pageOptions.limit,
  page: pageOptions.page,
  type: z.string().default("mod"),
  version: z.string().optional(),
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
    .option("--page <page>", "Result page.", "1")
    .option("--json", "Write machine-readable JSON.")
    .action(async (query: string, options: unknown) => {
      const parsedOptions = searchOptionsSchema.parse(options);

      try {
        const results = await search({
          query,
          projectType: parsedOptions.type,
          loader: parsedOptions.loader,
          gameVersion: parsedOptions.version,
          limit: parsedOptions.limit,
          offset: offsetFor(parsedOptions.page, parsedOptions.limit),
        });

        if (parsedOptions.json) {
          printJson(results);
          return;
        }

        process.stdout.write(
          searchResults(results.hits, {
            limit: parsedOptions.limit,
            page: parsedOptions.page,
            total: results.total_hits,
          })
        );
      } catch (error) {
        showError(error, parsedOptions.json);
      }
    });
}
