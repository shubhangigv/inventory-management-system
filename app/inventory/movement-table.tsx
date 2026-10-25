import Link from "next/link";
import type { StockMovementType } from "@/app/generated/prisma/enums";
import { Badge, cx, EmptyState, Table, Td, Th } from "@/app/components/ui";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { listStockMovements } from "@/lib/services/inventory";

type Movement = Awaited<ReturnType<typeof listStockMovements>>["rows"][number];

export const movementTypeLabels: Record<StockMovementType, string> = {
  STOCK_IN: "Received",
  SALE: "Sale",
  SALE_CANCELLED: "Sale cancelled",
  ADJUSTMENT: "Adjustment",
};

const movementTypeTones = {
  STOCK_IN: "green",
  SALE: "blue",
  SALE_CANCELLED: "amber",
  ADJUSTMENT: "neutral",
} as const;

export function MovementTable({ movements, showProduct = true }: { movements: Movement[]; showProduct?: boolean }) {
  if (movements.length === 0) {
    return <EmptyState title="No stock changes yet" />;
  }

  return (
    <Table>
      <thead>
        <tr>
          <Th>Date</Th>
          {showProduct && <Th>Product</Th>}
          <Th>Type</Th>
          <Th align="right">Change</Th>
          <Th align="right">Balance</Th>
          <Th>Details</Th>
        </tr>
      </thead>
      <tbody>
        {movements.map((movement) => (
          <tr key={movement.id}>
            <Td className="whitespace-nowrap text-zinc-600 dark:text-zinc-400">{formatDateTime(movement.createdAt)}</Td>
            {showProduct && (
              <Td>
                <Link href={`/products/${movement.product.id}`} className="font-medium hover:underline">
                  {movement.product.name}
                </Link>
                <div className="font-mono text-xs text-zinc-500">{movement.product.sku}</div>
              </Td>
            )}
            <Td>
              <Badge tone={movementTypeTones[movement.type]}>{movementTypeLabels[movement.type]}</Badge>
            </Td>
            <Td
              align="right"
              className={cx(
                "font-medium",
                movement.quantityChange > 0 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400",
              )}
            >
              {movement.quantityChange > 0 ? "+" : "−"}
              {formatNumber(Math.abs(movement.quantityChange))}
            </Td>
            <Td align="right">{formatNumber(movement.stockAfter)}</Td>
            <Td className="text-zinc-600 dark:text-zinc-400">
              {movement.sale ? (
                <Link href={`/sales/${movement.sale.id}`} className="font-mono hover:underline">
                  {movement.sale.invoiceNumber}
                </Link>
              ) : (
                movement.reason ?? "—"
              )}
              {movement.createdBy && <div className="text-xs text-zinc-500">by {movement.createdBy.name}</div>}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
