import type { Prisma, StockMovementType } from "@/app/generated/prisma/client";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  stockAdjustmentSchema,
  stockInSchema,
  type StockAdjustmentInput,
  type StockInInput,
} from "@/lib/validation/inventory";
import { pageArgs, paginated } from "./pagination";
import type { ActorOptions, Tx } from "./types";

export type StockMovementInput = {
  productId: string;
  type: StockMovementType;
  quantityChange: number; // + adds stock, - removes stock
  reason?: string;
  saleId?: string;
  createdById?: string;
};

/**
 * The ONLY function that changes Product.stockQuantity.
 *
 * It takes a transaction client (`tx`) so the new balance and its ledger row
 * are saved together: either both are written or neither is.
 *
 * Removing stock uses a conditional UPDATE ("... WHERE stockQuantity >= n").
 * PostgreSQL locks the row while updating, so two sales of the last item at the
 * same moment can't both succeed: the second one finds 0 rows to update.
 */
export async function applyStockMovement(tx: Tx, movement: StockMovementInput) {
  const { productId, quantityChange } = movement;

  const { count } = await tx.product.updateMany({
    where: quantityChange < 0 ? { id: productId, stockQuantity: { gte: -quantityChange } } : { id: productId },
    data: { stockQuantity: { increment: quantityChange } },
  });

  if (count === 0) {
    const product = await tx.product.findUnique({
      where: { id: productId },
      select: { name: true, stockQuantity: true },
    });
    if (!product) throw new AppError("NOT_FOUND", "Product not found.");
    throw new AppError(
      "INSUFFICIENT_STOCK",
      `Not enough stock for ${product.name}: ${product.stockQuantity} available, ${-quantityChange} needed.`,
    );
  }

  // Our UPDATE still holds the row lock, so this read is the balance we just wrote.
  const { stockQuantity } = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    select: { stockQuantity: true },
  });

  return tx.stockMovement.create({
    data: { ...movement, stockAfter: stockQuantity },
  });
}

/** Records goods received (e.g. a supplier delivery). */
export async function receiveStock(input: StockInInput, { userId }: ActorOptions = {}) {
  const data = stockInSchema.parse(input);
  return prisma.$transaction((tx) =>
    applyStockMovement(tx, {
      productId: data.productId,
      type: "STOCK_IN",
      quantityChange: data.quantity,
      reason: data.reason,
      createdById: userId,
    }),
  );
}

/** Manual correction after a stock count, damage or loss. */
export async function adjustStock(input: StockAdjustmentInput, { userId }: ActorOptions = {}) {
  const data = stockAdjustmentSchema.parse(input);
  return prisma.$transaction((tx) =>
    applyStockMovement(tx, {
      productId: data.productId,
      type: "ADJUSTMENT",
      quantityChange: data.quantityChange,
      reason: data.reason,
      createdById: userId,
    }),
  );
}

export type StockMovementFilters = {
  productId?: string;
  type?: StockMovementType;
  page?: number;
};

/** The stock ledger, newest first. */
export async function listStockMovements({ productId, type, page }: StockMovementFilters) {
  const where: Prisma.StockMovementWhereInput = {
    ...(productId ? { productId } : {}),
    ...(type ? { type } : {}),
  };
  const args = pageArgs(page);
  const [rows, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: { select: { id: true, sku: true, name: true } },
        sale: { select: { id: true, invoiceNumber: true } },
        createdBy: { select: { name: true } },
      },
      // id breaks ties between movements saved in the same millisecond (one sale, many items).
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: args.skip,
      take: args.take,
    }),
    prisma.stockMovement.count({ where }),
  ]);
  return paginated(rows, total, args.page);
}
