import { existsSync, statSync } from "node:fs";
import { basename } from "node:path";

import type { Command } from "commander";
import { z } from "zod";

import { installCard } from "@/components/install/card";
import { timedPackwizLine } from "@/components/install/headers";
import {
  type InstalledEntry,
  installedList,
  installedSummary,
} from "@/components/install/installed";
import { packageStatus } from "@/components/install/status";
import { clearLine } from "@/components/tui/style";
import { parallelMap } from "@/lib/concurrency";
import { download } from "@/lib/download-file";
import { destinationFor } from "@/lib/paths";
import { attributionFor, resolve } from "@/modrinth/projects";
import {
  type DownloadTarget,
  pickDownload,
  resolveDependencies,
} from "@/modrinth/versions";
import { describePackwizInstalls } from "@/packwiz/modrinth";
import { loadPackwiz, type PackwizFile } from "@/packwiz/pack";
import { printJson, showError } from "@/output/json";

const installOptionsSchema = z.object({
  concurrency: z.coerce.number().int().min(1).max(64).default(8),
  json: z.boolean().default(false),
  loader: z.string().optional(),
  output: z.string().default("."),
  pack: z.string().optional(),
  release: z.string().optional(),
  type: z.enum(["release", "beta", "alpha"]).optional(),
  version: z.string().optional(),
});

interface InstalledFile {
  bytes: number;
  file: { filename: string; url: string; hashes: { sha512: string } };
  path: string;
  project: { id: string; slug: string; title: string };
  sha512: string;
  version: { id: string; version_number: string; game_versions: string[] };
}

interface PackwizInstalledFile {
  bytes: number;
  file: PackwizFile;
  path: string;
  sha512: string;
}

type InstallOptions = z.infer<typeof installOptionsSchema>;

async function installTarget(opts: {
  url: string;
  outputPath: string;
  sha512: string;
  project: InstalledFile["project"];
  version: InstalledFile["version"];
  file: InstalledFile["file"];
}): Promise<InstalledFile> {
  const result = await download({
    url: opts.url,
    outputPath: opts.outputPath,
    expectedSha512: opts.sha512,
  });

  return {
    project: opts.project,
    version: opts.version,
    file: opts.file,
    path: result.path,
    bytes: result.bytes,
    sha512: result.sha512,
  };
}

async function installPackwizFile(file: PackwizFile) {
  if (file.preserve && existsSync(file.destinationPath)) {
    const stats = statSync(file.destinationPath);

    return {
      file,
      path: file.destinationPath,
      bytes: stats.size,
      sha512: "",
    } satisfies PackwizInstalledFile;
  }

  const result = await download({
    url: file.url,
    outputPath: file.destinationPath,
    expectedHash: {
      format: file.hashFormat,
      value: file.hash,
    },
  });

  return {
    file,
    path: result.path,
    bytes: result.bytes,
    sha512: result.sha512,
  } satisfies PackwizInstalledFile;
}

function showPackageStatus(name: string, index: number, total: number) {
  process.stderr.write(`${clearLine()}${packageStatus(name, index, total)}`);
}

function clearPackageStatus() {
  process.stderr.write(clearLine());
}

function installModrinthTargets(
  targets: DownloadTarget[],
  opts: { concurrency: number; json: boolean; output: string }
) {
  let completed = 0;

  return parallelMap(targets, opts.concurrency, async (target) => {
    const result = await installTarget({
      url: target.file.url,
      outputPath: destinationFor(opts.output, target.file.filename),
      sha512: target.file.hashes.sha512,
      project: target.project,
      version: target.version,
      file: target.file,
    });

    completed += 1;

    if (!opts.json) {
      showPackageStatus(target.project.slug, completed, targets.length);
    }

    return result;
  });
}

