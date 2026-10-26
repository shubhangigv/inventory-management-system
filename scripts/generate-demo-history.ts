// Generates ~6 months of realistic grocery sales for the demand forecast to
// learn from. Development only: run with `npm run db:demo-history`.
//
// It adds its own products (milk, bread, rice, spices...) so the hand-made
// seed data is untouched, and refuses to run twice. Every unit sold or
// received gets a StockMovement with the right running balance, so
// `npm run db:verify` still passes afterwards.
//
// Patterns built in, which a good forecast should pick up:
//   - fast movers (milk ~40/day) vs slow movers (chilli powder ~0.5/day)
//   - weekends: dairy and snacks sell more
//   - salary days (1st-5th of the month): staples sell more
//   - trends: rice and coffee slowly growing
// Sales on a day are capped by the stock on the shelf, like a real stockout.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import { formatInvoiceNumber } from "../lib/services/settings";

const HISTORY_DAYS = 182;
const DAY_MS = 24 * 60 * 60 * 1000;

type Pattern = "dairy" | "staple" | "snack" | "spice";

const categories = [
  { name: "Dairy & Bakery", description: "Milk, curd, eggs and bread: delivered daily" },
  { name: "Staples", description: "Rice, sugar, oil and other kitchen staples" },
  { name: "Snacks & Beverages", description: "Biscuits, tea and coffee" },
  { name: "Spices", description: "Masalas and powders" },
];

const suppliers = [
  { name: "FreshFarm Dairy", contactName: "Suresh Patil", email: "orders@freshfarm.example", phone: "+91 90000 11111", leadTimeDays: 1, orderCycleDays: 1 },
  { name: "Annapurna Wholesale", contactName: "Meena Iyer", email: "sales@annapurna.example", phone: "+91 90000 22222", leadTimeDays: 3, orderCycleDays: 7 },
];

// rate = average units a day at the start; trend = growth over the whole period (0.4 = +40%).
const products = [
  { sku: "DAIRY-001", name: "Toned Milk 500 ml", price: 30, cost: 26, rate: 40, trend: 0.05, pattern: "dairy", category: "Dairy & Bakery", supplier: "FreshFarm Dairy" },
  { sku: "DAIRY-002", name: "Fresh Curd 400 g", price: 45, cost: 36, rate: 11, trend: 0.1, pattern: "dairy", category: "Dairy & Bakery", supplier: "FreshFarm Dairy" },
  { sku: "DAIRY-003", name: "Farm Eggs (6 pack)", price: 48, cost: 38, rate: 9, trend: 0, pattern: "dairy", category: "Dairy & Bakery", supplier: "FreshFarm Dairy" },
  { sku: "BAKE-001", name: "White Bread 400 g", price: 45, cost: 35, rate: 16, trend: -0.05, pattern: "dairy", category: "Dairy & Bakery", supplier: "FreshFarm Dairy" },
  { sku: "STPL-001", name: "Basmati Rice 1 kg", price: 140, cost: 112, rate: 3.5, trend: 0.4, pattern: "staple", category: "Staples", supplier: "Annapurna Wholesale" },
  { sku: "STPL-002", name: "Sugar 1 kg", price: 48, cost: 41, rate: 5, trend: 0, pattern: "staple", category: "Staples", supplier: "Annapurna Wholesale" },
  { sku: "STPL-003", name: "Sunflower Oil 1 L", price: 165, cost: 138, rate: 2.5, trend: 0.1, pattern: "staple", category: "Staples", supplier: "Annapurna Wholesale" },
  { sku: "STPL-004", name: "Wheat Atta 5 kg", price: 260, cost: 220, rate: 1.8, trend: 0, pattern: "staple", category: "Staples", supplier: "Annapurna Wholesale" },
  { sku: "SNCK-001", name: "Glucose Biscuits 250 g", price: 30, cost: 23, rate: 12, trend: 0, pattern: "snack", category: "Snacks & Beverages", supplier: "Annapurna Wholesale" },
  { sku: "SNCK-002", name: "Instant Coffee 50 g", price: 175, cost: 135, rate: 1.2, trend: 0.6, pattern: "snack", category: "Snacks & Beverages", supplier: "Annapurna Wholesale" },
  { sku: "SPCE-001", name: "Red Chilli Powder 100 g", price: 45, cost: 31, rate: 0.5, trend: 0, pattern: "spice", category: "Spices", supplier: "Annapurna Wholesale" },
  { sku: "SPCE-002", name: "Turmeric Powder 100 g", price: 38, cost: 26, rate: 0.4, trend: 0, pattern: "spice", category: "Spices", supplier: "Annapurna Wholesale" },
  { sku: "SPCE-003", name: "Garam Masala 50 g", price: 62, cost: 43, rate: 0.25, trend: 0, pattern: "spice", category: "Spices", supplier: "Annapurna Wholesale" },
] satisfies { pattern: Pattern; [key: string]: unknown }[];

