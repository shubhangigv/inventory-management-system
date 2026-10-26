"""Demand forecasting for Stockora.

Reads daily sales per product from PostgreSQL, trains a scikit-learn model,
checks it against a simple baseline on data it never saw, and writes a
14-day forecast plus a reorder suggestion for every product.

    python forecasting/forecast.py            # train, forecast, save
    python forecasting/forecast.py --dry-run  # print the results only

How it works
------------
1. History: units sold per product per day (completed sales only), with
   zero for days without sales. Today is left out because it isn't over.
   Days that ended sold out are marked as stockouts: sales that day show
   what was on the shelf, not what customers wanted. They are left out of
   training and scoring, and filled with the recent average as model input.
2. Model: one HistGradientBoostingRegressor trained on every product at
   once. Inputs are the weekday, the day of the month, and recent sales
   (yesterday, the same weekday over the last 4 weeks, the 7-day average).
   Sales are divided by the product's 28-day average, so milk (40/day) and
   chilli powder (0.5/day) teach the model the same weekly and salary-day
   patterns. It predicts one day at a time, feeding predictions back in.
3. Baseline: the average of the last 28 days, repeated.
4. Backtest: both forecast the last 14 days of history from the days before
   it. Each product keeps whichever was more accurate (lower MAE). Slow
   movers often keep the average: with mostly-zero days there is little
   pattern to learn.
5. Reorder, using the supplier's delivery time (L) and order cycle (R):
   safety stock = z * forecast error (RMSE) * sqrt(L + R)
   reorder point = forecast demand over L + safety stock
   at or below it, order up to: forecast demand over L + R + safety stock.
"""

from __future__ import annotations

import argparse
import math
import os
import sys
import uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import numpy as np
import psycopg
from dotenv import load_dotenv
from sklearn.ensemble import HistGradientBoostingRegressor

HISTORY_DAYS = 182
HORIZON_DAYS = 14
WINDOW = 28  # days of history the features look back over
MIN_DAYS_TO_FORECAST = WINDOW + HORIZON_DAYS  # enough to backtest the baseline
MIN_DAYS_FOR_MODEL = 70  # enough for the model to learn something per product
BACKTEST_FOLDS = 3  # two-week windows tested, newest last
FAST_PER_DAY = 5.0
SLOW_PER_DAY = 1.0
Z_SCORES = {0.90: 1.282, 0.95: 1.645, 0.98: 2.054, 0.99: 2.326}
KEEP_RUNS = 10


# ---------- Data ----------


@dataclass
class Product:
    id: str
    sku: str
    name: str
    stock: int
    lead_time: int
    order_cycle: int
    first_day: date
    sales: np.ndarray  # units sold per day, oldest first, ending yesterday
    stockout: np.ndarray  # True where the day ended with no stock
    clean: np.ndarray = None  # sales with stockout days filled in (model input)

    def __post_init__(self):
        self.clean = fill_stockouts(self.sales, self.stockout)


def fill_stockouts(sales: np.ndarray, stockout: np.ndarray) -> np.ndarray:
    """Replaces stockout days with the average of the uncensored days before them."""
    clean = sales.astype(float).copy()
    for t in np.flatnonzero(stockout):
        window = clean[max(0, t - WINDOW):t][~stockout[max(0, t - WINDOW):t]]
        if window.size:
            clean[t] = max(clean[t], window.mean())  # never below what actually sold
    return clean


def database_url() -> str:
    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
    url = os.environ.get("DATABASE_URL")
    if not url:
        sys.exit("DATABASE_URL is not set. Copy .env.example to .env and fill it in.")
    # "?schema=public" is a Prisma option; libpq rejects unknown parameters.
    parts = urlsplit(url)
    query = [(k, v) for k, v in parse_qsl(parts.query) if k != "schema"]
    return urlunsplit(parts._replace(query=urlencode(query)))


