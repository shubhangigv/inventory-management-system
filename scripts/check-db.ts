// Verifies that the app can reach the local PostgreSQL database.
// Run with: npm run db:check
import "dotenv/config";
import { prisma } from "../lib/prisma";

async function main() {
  const [info] = await prisma.$queryRaw<
    { version: string; database: string; user: string }[]
  >`SELECT version() AS version, current_database() AS database, current_user AS user`;

  console.log("Connected to PostgreSQL");
  console.log(`  Database: ${info.database}`);
  console.log(`  User:     ${info.user}`);
  console.log(`  Server:   ${info.version}`);
}

main()
  .catch((error: unknown) => {
    console.error("Could not connect to PostgreSQL.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