// Weekly-delivered products whose last delivery was missed, so the forecast has
// something to flag. (Dairy needs no help: it only ever holds about two days of stock.)
const SKIP_LAST_DELIVERY = new Set(["STPL-001", "SNCK-001", "SPCE-001"]);

// ---------- Random numbers (seeded, so every run produces the same history) ----------

let seed = 20261026;
function random() {
  // mulberry32
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Poisson-distributed count (Knuth's method for small means, normal approximation for large). */
function poisson(mean: number) {
  if (mean <= 0) return 0;
  if (mean > 30) {
    const normal = Math.sqrt(-2 * Math.log(random() || 1e-9)) * Math.cos(2 * Math.PI * random());
    return Math.max(0, Math.round(mean + Math.sqrt(mean) * normal));
  }
  const limit = Math.exp(-mean);
  let count = 0;
  for (let product = random(); product > limit; product *= random()) count++;
  return count;
}

// ---------- Demand model ----------

function dayFactor(pattern: Pattern, date: Date) {
  const weekday = date.getDay(); // 0 = Sunday
  const weekend = weekday === 0 || weekday === 6;
  const salaryDays = date.getDate() <= 5;
  switch (pattern) {
    case "dairy":
      return (weekend ? 1.3 : 1) * (weekday === 1 ? 0.9 : 1);
    case "snack":
      return weekend ? 1.45 : 1;
    case "staple":
      return (salaryDays ? 1.6 : 1) * (weekday === 0 ? 1.3 : 1);
    case "spice":
      return (salaryDays ? 1.3 : 1) * (weekday === 0 ? 1.2 : 1);
  }
}

// ---------- Generation ----------

type SaleRow = { id: string; soldAt: Date; lines: Map<number, number> }; // product index -> quantity
type MovementRow = {
  id: string;
  type: "STOCK_IN" | "SALE";
  quantityChange: number;
  stockAfter: number;
  reason: string | null;
  createdAt: Date;
  productIndex: number;
  saleId: string | null;
};

/** --reset: removes what an earlier run generated (its products, their sales and stock history). */
async function reset() {
  await prisma.$transaction(async (tx) => {
    const ids = (await tx.product.findMany({ where: { sku: { in: products.map((p) => p.sku) } }, select: { id: true } })).map((p) => p.id);
    const sales = await tx.sale.findMany({ where: { items: { some: { productId: { in: ids } } } }, select: { id: true } });
    const saleIds = sales.map((s) => s.id);
    if (await tx.saleItem.count({ where: { saleId: { in: saleIds }, productId: { notIn: ids } } })) {
      throw new Error("Some generated sales also contain other products; not resetting.");
    }
    await tx.stockMovement.deleteMany({ where: { OR: [{ productId: { in: ids } }, { saleId: { in: saleIds } }] } });
    await tx.sale.deleteMany({ where: { id: { in: saleIds } } });
    await tx.product.deleteMany({ where: { id: { in: ids } } }); // forecasts cascade
    // Hand out invoice numbers again from after the newest remaining sale.
    const [{ max }] = await tx.$queryRaw<{ max: number | null }[]>`
      SELECT MAX(CAST(regexp_replace("invoiceNumber", '[^0-9]', '', 'g') AS INTEGER)) AS max FROM "Sale"`;
    await tx.businessSettings.update({ where: { id: 1 }, data: { nextInvoiceNumber: (max ?? 0) + 1 } });
    console.log(`Reset: removed ${ids.length} generated products and ${saleIds.length} sales.`);
  }, { timeout: 120_000 });
}

async function main() {
  if (process.argv.includes("--reset")) await reset();
  if (await prisma.product.findUnique({ where: { sku: products[0].sku }, select: { id: true } })) {
    console.log("Demo history already exists (found DAIRY-001). Use --reset to generate it again.");
    return;
  }

  const settings = await prisma.businessSettings.findUnique({ where: { id: 1 } });
  if (!settings) throw new Error("Run `npm run db:seed` first (business settings are missing).");
  const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
  if (users.length === 0) throw new Error("Run `npm run db:seed` first (no users).");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstDay = new Date(today.getTime() - HISTORY_DAYS * DAY_MS);

  const stock = products.map(() => 0);
  const sales: SaleRow[] = [];
  const movements: MovementRow[] = [];
  const supplierOf = (index: number) => suppliers.find((s) => s.name === products[index].supplier)!;

  // Stock up to two weeks of demand (dairy: two days, it's delivered daily).
  const targetStock = (index: number) => {
    const p = products[index];
    const days = supplierOf(index).orderCycleDays === 1 ? 2.2 : 16;
    return Math.max(6, Math.ceil(p.rate * (1 + p.trend) * days));
  };

  for (let day = 0; day < HISTORY_DAYS; day++) {
    const date = new Date(firstDay.getTime() + day * DAY_MS);
    const progress = day / HISTORY_DAYS;
    const lastWeek = day >= HISTORY_DAYS - 7;

    // 07:00 deliveries: daily for dairy, Mondays for the wholesaler.
    products.forEach((p, index) => {
      const supplier = supplierOf(index);
      const deliveryDay = supplier.orderCycleDays === 1 || date.getDay() === 1 || day === 0;
      if (!deliveryDay || (lastWeek && SKIP_LAST_DELIVERY.has(p.sku))) return;
      const quantity = targetStock(index) - stock[index];
      if (quantity <= 0) return;
      stock[index] += quantity;
      movements.push({
        id: randomUUID(),
        type: "STOCK_IN",
        quantityChange: quantity,
        stockAfter: stock[index],
        reason: day === 0 ? "Opening stock" : `Delivery from ${supplier.name}`,
        createdAt: new Date(date.getTime() + 7 * 60 * 60 * 1000),
        productIndex: index,
        saleId: null,
      });
    });

    // Units each product sells today, capped by what's on the shelf.
    const units = products.map((p, index) => {
      const mean = p.rate * (1 + p.trend * progress) * dayFactor(p.pattern, date) * (0.85 + 0.3 * random());
      return Math.min(stock[index], poisson(mean));
    });
    const totalUnits = units.reduce((sum, n) => sum + n, 0);
    if (totalUnits === 0) continue;

    // Spread the units over customer baskets between 08:00 and 21:00.
    const baskets: SaleRow[] = Array.from({ length: Math.max(1, Math.round(totalUnits / 3.2)) }, () => ({
      id: randomUUID(),
      soldAt: new Date(date.getTime() + (8 + random() * 13) * 60 * 60 * 1000),
      lines: new Map(),
    }));
    units.forEach((count, index) => {
      let left = count;
      while (left > 0) {
        const take = Math.min(left, random() < 0.25 ? 2 : 1);
        const basket = baskets[Math.floor(random() * baskets.length)];
        basket.lines.set(index, (basket.lines.get(index) ?? 0) + take);
        left -= take;
      }
    });

    const daySales = baskets.filter((b) => b.lines.size > 0).sort((a, b) => a.soldAt.getTime() - b.soldAt.getTime());
    for (const sale of daySales) {
      for (const [index, quantity] of sale.lines) {
        stock[index] -= quantity;
        movements.push({
          id: randomUUID(),
          type: "SALE",
          quantityChange: -quantity,
          stockAfter: stock[index],
          reason: null,
          createdAt: sale.soldAt,
          productIndex: index,
          saleId: sale.id,
        });
      }
    }
    sales.push(...daySales);
  }

  // ---------- Write everything in one transaction ----------

  const toMoney = (cents: number) => (cents / 100).toFixed(2);
  const taxRate = Number(settings.taxRate);
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)];
  const methods = ["UPI", "UPI", "UPI", "CASH", "CASH", "CARD"] as const;

  await prisma.$transaction(
    async (tx) => {
      const categoryIds = new Map<string, string>();
      for (const category of categories) {
        const row = await tx.category.upsert({ where: { name: category.name }, create: category, update: {} });
        categoryIds.set(category.name, row.id);
      }
      const supplierIds = new Map<string, string>();
      for (const supplier of suppliers) {
        const { leadTimeDays, orderCycleDays } = supplier;
        const row = await tx.supplier.upsert({ where: { name: supplier.name }, create: supplier, update: { leadTimeDays, orderCycleDays } });
        supplierIds.set(supplier.name, row.id);
      }

      const productIds = products.map(() => randomUUID());
      await tx.product.createMany({
        data: products.map((p, index) => ({
          id: productIds[index],
          sku: p.sku,
          name: p.name,
          costPrice: p.cost.toFixed(2),
          sellingPrice: p.price.toFixed(2),
          stockQuantity: stock[index],
          reorderLevel: Math.max(2, Math.round(p.rate * 3)),
          categoryId: categoryIds.get(p.category),
          supplierId: supplierIds.get(p.supplier),
          createdAt: firstDay,
        })),
      });

      // Invoice numbers continue from the shop's counter, oldest sale first.
      const { nextInvoiceNumber } = await tx.businessSettings.update({
        where: { id: 1 },
        data: { nextInvoiceNumber: { increment: sales.length } },
        select: { nextInvoiceNumber: true },
      });
      const firstNumber = nextInvoiceNumber - sales.length;

      const saleRows = [];
      const itemRows = [];
      const paymentRows = [];
      const sellerOf = new Map<string, string>();
      for (const [n, sale] of sales.entries()) {
        const sellerId = pick(users).id;
        sellerOf.set(sale.id, sellerId);
        let subtotal = 0;
        for (const [index, quantity] of sale.lines) {
          const p = products[index];
          subtotal += p.price * 100 * quantity;
          itemRows.push({
            id: randomUUID(),
            saleId: sale.id,
            productId: productIds[index],
            quantity,
            unitPrice: p.price.toFixed(2),
            unitCost: p.cost.toFixed(2),
            productName: p.name,
            productSku: p.sku,
          });
        }
        const tax = Math.round((subtotal * taxRate) / 100);
        saleRows.push({
          id: sale.id,
          invoiceNumber: formatInvoiceNumber(settings.invoicePrefix, firstNumber + n),
          subtotal: toMoney(subtotal),
          taxAmount: toMoney(tax),
          totalAmount: toMoney(subtotal + tax),
          soldAt: sale.soldAt,
          createdAt: sale.soldAt,
          createdById: sellerId,
        });
        paymentRows.push({ id: randomUUID(), saleId: sale.id, method: pick(methods), amount: toMoney(subtotal + tax), receivedAt: sale.soldAt });
      }

      const chunks = <T,>(rows: T[], size = 5000) =>
        Array.from({ length: Math.ceil(rows.length / size) }, (_, i) => rows.slice(i * size, (i + 1) * size));
      for (const rows of chunks(saleRows)) await tx.sale.createMany({ data: rows });
      for (const rows of chunks(itemRows)) await tx.saleItem.createMany({ data: rows });
      for (const rows of chunks(paymentRows)) await tx.payment.createMany({ data: rows });
      const movementRows = movements.map(({ productIndex, ...m }) => ({
        ...m,
        productId: productIds[productIndex],
        createdById: m.saleId ? sellerOf.get(m.saleId)! : pick(users).id,
      }));
      for (const rows of chunks(movementRows)) await tx.stockMovement.createMany({ data: rows });

      console.log(
        `Created ${products.length} products, ${saleRows.length} sales, ${itemRows.length} sale lines and ` +
          `${movementRows.length} stock movements over ${HISTORY_DAYS} days.`,
      );
    },
    { timeout: 300_000, maxWait: 10_000 },
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
