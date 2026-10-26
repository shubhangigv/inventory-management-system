# Stockora: inventory, sales and demand forecasting

Next.js (App Router) + TypeScript + Tailwind CSS, with Prisma ORM v7 on a local PostgreSQL database (no Docker).
Demand forecasting is a Python job (scikit-learn) that writes its results to the same database.

## Getting started

```bash
npm install            # also runs prisma generate
copy .env.example .env # then put your real DATABASE_URL in .env (never commit it)
npm run db:check       # can the app reach PostgreSQL?
npm run db:migrate     # apply migrations (prisma migrate dev)
npm run db:seed        # add sample data (safe to run again)
npm run dev            # http://localhost:3000

# Demand forecast (needs Python 3.11+ and the `py` launcher on Windows)
npm run forecast:setup   # creates forecasting/.venv and installs scikit-learn etc.
npm run db:demo-history  # dev only: 6 months of grocery sales for the model to learn from
npm run forecast         # train, backtest, save the forecast (or press "Run forecast" in the app)
```

The seed creates two demo logins, both with the password `demo-password`:
`admin@demo.local` (Admin) and `staff@demo.local` (Staff). They are for development only.
On a real database, skip the seed and create the first admin with `npm run db:create-admin`.

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
| `npm run db:create-admin` | Creates an admin account (asks for name, email and password) |
| `npm run db:studio` | Opens Prisma Studio to browse the data |
| `npm run db:demo-history` | Dev only: adds 13 grocery products with 6 months of sales and stock history (`-- --reset` regenerates it) |
| `npm run forecast:setup` | Creates the Python virtual environment and installs `forecasting/requirements.txt` |
| `npm run forecast` | Trains the model, backtests it and saves a new forecast run (`-- --dry-run` only prints) |
| `npm run lint` / `npm run typecheck` | ESLint / TypeScript checks |

## Database design

```
Category 1─* Product *─1 Supplier
                │
                ├─* StockMovement *─0..1 Sale     (stock ledger)
                └─* SaleItem *─1 Sale 1─* Payment
User 1─* Sale,  User 1─* StockMovement             (who did it)
User 1─* Session                                   (logged-in browsers)
BusinessSettings                                   (single row: name, tax rate, invoice numbering)
ForecastRun 1─* DemandForecast *─1 Product         (written by forecasting/forecast.py)
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
lib/auth.ts               who is logged in: session cookie, requireUser(), requireAdmin()
lib/password.ts           scrypt password hashing
proxy.ts                  sends visitors without a session cookie to /login (first gate only)
app/login/                login page, login and logout actions
app/(app)/<area>/page.tsx pages behind the login, sharing the sidebar layout: dashboard (/),
                          products, inventory, sales, categories, suppliers, users, settings,
                          account
app/(app)/<area>/actions.ts  Server Actions: check the user, read the form, call a service,
                          refresh the pages
app/components/           shared UI (buttons, cards, tables, form fields, nav, chart, user menu)
scripts/                  db:check, db:verify, db:setup, db:create-admin, db:demo-history
forecasting/forecast.py   demand forecast: training, backtest, reorder maths (Python)
lib/services/forecasts.ts reads forecasts, recalculates reorder advice, runs the Python job
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
- **Login** uses database sessions. The cookie (httpOnly, SameSite=Lax, Secure in production)
  holds a random token; the `Session` table stores only its SHA-256 hash. Sessions last 7 days.
  Logging out, deactivating a user or resetting their password deletes the rows, so access ends
  at once. Passwords are hashed with scrypt.
- **Every page and every Server Action checks the user itself** (`requireUser()` /
  `requireAdmin()` in `lib/auth.ts`). `proxy.ts` only redirects visitors without a cookie, and
  hiding buttons from staff is a convenience, not the protection.
- **Roles:**

  | | Staff | Admin |
  | --- | :-: | :-: |
  | View dashboard, products, stock history, sales | ✓ | ✓ |
  | Make and cancel sales | ✓ | ✓ |
  | Receive and adjust stock | ✓ | ✓ |
  | Create, edit, deactivate products | | ✓ |
  | Manage categories, suppliers, settings | | ✓ |
  | Manage users | | ✓ |

  Sales and stock movements record who made them. Admins can't change their own role or
  deactivate themselves, and there is always at least one active admin.
- **Demand forecast** (`/forecast`, see the next section) predicts each product's sales for 14 days
  and turns them into a reorder plan. Staff can view it; only admins can start a new run.
- **CSV export:** the Products and Sales pages have an *Export CSV* button that downloads
  everything matching the current filters (`/products/export`, `/sales/export`). Cells that
  start with `=`, `+`, `-` or `@` are prefixed with `'` so spreadsheets don't run them as formulas.
- **Brute-force protection:** each failed login is stored in `LoginAttempt` by email. After 5
  failures in 15 minutes that email is locked until the window passes; a successful login
  clears its attempts. Unknown emails are limited the same way.

## Demand forecasting

A fixed reorder level treats milk (40 sold a day, delivered daily) and chilli powder (one sold every
two days, ordered weekly) the same way. The forecast learns each product's own demand instead.

**Pipeline** (`forecasting/forecast.py`, run with `npm run forecast` or the *Run forecast* button):

1. **History:** units sold per product per day over the last 182 days (completed sales only).
   Days that ended sold out are marked as stockouts: their sales show what was on the shelf, not
   what customers wanted, so they are left out of training and scoring.
2. **Model:** one scikit-learn `HistGradientBoostingRegressor` trained on all products. Features:
   weekday, day of month, salary days (1st–5th), yesterday's sales, the same weekday over the last
   4 weeks, and the 7-day average. Sales are divided by each product's 28-day average, so fast and
   slow sellers teach the model the same patterns. It forecasts one day at a time for 14 days.
3. **Baseline and backtest:** a plain 28-day moving average. Both are tested on the last 6 weeks
   (three 2-week windows the model never saw). Each product keeps whichever had the lower error;
   slow sellers often keep the average, because mostly-zero days have little pattern to learn.
4. **Reorder plan,** using the supplier's delivery time *L* and order cycle *R* (set on the
   supplier form, e.g. milk 1/1 days, staples 3/7 days) and a 95% service level (z = 1.645):
   - safety stock = z × forecast RMSE × √(L + R)
   - reorder point = forecast demand over L + safety stock
   - at or below it, order enough to cover L + R days plus safety stock.

   The app recalculates days of stock, status and order quantity against current stock, so
   sales made after the run still count.

**Results on the demo data** (6 months of simulated grocery sales from `db:demo-history`, with
weekend, salary-day and trend patterns): forecast error (WAPE) 23.9% vs 26.5% for the moving
average, about 10% lower MAE. Daily sales are noisy (Poisson), so a large part of the error can't
be predicted by any model. Products with less than 6 weeks of history are not forecast and keep
their fixed reorder level.

**Limitations:** no yearly seasonality or festivals (6 months of history is too short to learn
them); stockout days are skipped rather than estimated; the model is retrained on each run, not
scheduled (run it daily from a scheduler in production).

See [docs/workflow.md](docs/workflow.md) for the day-to-day shop workflow and the developer workflow.
