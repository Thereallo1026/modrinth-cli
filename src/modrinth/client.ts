import { GenericModrinthClient, RetryFeature } from "@modrinth/api-client";

import { version } from "../../package.json";

export const USER_AGENT = `thereallo/modrinth-cli/${version} (https://npmx.dev/package/modrinth-cli)`;

export const modrinthClient = new GenericModrinthClient({
  userAgent: USER_AGENT,
  features: [
    new RetryFeature({ maxAttempts: 3, backoffStrategy: "exponential" }),
  ],
});
