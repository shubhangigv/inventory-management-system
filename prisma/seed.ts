// Development seed data. Safe to run more than once: it uses upsert,
// so it creates missing rows and updates existing ones without deleting anything.
// Run with: npm run db:seed
import "dotenv/config";
import { prisma } from "../lib/prisma";

const categories = [
  { name: "Electronics", description: "Devices and accessories" },
  { name: "Stationery", description: "Office and school supplies" },
  { name: "Groceries", description: "Packaged food and drinks" },
];

const products = [
  { sku: "ELEC-001", name: "USB-C Charger 65W", price: "1499.00", costPrice: "950.00", quantity: 40, category: "Electronics" },
  { sku: "ELEC-002", name: "Wireless Mouse", price: "799.00", costPrice: "450.00", quantity: 8, category: "Electronics" },
  { sku: "STAT-001", name: "A4 Notebook (200 pages)", price: "120.00", costPrice: "70.00", quantity: 150, category: "Stationery" },
  { sku: "STAT-002", name: "Gel Pen (Blue)", price: "25.00", costPrice: "12.00", quantity: 5, category: "Stationery" },
  { sku: "GROC-001", name: "Green Tea (100 bags)", price: "350.00", costPrice: "220.00", quantity: 60, category: "Groceries" },
];

async function main() {
  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: { description: category.description },
      create: category,
    });
  }

  for (const { category, ...product } of products) {
    const data = { ...product, category: { connect: { name: category } } };
    await prisma.product.upsert({
      where: { sku: product.sku },
      update: data,
      create: data,
    });
  }

  console.log(`Seeded ${categories.length} categories and ${products.length} products.`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