def load_products(conn: psycopg.Connection, today: date, lead_default: int, cycle_default: int) -> list[Product]:
    # Timestamps are stored in UTC; shift them to the server's local time
    # before taking the date, the same way the dashboard groups sales by day.
    params = {
        "offset": datetime.now().astimezone().utcoffset() or timedelta(0),
        "first": today - timedelta(days=HISTORY_DAYS),
        "today": today,
    }

    rows = conn.execute(
        """
        SELECT p."id", p."sku", p."name", p."stockQuantity", s."leadTimeDays", s."orderCycleDays",
               GREATEST((p."createdAt" + %(offset)s)::date, %(first)s) AS since
        FROM "Product" p
        LEFT JOIN "Supplier" s ON s."id" = p."supplierId"
        WHERE p."isActive"
        ORDER BY p."name"
        """,
        params,
    ).fetchall()

    sold: dict[str, dict[date, int]] = {}
    for product_id, day, units in conn.execute(
        """
        SELECT i."productId", (s."soldAt" + %(offset)s)::date AS day, SUM(i."quantity")::int
        FROM "SaleItem" i
        JOIN "Sale" s ON s."id" = i."saleId"
        WHERE s."status" = 'COMPLETED'
          AND (s."soldAt" + %(offset)s)::date >= %(first)s
          AND (s."soldAt" + %(offset)s)::date < %(today)s
        GROUP BY 1, 2
        """,
        params,
    ):
        sold.setdefault(product_id, {})[day] = units

    # Closing stock per product per day: the balance after its last movement that day.
    closing: dict[str, list[tuple[date, int]]] = {}
    for product_id, day, stock_after in conn.execute(
        """
        SELECT DISTINCT ON ("productId", day) "productId", day, "stockAfter"
        FROM (SELECT "productId", "stockAfter", "createdAt", "id",
                     ("createdAt" + %(offset)s)::date AS day
              FROM "StockMovement") m
        WHERE day < %(today)s
        ORDER BY "productId", day, "createdAt" DESC, "id" DESC
        """,
        params,
    ):
        closing.setdefault(product_id, []).append((day, stock_after))

    products = []
    for product_id, sku, name, stock, lead_time, order_cycle, since in rows:
        days = (today - since).days
        daily = sold.get(product_id, {})
        sales = np.array([daily.get(since + timedelta(days=i), 0) for i in range(days)], dtype=float)

        # Carry the closing balance forward over days without movements.
        stockout = np.zeros(days, dtype=bool)
        balance, entries = None, iter(closing.get(product_id, []))
        entry = next(entries, None)
        for i in range(days):
            day = since + timedelta(days=i)
            while entry is not None and entry[0] <= day:
                balance, entry = entry[1], next(entries, None)
            stockout[i] = balance == 0

        products.append(Product(
            product_id, sku, name, stock,
            lead_time if lead_time is not None else lead_default,
            order_cycle if order_cycle is not None else cycle_default,
            since, sales, stockout,
        ))
    return products


# ---------- Model ----------


def features(history: np.ndarray, day: date) -> list[float]:
    """Inputs for predicting `day`, from the WINDOW days before it (stockouts already filled)."""
    level = history[-WINDOW:].mean() + 0.1  # +0.1 keeps slow movers from dividing by ~0
    same_weekday = history[[-7, -14, -21, -28]].mean()
    return [
        day.weekday(),  # categorical: 0 = Monday
        day.day,
        1.0 if day.day <= 5 else 0.0,  # salary days
        history[-1] / level,
        same_weekday / level,
        history[-7:].mean() / level,
        math.log1p(level),  # lets the model treat fast and slow movers differently
    ]


def training_rows(products: list[Product], hold_out: int):
    """(X, y, weights) for every uncensored day with WINDOW days of history before it."""
    X, y, w = [], [], []
    for p in products:
        end = len(p.clean) - hold_out
        for t in range(WINDOW, end):
            if p.stockout[t]:
                continue
            history = p.clean[:t]
            level = history[-WINDOW:].mean() + 0.1
            X.append(features(history, p.first_day + timedelta(days=t)))
            y.append(p.sales[t] / level)
            w.append(level)  # errors on milk count more units than errors on chilli powder
    return np.array(X), np.array(y), np.array(w)


