import { z } from "zod";

export const pageOptions = {
  limit: z.coerce.number().int().min(1).max(100).default(10),
  page: z.coerce.number().int().min(1).default(1),
};

export function offsetFor(page: number, limit: number) {
  return (page - 1) * limit;
}
