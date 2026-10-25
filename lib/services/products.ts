import { AppError, isUniqueViolation } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createProductSchema, type CreateProductInput } from "@/lib/validation/products";
import { applyStockMovement } from "./inventory";
import type { ActorOptions } from "./types";

/**
 * Creates a product with zero stock, then records its opening stock as a
 * STOCK_IN movement, so even the very first units appear in the ledger.
 */
export async function createProduct(input: CreateProductInput, { userId }: ActorOptions = {}) {
  const { openingStock, ...data } = createProductSchema.parse(input);

  try {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: { ...data, stockQuantity: 0 } });

      if (openingStock > 0) {
        await applyStockMovement(tx, {
          productId: product.id,
          type: "STOCK_IN",
          quantityChange: openingStock,
          reason: "Opening stock",
          createdById: userId,
        });
      }

      return tx.product.findUniqueOrThrow({ where: { id: product.id } });
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("CONFLICT", `A product with SKU ${data.sku} already exists.`);
    }
    throw error;
  }
}
