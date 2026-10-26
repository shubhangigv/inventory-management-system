import { Prisma } from "@/app/generated/prisma/client";

// Errors the business logic throws on purpose. Their message is safe to show
// to the user; any other error is an unexpected bug and should be logged.
export type AppErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "INSUFFICIENT_STOCK"
  | "PRODUCT_INACTIVE"
  | "PAYMENT_MISMATCH"
  | "INVALID_STATE"
  | "INVALID_LOGIN"
  | "FORBIDDEN";

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

// P2002 = PostgreSQL rejected a duplicate value in a @unique column.
export function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

// P2003 = a foreign key blocked the change (e.g. deleting a product that has sales).
export function isForeignKeyViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
}

// P2025 = the row to update or delete doesn't exist.
export function isNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
