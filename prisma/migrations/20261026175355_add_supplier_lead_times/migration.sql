-- Forecast details per product. DemandForecast has no rows before this
-- migration, so the new columns need no default.
ALTER TABLE "DemandForecast" ADD COLUMN     "leadTimeDays" INTEGER NOT NULL,
ADD COLUMN     "reviewDays" INTEGER NOT NULL,
ADD COLUMN     "stockoutDays" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN     "leadTimeDays" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "orderCycleDays" INTEGER NOT NULL DEFAULT 7;

-- CHECK constraints (added by hand: Prisma schema syntax cannot express them).
ALTER TABLE "Supplier"
  ADD CONSTRAINT "Supplier_leadTimeDays_check"   CHECK ("leadTimeDays" BETWEEN 0 AND 60),
  ADD CONSTRAINT "Supplier_orderCycleDays_check" CHECK ("orderCycleDays" BETWEEN 1 AND 60);