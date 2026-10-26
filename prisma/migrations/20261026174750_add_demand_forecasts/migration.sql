-- CreateEnum
CREATE TYPE "DemandClass" AS ENUM ('FAST', 'MEDIUM', 'SLOW');

-- CreateEnum
CREATE TYPE "ForecastMethod" AS ENUM ('ML_MODEL', 'MOVING_AVERAGE');

-- CreateTable
CREATE TABLE "ForecastRun" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "historyDays" INTEGER NOT NULL,
    "horizonDays" INTEGER NOT NULL,
    "leadTimeDays" INTEGER NOT NULL,
    "reviewDays" INTEGER NOT NULL,
    "serviceLevel" DOUBLE PRECISION NOT NULL,
    "modelMae" DOUBLE PRECISION NOT NULL,
    "baselineMae" DOUBLE PRECISION NOT NULL,
    "chosenMae" DOUBLE PRECISION NOT NULL,
    "modelWape" DOUBLE PRECISION NOT NULL,
    "baselineWape" DOUBLE PRECISION NOT NULL,
    "chosenWape" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ForecastRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "demandClass" "DemandClass" NOT NULL,
    "method" "ForecastMethod" NOT NULL,
    "avgDailySales" DOUBLE PRECISION NOT NULL,
    "forecastDaily" DOUBLE PRECISION[],
    "forecastTotal" DOUBLE PRECISION NOT NULL,
    "modelMae" DOUBLE PRECISION,
    "baselineMae" DOUBLE PRECISION NOT NULL,
    "stockOnHand" INTEGER NOT NULL,
    "daysOfStock" DOUBLE PRECISION,
    "safetyStock" INTEGER NOT NULL,
    "reorderPoint" INTEGER NOT NULL,
    "suggestedOrder" INTEGER NOT NULL,
    "runId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,

    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ForecastRun_createdAt_idx" ON "ForecastRun"("createdAt");

-- CreateIndex
CREATE INDEX "DemandForecast_productId_idx" ON "DemandForecast"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "DemandForecast_runId_productId_key" ON "DemandForecast"("runId", "productId");

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ForecastRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