function installPackwizFiles(
  files: PackwizFile[],
  opts: { concurrency: number; json: boolean }
) {
  let completed = 0;

  return parallelMap(files, opts.concurrency, async (file) => {
    try {
      const result = await installPackwizFile(file);
      completed += 1;

      if (!opts.json) {
        showPackageStatus(file.name, completed, files.length);
      }

      return result;
    } catch (error) {
      throw new Error(
        `Failed to install "${file.name}": ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });
}

function printInstallJson(
  mainResult: InstalledFile,
  depInstalls: InstalledFile[]
) {
  printJson({
    project: mainResult.project,
    version: mainResult.version,
    file: mainResult.file,
    path: mainResult.path,
    bytes: mainResult.bytes,
    sha512: mainResult.sha512,
    dependencies: depInstalls.map((d) => ({
      project: d.project,
      version: d.version,
      file: d.file,
      path: d.path,
      bytes: d.bytes,
      sha512: d.sha512,
    })),
  });
}

function showInstalled(entries: InstalledEntry[], startedAt: number) {
  const elapsedSeconds = (performance.now() - startedAt) / 1000;

  clearPackageStatus();
  process.stdout.write(
    `${installedList(entries)}\n\n${installedSummary(entries.length, elapsedSeconds)}\n`
  );
}

async function installProject(project: string, options: InstallOptions) {
  const constraints = {
    gameVersion: options.version,
    loader: options.loader,
    type: options.type,
  };
  const startedAt = performance.now();

  try {
    const target = await pickDownload({
      project,
      gameVersion: options.version,
      loader: options.loader,
      modVersion: options.release,
      type: options.type,
    });

    const resolved = options.json
      ? undefined
      : await resolve(target.project.id);
    const attribution = resolved
      ? await attributionFor(resolved.project)
      : undefined;

    if (!(options.json || !resolved || !attribution)) {
      process.stdout.write(
        installCard(resolved.project, attribution, target.version.game_versions)
      );
    }

    const depTargets = await resolveDependencies(
      target.fullVersion,
      constraints,
      (message) => process.stderr.write(`warning: ${message}\n`)
    );
    const installed = await installModrinthTargets([target, ...depTargets], {
      output: options.output,
      json: options.json,
      concurrency: options.concurrency,
    });
    const mainResult = installed[0] as InstalledFile;
    const depInstalls = installed.slice(1);

    if (options.json) {
      printInstallJson(mainResult, depInstalls);
      return;
    }

    showInstalled(
      installed.map((entry) => ({
        name: entry.project.slug,
        version: entry.version.version_number,
      })),
      startedAt
    );
  } catch (error) {
    if (!options.json) {
      clearPackageStatus();
    }

    showError(error, options.json);
  }
}

async function installPackwiz(options: InstallOptions) {
  const startedAt = performance.now();

  try {
    const pack = await loadPackwiz({
      output: options.output,
      packFile: options.pack,
    });

    if (!options.json) {
      process.stdout.write(
        `${timedPackwizLine(pack.parseMs, basename(pack.file))}\n\n`
      );
    }

    const installed = await installPackwizFiles(pack.files, {
      json: options.json,
      concurrency: options.concurrency,
    });
    const entries = await describePackwizInstalls(pack.files);

    if (options.json) {
      printJson({
        pack: {
          name: pack.name,
          file: pack.file,
          indexFile: pack.indexFile,
          versions: pack.versions,
        },
        files: installed.map((entry) => ({
          name: entry.file.name,
          path: entry.path,
          bytes: entry.bytes,
          sha512: entry.sha512,
          source: entry.file.relativeMetadata,
          destination: entry.file.relativeDestination,
        })),
      });
      return;
    }

    showInstalled(entries, startedAt);
  } catch (error) {
    if (!options.json) {
      clearPackageStatus();
    }

    showError(error, options.json);
  }
}

export function registerInstallCommand(program: Command) {
  program
    .command("install")
    .alias("i")
    .description(
      "Install the best matching project file into the current directory."
    )
    .argument("[project]", "Project slug, project ID, or search name.")
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
    .option("--pack <path>", "Packwiz pack.toml file.")
    .option("--concurrency <count>", "Concurrent downloads.", "8")
    .option("--json", "Write machine-readable JSON.")
    .action(async (project: string | undefined, options: unknown) => {
      const parsedOptions = installOptionsSchema.parse(options);

      if (project) {
        await installProject(project, parsedOptions);
        return;
      }

      await installPackwiz(parsedOptions);
    });
}
