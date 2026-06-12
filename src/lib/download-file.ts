// biome-ignore-all lint/suspicious/noBitwiseOperators: Murmur2 is a bitwise hash algorithm used by packwiz metadata.
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { Transform } from "node:stream";
import { pipeline } from "node:stream/promises";

import { USER_AGENT } from "@/modrinth/client";

import { CliError } from "./errors";

export type HashFormat = "md5" | "murmur2" | "sha1" | "sha256" | "sha512";

interface ExpectedHash {
  format: HashFormat;
  value: string;
}

interface DownloadInput {
  expectedHash?: ExpectedHash;
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

function expectedHashFor(input: DownloadInput): ExpectedHash | undefined {
  return (
    input.expectedHash ??
    (input.expectedSha512
      ? { format: "sha512" as const, value: input.expectedSha512 }
      : undefined)
  );
}

function cryptoHashFor(expectedHash: ExpectedHash | undefined) {
  if (
    !expectedHash ||
    expectedHash.format === "sha512" ||
    expectedHash.format === "murmur2"
  ) {
    return;
  }

  return createHash(expectedHash.format);
}

function actualHashFor(
  expectedHash: ExpectedHash,
  hashes: {
    crypto?: ReturnType<typeof createHash>;
    murmurChunks?: Buffer[];
    sha512: string;
  }
) {
  if (expectedHash.format === "sha512") {
    return hashes.sha512;
  }

  if (expectedHash.format === "murmur2") {
    return String(murmur2(hashes.murmurChunks ?? []));
  }

  return hashes.crypto?.digest("hex") ?? "";
}

function murmur2(chunks: Buffer[]) {
  const bytes: number[] = [];

  for (const chunk of chunks) {
    for (const byte of chunk) {
      if (!(byte === 9 || byte === 10 || byte === 13 || byte === 32)) {
        bytes.push(byte);
      }
    }
  }

  let hash = 1 ^ bytes.length;
  let index = 0;

  while (bytes.length - index >= 4) {
    let k =
      (bytes[index] ?? 0) |
      ((bytes[index + 1] ?? 0) << 8) |
      ((bytes[index + 2] ?? 0) << 16) |
      ((bytes[index + 3] ?? 0) << 24);

    k = Math.imul(k, 0x5b_d1_e9_95);
    k ^= k >>> 24;
    k = Math.imul(k, 0x5b_d1_e9_95);
    hash = Math.imul(hash, 0x5b_d1_e9_95);
    hash ^= k;
    index += 4;
  }

  const remaining = bytes.length - index;

  if (remaining >= 3) {
    hash ^= (bytes[index + 2] ?? 0) << 16;
  }

  if (remaining >= 2) {
    hash ^= (bytes[index + 1] ?? 0) << 8;
  }

  if (remaining >= 1) {
    hash ^= bytes[index] ?? 0;
    hash = Math.imul(hash, 0x5b_d1_e9_95);
  }

  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0x5b_d1_e9_95);
  hash ^= hash >>> 15;

  return hash >>> 0;
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
  const expectedHash = expectedHashFor(input);
  const sha512Hash = createHash("sha512");
  const expectedCryptoHash = cryptoHashFor(expectedHash);
  const murmurChunks: Buffer[] | undefined =
    expectedHash?.format === "murmur2" ? [] : undefined;
  let bytes = 0;
  const contentLength = response.headers.get("content-length");
  const totalBytes = contentLength ? Number(contentLength) : undefined;
  const verifier = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.byteLength;
      sha512Hash.update(chunk);
      expectedCryptoHash?.update(chunk);
      murmurChunks?.push(chunk);
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
    await mkdir(dirname(input.outputPath), { recursive: true });
    await pipeline(
      response.body,
      verifier,
      createWriteStream(tempPath, { flags: "wx" })
    );
    const sha512 = sha512Hash.digest("hex");

    if (expectedHash) {
      const actual = actualHashFor(expectedHash, {
        crypto: expectedCryptoHash,
        murmurChunks,
        sha512,
      });

      if (actual.toLowerCase() !== expectedHash.value.toLowerCase()) {
        throw new CliError(
          "HASH_MISMATCH",
          `Downloaded file failed ${expectedHash.format} verification.`,
          {
            expected: expectedHash.value,
            actual,
            format: expectedHash.format,
          }
        );
      }
    }

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
