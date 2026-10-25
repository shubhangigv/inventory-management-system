import type { Prisma } from "@/app/generated/prisma/client";

/** The Prisma client inside `prisma.$transaction(async (tx) => ...)`. */
export type Tx = Prisma.TransactionClient;

/**
 * Who is performing the action. Comes from the logged-in session once
 * authentication exists; undefined for system actions such as the seed script.
 */
export type ActorOptions = { userId?: string };
