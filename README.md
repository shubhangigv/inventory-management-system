# Inventory Management System

Next.js (App Router) + TypeScript + Tailwind CSS, with Prisma ORM v7 on a local PostgreSQL database (no Docker).

## Getting started

```bash
npm install            # also runs prisma generate
copy .env.example .env # then put your real DATABASE_URL in .env (never commit it)
npm run db:check       # can the app reach PostgreSQL?
npm run db:migrate     # apply migrations (prisma migrate dev)
npm run db:seed        # add sample data (safe to run again)
npm run dev            # http://localhost:3000
```

`npm run db:setup` (Windows) creates the `inventory_app` login and `inventory_management` database if they don't exist yet.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run db:check` | Connects to PostgreSQL and prints the database, user and server version |
| `npm run db:migrate` | Creates/applies migrations in development (`prisma migrate dev`) |
| `npm run db:deploy` | Applies existing migrations only (`prisma migrate deploy`), for production |
| `npm run db:generate` | Regenerates the Prisma Client into `app/generated/prisma` |
| `npm run db:seed` | Inserts sample data; only creates rows that are missing |
| `npm run db:verify` | Read-only consistency checks (stock vs. ledger, sale totals vs. items and payments) |
| `npm run db:studio` | Opens Prisma Studio to browse the data |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |

## Database design

```
Category 1─* Product *─1 Supplier
                │
                ├─* StockMovement *─0..1 Sale     (stock ledger)
                └─* SaleItem *─1 Sale 1─* Payment
User 1─* Sale,  User 1─* StockMovement             (who did it)
BusinessSettings                                   (single row: name, tax rate, invoice numbering)
```

- **Money** uses `Decimal(12, 2)`; quantities use `Int`.
- **Stock is auditable.** `Product.stockQuantity` only changes through `applyStockMovement()` in
  `lib/services/inventory.ts`, which writes a `StockMovement` row in the same transaction.
  The sum of a product's movements always equals its stock (`npm run db:verify` checks this).
- **Sales are history.** A `SaleItem` copies the product name, SKU, selling price and cost price at
  the time of sale, and the `Sale` stores its totals, so invoices never change after a product is edited.
  Sales are cancelled (status `CANCELLED`, stock returned), never deleted.
- **Payments** are separate rows, so one sale can be paid in several ways (e.g. card + UPI).
  They must add up to the sale total.
- **Deletion rules.** Products, sales and users with history can't be deleted (deactivate them instead).
  Deleting a category or supplier only removes the link from its products.
- **CHECK constraints** in the init migration stop impossible values (negative stock, negative prices)
  even if application code has a bug.

## Code layout

```
prisma/schema.prisma      tables, relations, indexes
prisma/migrations/        SQL migrations (never edit one that has been applied)
prisma/seed.ts            sample data
lib/prisma.ts             the shared Prisma Client (PostgreSQL driver adapter)
lib/validation/*.ts       Zod schemas for user input
lib/services/*.ts         business logic and transactions (products, inventory, sales, settings)
lib/money.ts              Decimal helpers and sale total calculation
lib/errors.ts             AppError: expected errors with user-friendly messages
scripts/                  db:check, db:verify, db:setup
```
