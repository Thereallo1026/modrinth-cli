import { modrinthClient } from "./client";

export function getUser(name: string) {
  return modrinthClient.labrinth.users_v2.get(name);
}
