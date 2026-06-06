import type { Command } from "commander";
import { z } from "zod";
import { offsetFor, pageOptions } from "@/lib/page";
import { userProjects } from "@/modrinth/users";
import { printJson, showError } from "@/output/json";
import { ownedProjectsTable, ownerCard } from "@/output/terminal";

const userOptionsSchema = z.object({
  json: z.boolean().default(false),
  limit: pageOptions.limit,
  page: pageOptions.page,
});

export function registerUserCommand(program: Command) {
  program
    .command("user")
    .description("View a Modrinth user or organization.")
    .argument(
      "<name>",
      "Username, user ID, organization slug, or organization ID."
    )
    .option("--limit <count>", "Maximum project count.", "10")
    .option("--page <page>", "Project page.", "1")
    .option("--json", "Write machine-readable JSON.")
    .action(async (name: string, options: unknown) => {
      const parsedOptions = userOptionsSchema.parse(options);

      try {
        const result = await userProjects({
          limit: parsedOptions.limit,
          name,
          offset: offsetFor(parsedOptions.page, parsedOptions.limit),
        });

        if (parsedOptions.json) {
          printJson(result);
          return;
        }

        process.stdout.write(
          `${ownerCard(result.owner, result.total)}\n${ownedProjectsTable(
            result.projects,
            {
              limit: parsedOptions.limit,
              page: parsedOptions.page,
              total: result.total,
            }
          )}`
        );
      } catch (error) {
        showError(error, parsedOptions.json);
      }
    });
}
