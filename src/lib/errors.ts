type CliErrorDetails = Record<string, unknown>;

export class CliError extends Error {
  readonly code: string;
  readonly details?: CliErrorDetails;
  readonly exitCode: number;

  constructor(
    code: string,
    message: string,
    details?: CliErrorDetails,
    exitCode = 1
  ) {
    super(message);
    this.name = "CliError";
    this.code = code;
    this.details = details;
    this.exitCode = exitCode;
  }
}

export function toCliError(error: unknown) {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof Error) {
    return new CliError("UNEXPECTED_ERROR", error.message);
  }

  return new CliError("UNEXPECTED_ERROR", "An unexpected error occurred.");
}
