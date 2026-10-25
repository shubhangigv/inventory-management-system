# Inventory Management System: Interview Study Notes

Learning mode: each question has a model answer and a "why it matters" note.
Progress: Rounds 1–2 done. **Next: Round 3, Database design.**

Rounds planned:
1. Project overview ✅
2. Tech stack ✅
3. Database design: tables, relationships, constraints
4. Business logic: stock, sales, money, concurrency
5. Next.js specifics: Server Components, Server Actions, Suspense, Cache Components
6. Testing, debugging and problems we hit
7. Trade-offs and what's next

---

## Round 1: Project overview

### Q1. "Give me an overview of the project."
It's an inventory management and point-of-sale system for a small retail shop. The shop can manage its
product catalogue, track stock, record sales at the counter, and see how the business is doing on a
dashboard.
- **Products:** create, edit and deactivate products, with SKU, cost price, selling price and reorder level.
- **Stock management:** receive deliveries and make adjustments. Every change is recorded in a stock
  history that can't be edited.
- **Point of sale:** search or scan products, build a cart, apply a discount, calculate tax, and take
  split payments such as cash plus UPI.
- **Sales and invoices:** a printable invoice for every sale. Sales can be cancelled, which returns the
  stock, but never deleted.
- **Dashboard:** revenue, gross profit, stock value, low-stock alerts, top products and a revenue chart.

Built with Next.js, React and TypeScript, with PostgreSQL as the database and Prisma for database access.

*Why it matters:* answer in the order **problem → users → features → tech**.

### Q2. "What was the most important design goal?"
**Data correctness**, especially for stock and money:
1. **Stock is auditable.** The stock number on a product only changes through `applyStockMovement`, which
   writes a `StockMovement` row in the same transaction. The sum of a product's movements always equals
   its stock, and `npm run db:verify` checks this.
2. **Money is exact.** All amounts use `Decimal(12,2)`, never floating point (in JavaScript,
   `0.1 + 0.2 = 0.30000000000000004`).
3. **History never changes.** A sale copies the product's name, SKU, price and cost at the time of sale,
   so old invoices stay correct after a product is edited.

### Q3. "Walk me through what happens when a cashier completes a sale."
1. The checkout screen shows a **preview** of the totals, then sends only **product IDs, quantities,
   payments and the discount**, never prices.
2. The Server Action `createSaleAction` calls the service `createSale`.
3. `createSale` runs everything in **one database transaction**:
   - loads the products and uses **their** current prices
   - checks each product is active and has enough stock
   - takes the next invoice number from the settings table
   - calculates subtotal, discount, tax and total with Decimal
   - checks the **payments add up exactly** to the total
   - saves the sale, its items (with price snapshots) and its payments
   - removes the stock through `applyStockMovement` (one `SALE` movement per product)
4. If any step fails, **everything rolls back**: no sale, no stock change, no invoice number used up.
5. On success, the action refreshes the pages and redirects to the invoice.

*Key phrases:* one transaction · server doesn't trust client prices · rollback.

### Q4. "Why doesn't the client send prices?"
Anything from the browser can be changed: a user could edit the request and buy a ₹1,499 item for ₹1. The
browser says *what* and *how many*; the server decides *how much*. The browser total is only a preview,
and the server rejects the sale if the payments don't match its own total.

---

## Round 2: Tech stack

### Q5. "Why Next.js?"
Frontend and backend in one project:
- **Server Components** read the database while rendering. There's no separate API, and secrets never
  reach the browser.
- **Server Actions** handle form submissions by calling a server function directly.
- **File-based routing:** `app/products/[id]/page.tsx` becomes `/products/:id`.
- **Streaming with Suspense:** the page layout shows instantly and the data loads in as it's ready.

Next.js 16 with **Cache Components** turned on: any data that isn't cached must load inside a
`<Suspense>` boundary, so every page is a static shell plus streamed live data.

### Q6. "Server vs Client Components in your app?"
- **Server Components** (the default) run on the server, can query the database, send HTML and add no
  JavaScript to the browser. Examples: product list, invoice, dashboard.
- **Client Components** (`"use client"`) run in the browser, for state, events and hooks. Used for the
  checkout (cart state, live totals), forms (`useActionState`), the chart (hover) and the sidebar
  (`usePathname`).
- **Bug story:** the first build crashed because a form imported a file that pulled in the Prisma client.
  Fix: split it into `lib/action-state.ts` (safe for the browser) and `lib/form-actions.ts` (server-only).

### Q7. "What is Prisma and why use it?"
A TypeScript **ORM**. The tables are described in `prisma/schema.prisma`, and Prisma gives:
- a **typed client** (errors caught at compile time)
- **migrations** (versioned SQL files)
- **transactions** with `prisma.$transaction` (the sale logic depends on this)

Dashboard reports use parameterised **raw SQL** (`$queryRaw`) for grouping revenue by day in a specific
time zone. It's still safe from SQL injection.

### Q8. "Why PostgreSQL?"
Reliable and relational: **transactions, foreign keys, row locking, CHECK constraints**. Rules that
Prisma's schema can't express are CHECK constraints in the migration, such as `stockQuantity >= 0` and
`price >= 0`, so the database refuses impossible data even if the code has a bug.

### Q9. "What do Zod and Tailwind do?"
- **Zod** validates input on the server (schemas in `lib/validation`), for example the price format, the
  SKU characters (converted to capitals) and a tax rate of 0–100. Errors appear next to each form field.
- **Tailwind CSS** handles styling with utility classes in the components: dark mode, the phone layout,
  consistent spacing.

---

## Quick revision for Rounds 1 and 2
- Inventory plus point of sale; correctness comes first: stock history, Decimal money, history that
  never changes.
- The sale is **one transaction**, the **server sets the prices**, and **everything rolls back** on
  failure.
- Server Components read data, Client Components handle interaction, Server Actions handle changes.
- Prisma gives typed queries and migrations; PostgreSQL adds constraints, locks and transactions.
