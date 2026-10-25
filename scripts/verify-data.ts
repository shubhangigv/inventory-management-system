// Checks that the stored data is consistent. Read-only: it never changes anything.
// Run with: npm run db:verify
import "dotenv/config";
import { prisma } from "../lib/prisma";

type Check = { name: string; problems: unknown[] };

async function main() {
  const checks: Check[] = [
    {
      // Every unit of stock must be explained by the ledger.
      name: "Product stock equals the sum of its stock movements",
      problems: await prisma.$queryRaw`
        SELECT p."sku", p."stockQuantity", COALESCE(SUM(m."quantityChange"), 0)::int AS "ledgerTotal"
        FROM "Product" p LEFT JOIN "StockMovement" m ON m."productId" = p."id"
        GROUP BY p."id"
        HAVING p."stockQuantity" <> COALESCE(SUM(m."quantityChange"), 0)`,
    },
    {
      name: "Each product's latest movement shows its current stock",
      problems: await prisma.$queryRaw`
        SELECT p."sku", p."stockQuantity", m."stockAfter"
        FROM "Product" p
        JOIN LATERAL (
          SELECT "stockAfter" FROM "StockMovement"
          WHERE "productId" = p."id" ORDER BY "createdAt" DESC, "id" DESC LIMIT 1
        ) m ON true
        WHERE m."stockAfter" <> p."stockQuantity"`,
    },
    {
      name: "Sale subtotal equals the sum of its items",
      problems: await prisma.$queryRaw`
        SELECT s."invoiceNumber", s."subtotal", SUM(i."quantity" * i."unitPrice") AS "itemsTotal"
        FROM "Sale" s JOIN "SaleItem" i ON i."saleId" = s."id"
        GROUP BY s."id"
        HAVING s."subtotal" <> SUM(i."quantity" * i."unitPrice")`,
    },
    {
      name: "Sale total equals subtotal - discount + tax, and payments add up to it",
      problems: await prisma.$queryRaw`
        SELECT s."invoiceNumber", s."totalAmount", COALESCE(SUM(p."amount"), 0) AS "paid"
        FROM "Sale" s LEFT JOIN "Payment" p ON p."saleId" = s."id"
        GROUP BY s."id"
        HAVING s."totalAmount" <> s."subtotal" - s."discountAmount" + s."taxAmount"
            OR s."totalAmount" <> COALESCE(SUM(p."amount"), 0)`,
    },
  ];

  for (const check of checks) {
    console.log(`${check.problems.length === 0 ? "OK  " : "FAIL"}  ${check.name}`);
    for (const problem of check.problems) console.log("      ", problem);
  }

  const counts = {
    categories: await prisma.category.count(),
    suppliers: await prisma.supplier.count(),
    products: await prisma.product.count(),
    stockMovements: await prisma.stockMovement.count(),
    sales: await prisma.sale.count(),
    saleItems: await prisma.saleItem.count(),
    payments: await prisma.payment.count(),
    users: await prisma.user.count(),
  };
  console.log("\nRow counts:", counts);

  if (checks.some((check) => check.problems.length > 0)) process.exitCode = 1;
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
