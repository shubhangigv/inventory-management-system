import { AppError } from "@/lib/errors";
import { calculateSaleTotals, sumMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  cancelSaleSchema,
  createSaleSchema,
  type CancelSaleInput,
  type CreateSaleInput,
} from "@/lib/validation/sales";
import { applyStockMovement } from "./inventory";
import { reserveInvoiceNumber } from "./settings";
import type { ActorOptions } from "./types";

const saleWithDetails = { items: true, payments: true } as const;

/**
 * Records a completed sale in ONE transaction:
 *   1. load the products and use their current prices (never prices from the client)
 *   2. calculate totals and check the payments add up to the total
 *   3. take the next invoice number
 *   4. save the sale with its items (name/SKU/price snapshots) and payments
 *   5. remove the sold stock, writing a SALE movement per product
 * If any step fails (e.g. not enough stock), everything is rolled back.
 */
export async function createSale(input: CreateSaleInput, { userId }: ActorOptions = {}) {
  const data = createSaleSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    const products = await tx.product.findMany({
      where: { id: { in: data.items.map((item) => item.productId) } },
      select: {
        id: true,
        sku: true,
        name: true,
        sellingPrice: true,
        costPrice: true,
        isActive: true,
        stockQuantity: true,
      },
    });
    const productsById = new Map(products.map((product) => [product.id, product]));

    // Sorted by product ID so concurrent sales always lock product rows in the
    // same order, which prevents deadlocks.
    const lines = data.items
      .map((item) => {
        const product = productsById.get(item.productId);
        if (!product) throw new AppError("NOT_FOUND", "A product in this sale no longer exists.");
        if (!product.isActive) throw new AppError("PRODUCT_INACTIVE", `${product.name} is no longer for sale.`);
        // Early, friendly check. The real guarantee is the locked UPDATE in applyStockMovement.
        if (product.stockQuantity < item.quantity) {
          throw new AppError(
            "INSUFFICIENT_STOCK",
            `Not enough stock for ${product.name}: ${product.stockQuantity} available, ${item.quantity} needed.`,
          );
        }
        return { product, quantity: item.quantity };
      })
      .sort((a, b) => a.product.id.localeCompare(b.product.id));

    const { invoiceNumber, taxRate } = await reserveInvoiceNumber(tx);

    const totals = calculateSaleTotals(
      lines.map((line) => ({ unitPrice: line.product.sellingPrice, quantity: line.quantity })),
      data.discountAmount,
      taxRate,
    );
    if (totals.discountAmount.greaterThan(totals.subtotal)) {
      throw new AppError("INVALID_STATE", "Discount can't be more than the subtotal.");
    }
    const paid = sumMoney(data.payments.map((payment) => payment.amount));
    if (!paid.equals(totals.totalAmount)) {
      throw new AppError(
        "PAYMENT_MISMATCH",
        `Payments add up to ${paid.toFixed(2)} but the sale total is ${totals.totalAmount.toFixed(2)}.`,
      );
    }

    const sale = await tx.sale.create({
      data: {
        invoiceNumber,
        customerName: data.customerName,
        notes: data.notes,
        soldAt: data.soldAt,
        createdById: userId,
        ...totals,
        items: {
          create: lines.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
            unitPrice: product.sellingPrice,
            unitCost: product.costPrice,
            productName: product.name,
            productSku: product.sku,
          })),
        },
        payments: {
          create: data.payments.map((payment) => ({ ...payment, receivedAt: data.soldAt })),
        },
      },
    });

    for (const { product, quantity } of lines) {
      await applyStockMovement(tx, {
        productId: product.id,
        type: "SALE",
        quantityChange: -quantity,
        reason: `Sale ${invoiceNumber}`,
        saleId: sale.id,
        createdById: userId,
      });
    }

    return tx.sale.findUniqueOrThrow({ where: { id: sale.id }, include: saleWithDetails });
  });
}

/**
 * Cancels a completed sale and puts its stock back, in one transaction.
 * The sale row is kept (status CANCELLED) so the history stays complete.
 */
export async function cancelSale(input: CancelSaleInput, { userId }: ActorOptions = {}) {
  const { saleId, reason } = cancelSaleSchema.parse(input);

  return prisma.$transaction(async (tx) => {
    // Conditional update: if two people cancel at once, only one of them
    // changes the status, so the stock is returned exactly once.
    const { count } = await tx.sale.updateMany({
      where: { id: saleId, status: "COMPLETED" },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: reason },
    });
    if (count === 0) {
      const exists = await tx.sale.count({ where: { id: saleId } });
      throw exists
        ? new AppError("INVALID_STATE", "This sale is already cancelled.")
        : new AppError("NOT_FOUND", "Sale not found.");
    }

    const sale = await tx.sale.findUniqueOrThrow({
      where: { id: saleId },
      select: { invoiceNumber: true, items: { orderBy: { productId: "asc" } } },
    });
    for (const item of sale.items) {
      await applyStockMovement(tx, {
        productId: item.productId,
        type: "SALE_CANCELLED",
        quantityChange: item.quantity,
        reason: `Cancelled ${sale.invoiceNumber}: ${reason}`,
        saleId,
        createdById: userId,
      });
    }

    return tx.sale.findUniqueOrThrow({ where: { id: saleId }, include: saleWithDetails });
  });
}
