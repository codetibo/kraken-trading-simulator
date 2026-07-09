import type { OrderRecord, OrderStatus } from './types';
import { Prisma } from '@/app/generated/prisma/client';

/**
 * Convert a Prisma Order model to the domain-level OrderRecord type
 * used by the matching engine.
 *
 * Handles several field-encoding conventions used to fit typed order
 * fields into the generic Prisma schema:
 *
 *   - ICEBERG: visibleQuantity stored in trailingOffsetValue
 *   - TWAP: duration/slices stored in trailingOffsetValue/trailingLimitOffset,
 *     executedSlices tracked in trailingHighWater
 *   - OCO: second prices stored in trailingOffsetValue/trailingLimitOffset
 *
 * @param dbOrder - Prisma Order model with included asset relation.
 * @param assetSymbol - The asset's trading pair symbol.
 * @returns A domain-level OrderRecord ready for the matching engine.
 *
 * Edge cases:
 *   - Decimal fields use Number() conversion (handles Prisma Decimal type).
 *   - Null/undefined optional fields are mapped to undefined (not null).
 *   - Order types like ICEBERG/TWAP/OCO use overloaded Prisma fields.
 */
export function toOrderRecord(
  dbOrder: Prisma.OrderGetPayload<{ include: { asset: true } }>,
  assetSymbol: string,
): OrderRecord {
  return {
    id: dbOrder.id,
    userId: dbOrder.userId,
    assetSymbol,
    marketType: dbOrder.marketType as 'SPOT' | 'MARGIN',
    side: dbOrder.side as 'BUY' | 'SELL',
    type: dbOrder.type as OrderRecord['type'],
    status: dbOrder.status as OrderStatus,
    quantity: Number(dbOrder.quantity),
    filledQuantity: Number(dbOrder.filledQuantity),
    positionSide: (dbOrder.positionSide ??
      undefined) as OrderRecord['positionSide'],
    leverage: dbOrder.leverage ?? undefined,
    limitPrice: dbOrder.limitPrice ? Number(dbOrder.limitPrice) : undefined,
    triggerPrice: dbOrder.triggerPrice
      ? Number(dbOrder.triggerPrice)
      : undefined,
    trailingOffsetType: (dbOrder.trailingOffsetType ??
      undefined) as OrderRecord['trailingOffsetType'],
    trailingOffsetValue: dbOrder.trailingOffsetValue
      ? Number(dbOrder.trailingOffsetValue)
      : undefined,
    trailingLimitOffset: dbOrder.trailingLimitOffset
      ? Number(dbOrder.trailingLimitOffset)
      : undefined,
    trailingHighWater: dbOrder.trailingHighWater
      ? Number(dbOrder.trailingHighWater)
      : undefined,
    // ICEBERG: visible quantity stored in trailingOffsetValue
    visibleQuantity: dbOrder.trailingOffsetValue
      ? (dbOrder.type === 'ICEBERG' ? Number(dbOrder.trailingOffsetValue) : undefined)
      : undefined,
    // TWAP params stored in offset fields
    twapDurationSeconds: dbOrder.trailingOffsetValue
      ? (dbOrder.type === 'TWAP' ? Number(dbOrder.trailingOffsetValue) : undefined)
      : undefined,
    twapSlices: dbOrder.trailingLimitOffset
      ? (dbOrder.type === 'TWAP' ? Number(dbOrder.trailingLimitOffset) : undefined)
      : undefined,
    twapExecutedSlices: dbOrder.trailingHighWater
      ? (dbOrder.type === 'TWAP' ? Number(dbOrder.trailingHighWater) : undefined)
      : undefined,
    // OCO second prices
    secondTriggerPrice: dbOrder.trailingOffsetValue
      ? (dbOrder.type === 'OCO' ? Number(dbOrder.trailingOffsetValue) : undefined)
      : undefined,
    secondLimitPrice: dbOrder.trailingLimitOffset
      ? (dbOrder.type === 'OCO' ? Number(dbOrder.trailingLimitOffset) : undefined)
      : undefined,
    averageFillPrice: dbOrder.averageFillPrice
      ? Number(dbOrder.averageFillPrice)
      : undefined,
    feePaid: Number(dbOrder.feePaid),
    createdAt: dbOrder.createdAt,
    updatedAt: dbOrder.updatedAt,
  };
}
