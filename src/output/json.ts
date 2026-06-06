import { toCliError } from "@/lib/errors";

export function printJson(value: unknown) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export function showError(error: unknown, json: boolean) {
  const cliError = toCliError(error);

  if (json) {
    printJson({
      error: {
        code: cliError.code,
        message: cliError.message,
        details: cliError.details,
      },
    });
  } else {
    process.stderr.write(`${cliError.code}: ${cliError.message}\n`);
  }

  process.exitCode = cliError.exitCode;
}
