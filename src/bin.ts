#!/usr/bin/env node

import { Command } from "commander";
import { registerDownloadCommand } from "@/commands/download";
import { registerSearchCommand } from "@/commands/search";
import { registerUserCommand } from "@/commands/user";
import { registerViewCommand } from "@/commands/view";
import { version } from "../package.json";

const program = new Command();

program
  .name("modrinth")
  .description(
    "Modrinth for agents, scripts, and terminal-native Minecraft workflows."
  )
  .version(version, "-V, --cli-version", "output the CLI version");

registerSearchCommand(program);
registerDownloadCommand(program);
registerViewCommand(program);
registerUserCommand(program);

program.parse();
