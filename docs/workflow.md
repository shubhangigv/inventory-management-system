# Workflow

How the shop uses the app day to day, and how a developer runs and changes it.

## 1. Daily use (shop workflow)

```
Admin sets up            Stock arrives            Customer buys            End of day
─────────────            ─────────────            ─────────────            ──────────
Settings (name, tax,  →  Inventory → Receive  →   Sales → New sale     →   Dashboard: revenue,
invoice prefix)          stock (STOCK_IN)         (POS checkout)            low stock, top items
Categories, Suppliers                             invoice INV-000123       Sales → Export CSV
Products (SKU, prices,   Count / damage? →        stock goes down          Products → Low stock
reorder level)           Adjust stock             automatically            → reorder from supplier
Users (Admin / Staff)    (ADJUSTMENT, ±)  
```

### Setting up (Admin, once)
1. Log in as an admin (`admin@demo.local` / `demo-password` on the dev database).
2. **Settings**: business name, address, currency, tax rate (%), invoice prefix.
3. **Categories** and **Suppliers**: create the lists products will use.
4. **Products → New product**: SKU, name, cost price, selling price, reorder level,
   category, supplier and opening stock.
5. **Users**: add staff accounts. Staff can sell and move stock; only admins edit the catalogue,
   settings and users.

### Receiving and correcting stock (Staff or Admin)
- **Inventory → Receive stock** when a delivery arrives. Stock goes up and a `STOCK_IN` movement
  is recorded with who did it.
- **Inventory → Adjust stock** after a stock count, damage or loss (positive or negative, with a
  reason). Stock can never go below zero.
- The **stock history** table on the Inventory page and on each product shows every change.

### Selling (Staff or Admin)
1. **Sales → New sale** opens the point-of-sale screen.
2. Search or click products to add them; change quantities; add an optional discount and customer name.
3. Add one or more payments (cash, card, UPI, bank transfer). They must add up to the total.
4. **Complete sale**: the server re-checks prices and stock, saves the sale, takes the stock out
   and gives the next invoice number. The invoice page can be printed.
5. A mistake? Open the sale and **Cancel sale** with a reason. Stock goes back; the invoice stays
   in the list marked *Cancelled*.

### Reviewing
- **Dashboard**: revenue and gross profit for today and the last 30 days, a 14-day revenue chart,
  low-stock products, top products and recent sales.
- **Products → Low stock** filter: everything at or below its reorder level. Use **Export CSV** to
  send the list to a supplier.
- **Sales**: filter by date, status or customer, then **Export CSV** for accounting.

### Accounts and security
- **Account**: change your own password (other browsers are logged out).
- Admins can reset someone's password or deactivate them on **Users**; their sessions end at once.
- After 5 wrong passwords in 15 minutes, that email is locked for 15 minutes.

## 2. Request flow (how the code handles an action)

```
Browser form ──► proxy.ts ──► Server Action (app/(app)/<area>/actions.ts)
                 (has a          │ requireUser() / requireAdmin()   ← real auth check
                  cookie?)       │ read FormData
                                 ▼
                              Service (lib/services/*.ts)
                                 │ Zod validation (lib/validation)
                                 │ Prisma transaction (stock + movement, sale + invoice no.)
                                 ▼
                              PostgreSQL (CHECK constraints as the last safety net)
                                 │
                 ◄── revalidateApp() refreshes pages; errors become form messages
```

Pages read data the same way: a Server Component calls `requireUser()`, then a service, inside
`<Suspense>`. CSV downloads are route handlers (`app/(app)/products/export`, `app/(app)/sales/export`).

## 3. Developer workflow

### First run (Windows, local PostgreSQL)
```bash
npm install
copy .env.example .env      # set DATABASE_URL
npm run db:setup            # creates the inventory_app login and database (once)
npm run db:migrate          # apply migrations
npm run db:seed             # demo data + demo logins
npm run dev                 # http://localhost:3000
```

### Making a change
1. Branch from `main`: `git checkout -b feat/<name>`.
2. Database change? Edit `prisma/schema.prisma`, then `npm run db:migrate -- --name <what>`.
   Never edit a migration that has already been applied.
3. Business rules go in `lib/services`, input rules in `lib/validation`, UI in `app/`.
4. Check before committing:
   ```bash
   npm run typecheck
   npm run lint
   npm run build
   npm run db:verify          # stock and sale totals still consistent
   ```
5. Commit, push, open a pull request into `main`.

### Production
```bash
npm ci
npm run db:deploy           # apply migrations only, never prisma migrate dev
npm run db:create-admin     # first admin (don't seed a real database)
npm run build
npm run start               # serve on port 3000 (behind HTTPS so the Secure cookie works)
```
Set `DATABASE_URL` and `NODE_ENV=production` in the server environment.
