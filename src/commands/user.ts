import type { Command } from "commander";
import { z } from "zod";
import { getUser } from "@/modrinth/users";
import { renderError, writeJson } from "@/output/json";

const userOptionsSchema = z.object({
  json: z.boolean().default(false),
});

export function registerUserCommand(program: Command) {
  program
    .command("user")
    .description("View a Modrinth user.")
    .argument("<name>", "Username or user ID.")
    .option("--json", "Write machine-readable JSON.")
    .action(async (name: string, options: unknown) => {
      const parsedOptions = userOptionsSchema.parse(options);

      try {
        const user = await getUser(name);

        if (parsedOptions.json) {
          writeJson(user);
          return;
        }

        process.stdout.write(`${user.username}\t${user.id}\n`);
      } catch (error) {
        renderError(error, parsedOptions.json);
      }
    });
}