def train(products: list[Product], hold_out: int) -> HistGradientBoostingRegressor:
    model = HistGradientBoostingRegressor(
        loss="squared_error",  # predicts the average, which is what ordering needs
        learning_rate=0.05,
        max_iter=300,
        max_leaf_nodes=15,
        min_samples_leaf=20,
        l2_regularization=1.0,
        categorical_features=[0],
        random_state=0,
    )
    X, y, w = training_rows(products, hold_out)
    model.fit(X, y, sample_weight=w)
    return model


def model_forecast(model, history: np.ndarray, first_day: date, days: int) -> np.ndarray:
    """Predicts one day at a time, feeding each prediction back as history."""
    values = list(history)
    for h in range(days):
        current = np.array(values)
        level = current[-WINDOW:].mean() + 0.1
        ratio = model.predict([features(current, first_day + timedelta(days=h))])[0]
        values.append(max(0.0, ratio * level))
    return np.array(values[len(history):])


def baseline_forecast(history: np.ndarray, days: int) -> np.ndarray:
    return np.full(days, history[-WINDOW:].mean())


# ---------- Reorder maths ----------


def demand_over(forecast: np.ndarray, days: int) -> float:
    """Forecast units over the next `days` days, extending past the horizon at the average rate."""
    if days <= len(forecast):
        return float(forecast[:days].sum())
    return float(forecast.sum() + forecast.mean() * (days - len(forecast)))


def days_of_stock(stock: int, forecast: np.ndarray) -> float | None:
    """Days until the stock runs out at the forecast rate (None if nothing is expected to sell)."""
    if forecast.sum() <= 0:
        return None
    used = 0.0
    for day, demand in enumerate(forecast):
        if used + demand >= stock:
            return day + (stock - used) / demand if demand > 0 else float(day)
        used += demand
    return len(forecast) + (stock - used) / forecast.mean()


def reorder(p: Product, forecast: np.ndarray, error: float, z: float):
    lead, cycle = p.lead_time, p.order_cycle
    safety = math.ceil(z * error * math.sqrt(lead + cycle))
    reorder_point = math.ceil(demand_over(forecast, lead) + safety)
    order_up_to = demand_over(forecast, lead + cycle) + safety
    suggested = max(0, math.ceil(order_up_to - p.stock)) if p.stock <= reorder_point else 0
    return safety, reorder_point, suggested


