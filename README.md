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
lib/services/*.ts         business logic and transactions (products, inventory, sales, catalogue,
                          settings, reports); the only code that talks to the database
lib/money.ts              Decimal helpers and sale total calculation
lib/cents.ts              integer-cent totals for the browser (checkout preview only)
lib/errors.ts             AppError: expected errors with user-friendly messages
lib/action-state.ts       result type shared by Server Actions and forms (client-safe)
lib/form-actions.ts       server-side helpers: FormData parsing, errors -> form feedback
app/<area>/page.tsx       pages: dashboard (/), products, inventory, sales, categories,
                          suppliers, settings
app/<area>/actions.ts     Server Actions: read the form, call a service, refresh the pages
app/components/           shared UI (buttons, cards, tables, form fields, nav, chart)
scripts/                  db:check, db:verify, db:setup
```

## How the app is built

- **Pages** are Server Components. Data is read in an async component inside `<Suspense>`,
  so the page frame shows instantly and the numbers stream in (required by Cache Components).
  Nothing is cached: every request reads current stock and sales.
- **Forms** call Server Actions through `useActionState`. An action validates with the Zod
  schemas (via the service), returns field errors or a message, and calls `revalidateApp()` so
  every page shows the new data.
- **Client Components** never import `lib/services`, `lib/errors` or the Prisma client; prices
  are passed to them as `"12.50"` strings because `Decimal` can't cross to the browser.
- **The checkout** sends only product IDs, quantities and payments. The server reloads prices,
  recalculates totals and rejects the sale if the payments don't match.
- **Not built yet:** login and user roles. Actions carry a `TODO(auth)` where the session check
  and `userId` belong; until then the ledger and sales record no user.
