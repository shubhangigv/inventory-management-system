import type { Prisma } from "@/app/generated/prisma/client";
import { AppError, isForeignKeyViolation, isNotFound, isUniqueViolation } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type UpdateProductInput,
} from "@/lib/validation/products";
import { applyStockMovement } from "./inventory";
import { pageArgs, paginated } from "./pagination";
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

/** Edits a product's details. Never touches stockQuantity (see inventory.ts). */
export async function updateProduct(id: string, input: UpdateProductInput) {
  const data = updateProductSchema.parse(input);
  try {
    return await prisma.product.update({
      where: { id },
      // undefined means "leave unchanged" to Prisma, so cleared fields become null.
      data: {
        ...data,
        description: data.description ?? null,
        categoryId: data.categoryId ?? null,
        supplierId: data.supplierId ?? null,
      },
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError("CONFLICT", `A product with SKU ${data.sku} already exists.`);
    }
    if (isNotFound(error)) throw new AppError("NOT_FOUND", "Product not found.");
    throw error;
  }
}

/** Inactive products are hidden from new sales but keep their history. */
export async function setProductActive(id: string, isActive: boolean) {
  const { count } = await prisma.product.updateMany({ where: { id }, data: { isActive } });
  if (count === 0) throw new AppError("NOT_FOUND", "Product not found.");
}

/** Only products that were never stocked or sold can be deleted. */
export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({ where: { id } });
  } catch (error) {
    if (isForeignKeyViolation(error)) {
      throw new AppError("CONFLICT", "This product has stock or sales history. Deactivate it instead.");
    }
    if (isNotFound(error)) throw new AppError("NOT_FOUND", "Product not found.");
    throw error;
  }
}

export const productStatusFilters = ["active", "low", "inactive", "all"] as const;
export type ProductStatusFilter = (typeof productStatusFilters)[number];

export type ProductListFilters = {
  query?: string;
  categoryId?: string;
  status?: ProductStatusFilter;
  page?: number;
};

/** "Low stock" = active and at or below the product's own reorder level. */
export const lowStockWhere = {
  isActive: true,
  stockQuantity: { lte: prisma.product.fields.reorderLevel },
} satisfies Prisma.ProductWhereInput;

export async function listProducts({ query, categoryId, status = "active", page }: ProductListFilters) {
  const where: Prisma.ProductWhereInput = {
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { sku: { contains: query, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(status === "active" && { isActive: true }),
    ...(status === "inactive" && { isActive: false }),
    ...(status === "low" && lowStockWhere),
  };
  const args = pageArgs(page);
  const [rows, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: { select: { name: true } } },
      orderBy: { name: "asc" },
      skip: args.skip,
      take: args.take,
    }),
    prisma.product.count({ where }),
  ]);
  return paginated(rows, total, args.page);
}

export function getProduct(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      supplier: { select: { id: true, name: true } },
    },
  });
}

/** Everything the point-of-sale screen may sell. */
export function listSellableProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, sku: true, name: true, sellingPrice: true, stockQuantity: true },
    orderBy: { name: "asc" },
  });
}

/** Short list for <select> inputs. */
export function listProductOptions() {
  return prisma.product.findMany({
    select: { id: true, sku: true, name: true, isActive: true, stockQuantity: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}