# ---------- Main ----------


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--dry-run", action="store_true", help="print results without saving them")
    parser.add_argument("--lead-time", type=int, default=2, help="delivery days for products without a supplier (default 2)")
    parser.add_argument("--review", type=int, default=7, help="order cycle for products without a supplier (default 7)")
    parser.add_argument("--service-level", type=float, default=0.95, choices=sorted(Z_SCORES))
    args = parser.parse_args()
    z = Z_SCORES[args.service_level]

    today = date.today()
    with psycopg.connect(database_url()) as conn:
        products = load_products(conn, today, args.lead_time, args.review)
        usable = [p for p in products if len(p.sales) >= MIN_DAYS_TO_FORECAST]
        trainable = [p for p in usable if len(p.sales) >= MIN_DAYS_FOR_MODEL]
        skipped = [p for p in products if len(p.sales) < MIN_DAYS_TO_FORECAST]
        if not usable:
            sys.exit(f"No product has {MIN_DAYS_TO_FORECAST} days of sales history yet. "
                     "For demo data run: npm run db:demo-history")

        # 1. Rolling backtest: for each of the last BACKTEST_FOLDS two-week windows, train on
        #    the days before it, forecast it, and compare on days that weren't sold out.
        results = {p.id: {"actual": [], "base_err": [], "model_err": []} for p in usable}
        for fold in range(BACKTEST_FOLDS, 0, -1):
            hold_out = fold * HORIZON_DAYS
            fold_trainable = [p for p in trainable if len(p.sales) - hold_out >= MIN_DAYS_FOR_MODEL - HORIZON_DAYS]
            model = train(fold_trainable, hold_out) if fold_trainable else None
            start = today - timedelta(days=hold_out)
            for p in usable:
                if len(p.sales) - hold_out < WINDOW:
                    continue
                history = p.clean[:-hold_out]
                window = slice(len(p.sales) - hold_out, len(p.sales) - hold_out + HORIZON_DAYS)
                scored = ~p.stockout[window]
                actual = p.sales[window][scored]
                r = results[p.id]
                r["actual"].append(actual)
                r["base_err"].append(actual - baseline_forecast(history, HORIZON_DAYS)[scored])
                if model is not None and p in fold_trainable:
                    r["model_err"].append(actual - model_forecast(model, history, start, HORIZON_DAYS)[scored])
                else:
                    r["model_err"].append(None)

        join = lambda arrays: np.concatenate(arrays) if arrays else np.array([])  # noqa: E731
        for r in results.values():
            # The model is judged against the baseline on the same folds only.
            both = [i for i, e in enumerate(r["model_err"]) if e is not None]
            model_err = join([r["model_err"][i] for i in both]) if both else None
            base_shared = join([r["base_err"][i] for i in both])
            r["actual_shared"] = join([r["actual"][i] for i in both])
            r["actual"], r["base_err"], r["model_err"] = join(r["actual"]), join(r["base_err"]), model_err
            r["base_shared"] = base_shared
            r["use_model"] = (
                model_err is not None and model_err.size > 0
                and np.abs(model_err).mean() < np.abs(base_shared).mean()
            )

        # 2. Final forecast: retrain on all history and look ahead.
        final_model = train(trainable, 0) if trainable else None
        forecasts = []
        for p in usable:
            r = results[p.id]
            if r["use_model"]:
                forecast = model_forecast(final_model, p.clean, today, HORIZON_DAYS)
                error = r["model_err"]
            else:
                forecast = baseline_forecast(p.clean, HORIZON_DAYS)
                error = r["base_err"]
            rmse = float(np.sqrt(np.mean(error**2))) if error.size else 0.0
            safety, reorder_point, suggested = reorder(p, forecast, rmse, z)
            avg = float(p.clean[-WINDOW:].mean())
            forecasts.append({
                "id": uuid.uuid4().hex,
                "productId": p.id,
                "sku": p.sku,
                "demandClass": "FAST" if avg >= FAST_PER_DAY else "MEDIUM" if avg >= SLOW_PER_DAY else "SLOW",
                "method": "ML_MODEL" if r["use_model"] else "MOVING_AVERAGE",
                "avgDailySales": avg,
                "forecastDaily": [round(float(v), 3) for v in forecast],
                "forecastTotal": float(forecast.sum()),
                "modelMae": float(np.abs(r["model_err"]).mean()) if r["model_err"] is not None and r["model_err"].size else None,
                "baselineMae": float(np.abs(r["base_err"]).mean()) if r["base_err"].size else 0.0,
                "stockOnHand": p.stock,
                "daysOfStock": days_of_stock(p.stock, forecast),
                "stockoutDays": int(p.stockout.sum()),
                "leadTimeDays": p.lead_time,
                "reviewDays": p.order_cycle,
                "safetyStock": safety,
                "reorderPoint": reorder_point,
                "suggestedOrder": suggested,
            })

        # 3. Overall accuracy, on the products and windows both methods forecast (a fair comparison).
        compared = [r for r in results.values() if r["model_err"] is not None and r["model_err"].size]
        if compared:
            actual_units = sum(r["actual_shared"].sum() for r in compared) or 1.0
            base_errors = [r["base_shared"] for r in compared]
        else:  # no product has enough history for the model: report the baseline alone
            compared = list(results.values())
            actual_units = sum(r["actual"].sum() for r in compared) or 1.0
            base_errors = [r["base_err"] for r in compared]

        def pooled(errors):
            joined = np.concatenate(errors)
            return float(np.abs(joined).mean()), float(np.abs(joined).sum() / actual_units)

        base_mae, base_wape = pooled(base_errors)
        if compared[0]["model_err"] is not None:
            model_mae, model_wape = pooled([r["model_err"] for r in compared])
            chosen_mae, chosen_wape = pooled([r["model_err"] if r["use_model"] else r["base_shared"] for r in compared])
        else:
            model_mae, model_wape = chosen_mae, chosen_wape = base_mae, base_wape

        print_report(forecasts, skipped, base_mae, base_wape, model_mae, model_wape, chosen_mae, chosen_wape)
        if args.dry_run:
            print("\nDry run: nothing saved.")
            return

        with conn.transaction():
            run_id = uuid.uuid4().hex
            conn.execute(
                """
                INSERT INTO "ForecastRun" ("id", "historyDays", "horizonDays", "leadTimeDays", "reviewDays",
                  "serviceLevel", "modelMae", "baselineMae", "chosenMae", "modelWape", "baselineWape", "chosenWape")
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (run_id, HISTORY_DAYS, HORIZON_DAYS, args.lead_time, args.review, args.service_level,
                 model_mae, base_mae, chosen_mae, model_wape, base_wape, chosen_wape),
            )
            with conn.cursor() as cur:
                cur.executemany(
                    """
                    INSERT INTO "DemandForecast" ("id", "runId", "productId", "demandClass", "method",
                      "avgDailySales", "forecastDaily", "forecastTotal", "modelMae", "baselineMae",
                      "stockOnHand", "daysOfStock", "stockoutDays", "leadTimeDays", "reviewDays",
                      "safetyStock", "reorderPoint", "suggestedOrder")
                    VALUES (%(id)s, %(runId)s, %(productId)s, %(demandClass)s, %(method)s,
                      %(avgDailySales)s, %(forecastDaily)s, %(forecastTotal)s, %(modelMae)s, %(baselineMae)s,
                      %(stockOnHand)s, %(daysOfStock)s, %(stockoutDays)s, %(leadTimeDays)s, %(reviewDays)s,
                      %(safetyStock)s, %(reorderPoint)s, %(suggestedOrder)s)
                    """,
                    [{**f, "runId": run_id} for f in forecasts],
                )
            # Keep the latest few runs for comparison; forecasts go with their run.
            conn.execute(
                """DELETE FROM "ForecastRun" WHERE "id" NOT IN
                   (SELECT "id" FROM "ForecastRun" ORDER BY "createdAt" DESC LIMIT %s)""",
                (KEEP_RUNS,),
            )
        print(f"\nSaved forecast run {run_id} ({len(forecasts)} products).")


def print_report(forecasts, skipped, base_mae, base_wape, model_mae, model_wape, chosen_mae, chosen_wape):
    print(f"Rolling backtest, {BACKTEST_FOLDS} x {HORIZON_DAYS} days (units/day MAE, WAPE):")
    print(f"  Moving average : MAE {base_mae:6.2f}   WAPE {base_wape:6.1%}")
    print(f"  ML model       : MAE {model_mae:6.2f}   WAPE {model_wape:6.1%}")
    print(f"  Best per item  : MAE {chosen_mae:6.2f}   WAPE {chosen_wape:6.1%}")
    if base_mae > 0:
        print(f"  Error reduced by {1 - chosen_mae / base_mae:.1%} vs the moving average\n")
    print(f"{'SKU':<10} {'Class':<7} {'Method':<15} {'Avg/day':>7} {'Next 14d':>8} {'Stock':>6} "
          f"{'Days':>5} {'L/R':>5} {'Out':>4} {'ROP':>5} {'Order':>6}")
    for f in sorted(forecasts, key=lambda f: (-f["suggestedOrder"], f["sku"])):
        days = f"{f['daysOfStock']:.1f}" if f["daysOfStock"] is not None else "-"
        print(f"{f['sku']:<10} {f['demandClass']:<7} {f['method']:<15} {f['avgDailySales']:7.2f} "
              f"{f['forecastTotal']:8.1f} {f['stockOnHand']:6d} {days:>5} {f['leadTimeDays']:>2}/{f['reviewDays']:<2} "
              f"{f['stockoutDays']:4d} {f['reorderPoint']:5d} {f['suggestedOrder']:6d}")
    if skipped:
        print(f"\nNot enough history ({MIN_DAYS_TO_FORECAST}+ days needed): " + ", ".join(p.sku for p in skipped))


if __name__ == "__main__":
    main()
