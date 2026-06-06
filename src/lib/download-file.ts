import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { rename, rm } from "node:fs/promises";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { USER_AGENT } from "@/modrinth/client";
import { CliError } from "./errors";

interface DownloadInput {
  expectedSha512?: string;
  onProgress?: (progress: DownloadProgress) => void;
  outputPath: string;
  url: string;
}

interface DownloadProgress {
  bytes: number;
  percent?: number;
  totalBytes?: number;
}

export async function download(input: DownloadInput) {
  const response = await fetch(input.url, {
    headers: {
      "User-Agent": USER_AGENT,
    },
  });

  if (!(response.ok && response.body)) {
    throw new CliError(
      "DOWNLOAD_FAILED",
      `Download failed with status ${response.status}.`,
      {
        status: response.status,
        url: input.url,
      }
    );
  }

  const tempPath = `${input.outputPath}.tmp`;
  const hash = createHash("sha512");
  let bytes = 0;
  const contentLength = response.headers.get("content-length");
  const totalBytes = contentLength ? Number(contentLength) : undefined;
  const verifier = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.byteLength;
      hash.update(chunk);
      input.onProgress?.({
        bytes,
        percent:
          totalBytes && Number.isFinite(totalBytes)
            ? Math.min(100, Math.round((bytes / totalBytes) * 100))
            : undefined,
        totalBytes,
      });
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      response.body,
      verifier,
      createWriteStream(tempPath, { flags: "wx" })
    );
    const sha512 = hash.digest("hex");

    if (input.expectedSha512 && sha512 !== input.expectedSha512) {
      throw new CliError(
        "HASH_MISMATCH",
        "Downloaded file failed sha512 verification.",
        {
          expected: input.expectedSha512,
          actual: sha512,
        }
      );
    }

    await rename(tempPath, input.outputPath);

    return {
      path: input.outputPath,
      bytes,
      sha512,
    };
  } catch (error) {
    await rm(tempPath, { force: true });
    throw error;
  }
}
