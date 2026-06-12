#!/usr/bin/env node
import { Command } from "commander";

import { commandHeader } from "@/components/tui/header";
import { loadMinecraftVersions } from "@/components/tui/versions";
import { registerInstallCommand } from "@/commands/install";
import { registerSearchCommand } from "@/commands/search";
import { registerUserCommand } from "@/commands/user";
import { registerViewCommand } from "@/commands/view";

import { version } from "../package.json";

const program = new Command();

program
  .name("modrinth")
  .description("Minecraft mods for the terminal age.")
  .version(version, "-V, --cli-version", "output the CLI version");

program.hook("preAction", async (_command, actionCommand) => {
  if (actionCommand.opts().json) {
    return;
  }

  process.stdout.write(commandHeader(actionCommand.name(), version));
  await loadMinecraftVersions();
});

registerSearchCommand(program);
registerInstallCommand(program);
registerViewCommand(program);
registerUserCommand(program);

program.parse();
