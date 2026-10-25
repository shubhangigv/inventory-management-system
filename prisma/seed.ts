// Development seed data. Run with: npm run db:seed
//
// Safe to run more than once: it only CREATES rows that are missing and never
// changes or deletes existing ones (so your own edits are kept).
// Products and sales go through the real services, so the sample data follows
// the same rules as the app: every stock change has a StockMovement row.
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { createProduct } from "../lib/services/products";
import { cancelSale, createSale } from "../lib/services/sales";

const settings = {
  businessName: "Demo Store",
  currencyCode: "INR",
  taxRate: "18.00",
  invoicePrefix: "INV",
};

const categories = [
  { name: "Electronics", description: "Devices and accessories" },
  { name: "Stationery", description: "Office and school supplies" },
  { name: "Groceries", description: "Packaged food and drinks" },
];

const suppliers = [
  { name: "TechSource Distributors", contactName: "Ravi Kumar", email: "orders@techsource.example", phone: "+91 98765 43210" },
  { name: "PaperWorks Supplies", contactName: "Anita Desai", email: "sales@paperworks.example", phone: "+91 91234 56780" },
];

const products = [
  { sku: "ELEC-001", name: "USB-C Charger 65W", sellingPrice: "1499.00", costPrice: "950.00", openingStock: 40, category: "Electronics", supplier: "TechSource Distributors" },
  { sku: "ELEC-002", name: "Wireless Mouse", sellingPrice: "799.00", costPrice: "450.00", openingStock: 12, category: "Electronics", supplier: "TechSource Distributors" },
  { sku: "STAT-001", name: "A4 Notebook (200 pages)", sellingPrice: "120.00", costPrice: "70.00", openingStock: 150, category: "Stationery", supplier: "PaperWorks Supplies" },
  { sku: "STAT-002", name: "Gel Pen (Blue)", sellingPrice: "25.00", costPrice: "12.00", openingStock: 15, reorderLevel: 20, category: "Stationery", supplier: "PaperWorks Supplies" },
  { sku: "GROC-001", name: "Green Tea (100 bags)", sellingPrice: "350.00", costPrice: "220.00", openingStock: 60, category: "Groceries" },
];

const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function seedCatalogue() {
  await prisma.businessSettings.upsert({ where: { id: 1 }, create: { id: 1, ...settings }, update: {} });

  for (const category of categories) {
    await prisma.category.upsert({ where: { name: category.name }, create: category, update: {} });
  }
  for (const supplier of suppliers) {
    await prisma.supplier.upsert({ where: { name: supplier.name }, create: supplier, update: {} });
  }

  let created = 0;
  for (const { category, supplier, ...product } of products) {
    if (await prisma.product.findUnique({ where: { sku: product.sku }, select: { id: true } })) continue;

    const categoryRow = await prisma.category.findUniqueOrThrow({ where: { name: category } });
    const supplierRow = supplier ? await prisma.supplier.findUniqueOrThrow({ where: { name: supplier } }) : null;
    await createProduct({ ...product, categoryId: categoryRow.id, supplierId: supplierRow?.id });
    created++;
  }
  console.log(`Products: ${created} created, ${products.length - created} already existed.`);
}

// Sample sales are only added to an empty sales table, so re-running the seed
// never sells the same stock twice.
async function seedSales() {
  if ((await prisma.sale.count()) > 0) {
    console.log("Sales: already present, skipped.");
    return;
  }

  const bySku = async (sku: string) => (await prisma.product.findUniqueOrThrow({ where: { sku } })).id;
  const [charger, mouse, notebook, pen, tea] = await Promise.all(
    ["ELEC-001", "ELEC-002", "STAT-001", "STAT-002", "GROC-001"].map(bySku),
  );

  // 2 x 120 + 5 x 25 = 365.00, + 18% tax 65.70 = 430.70, paid in cash
  await createSale({
    items: [{ productId: notebook, quantity: 2 }, { productId: pen, quantity: 5 }],
    payments: [{ method: "CASH", amount: "430.70" }],
    soldAt: daysAgo(3),
  });

  // 1499 + 799 = 2298.00 - 98.00 discount = 2200.00, + 18% tax 396.00 = 2596.00, split card + UPI
  await createSale({
    items: [{ productId: charger, quantity: 1 }, { productId: mouse, quantity: 1 }],
    discountAmount: "98.00",
    payments: [
      { method: "CARD", amount: "2000.00", reference: "CARD-DEMO-1001" },
      { method: "UPI", amount: "596.00", reference: "UPI-DEMO-2002" },
    ],
    customerName: "Priya Sharma",
    soldAt: daysAgo(1),
  });

  // 3 x 350 = 1050.00, + 18% tax 189.00 = 1239.00, then cancelled (stock goes back)
  const cancelled = await createSale({
    items: [{ productId: tea, quantity: 3 }],
    payments: [{ method: "UPI", amount: "1239.00", reference: "UPI-DEMO-3003" }],
  });
  await cancelSale({ saleId: cancelled.id, reason: "Customer changed their mind" });

  console.log("Sales: 3 sample sales created (1 cancelled).");
}

async function main() {
  await seedCatalogue();
  await seedSales();
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
