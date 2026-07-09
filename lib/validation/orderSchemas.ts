import { z } from 'zod';
import { ALLOWED_LEVERAGE } from '../engine/types';

/**
 * Shared base schema + per-type extensions (discriminated union)
 * so React Hook Form and the server action use the same validation
 * (spec: "Each order type in its own module, with a shared Order
 * base model").
 */

const baseFields = {
  assetSymbol: z.string().min(1, 'Select an asset'),
  side: z.enum(['BUY', 'SELL']),
  marketType: z.enum(['SPOT', 'MARGIN']),
  quantity: z.coerce.number().positive('Quantity must be positive'),
};

const marginFields = z.object({
  positionSide: z.enum(['LONG', 'SHORT']).optional(),
  leverage: z.coerce
    .number()
    .refine(v => (ALLOWED_LEVERAGE as readonly number[]).includes(v), {
      message: `Leverage must be one of: ${ALLOWED_LEVERAGE.join(
        ', ',
      )}`,
    })
    .optional(),
});

const commonFields = z.object({
  timeInForce: z.enum(['GTC', 'IOC', 'FOK', 'GTD']).optional(),
  expiresAt: z.string().datetime().optional(),
  triggerType: z.enum(['LAST_PRICE', 'INDEX_PRICE', 'MARK_PRICE']).optional(),
  postOnly: z.boolean().optional(),
  reduceOnly: z.boolean().optional(),
  selfTradePrevention: z.enum(['CANCEL_OLDEST', 'CANCEL_NEWEST', 'CANCEL_BOTH']).optional(),
  conditionalTakeProfit: z.coerce.number().positive().optional(),
  conditionalStopLoss: z.coerce.number().positive().optional(),
  conditionalTrailingStopEnabled: z.boolean().optional(),
  conditionalTrailingOffsetType: z.enum(['PERCENT', 'FIXED']).optional(),
  conditionalTrailingOffsetValue: z.coerce.number().positive().optional(),
  conditionalTrailingLimitOffset: z.coerce.number().positive().optional(),
  tpSlMode: z.enum(['PRICE', 'SIMPLE', 'ADVANCED']).optional(),
  simpleTpType: z.enum(['PERCENT', 'PNL_USD', 'PRICE']).optional(),
  simpleTpValue: z.coerce.number().positive().optional(),
  simpleSlType: z.enum(['PERCENT', 'PNL_USD', 'PRICE']).optional(),
  simpleSlValue: z.coerce.number().positive().optional(),
  advField1: z.enum(['PROFIT_TAKING', 'PROFIT_TAKING_LIMIT', 'LIMIT']).optional(),
  advField2Type: z.enum(['DISTANCE', 'PNL']).optional(),
  advField2Value: z.coerce.number().positive().optional(),
  advField3: z.enum(['STOP_LOSS_DISTANCE', 'STOP_LOSS_PNL', 'STOP_LOSS_LIMIT_DISTANCE', 'STOP_LOSS_LIMIT_PNL', 'TRAILING_STOP', 'TRAILING_STOP_LIMIT']).optional(),
  advField3Value: z.coerce.number().positive().optional(),
  advField3Extra: z.coerce.number().positive().optional(),
  conditionalTakeProfitLimitPrice: z.coerce.number().positive().optional(),
  conditionalStopLossLimitPrice: z.coerce.number().positive().optional(),
});

export const marketOrderSchema = z
  .object({
    type: z.literal('MARKET'),
    ...baseFields,
  })
  .merge(marginFields)
  .merge(commonFields);

export const limitOrderSchema = z
  .object({
    type: z.literal('LIMIT'),
    ...baseFields,
    limitPrice: z.coerce.number().positive('Price must be positive'),
  })
  .merge(marginFields)
  .merge(commonFields);

export const stopLossOrderSchema = z
  .object({
    type: z.literal('STOP_LOSS'),
    ...baseFields,
    triggerPrice: z.coerce.number().positive(),
  })
  .merge(marginFields)
  .merge(commonFields);

export const stopLimitOrderSchema = z
  .object({
    type: z.literal('STOP_LOSS_LIMIT'),
    ...baseFields,
    triggerPrice: z.coerce.number().positive(),
    limitPrice: z.coerce.number().positive(),
  })
  .merge(marginFields)
  .merge(commonFields);

export const takeProfitOrderSchema = z
  .object({
    type: z.literal('TAKE_PROFIT'),
    ...baseFields,
    triggerPrice: z.coerce.number().positive(),
  })
  .merge(marginFields)
  .merge(commonFields);

export const takeProfitLimitOrderSchema = z
  .object({
    type: z.literal('TAKE_PROFIT_LIMIT'),
    ...baseFields,
    triggerPrice: z.coerce.number().positive(),
    limitPrice: z.coerce.number().positive(),
  })
  .merge(marginFields)
  .merge(commonFields);

export const trailingStopOrderSchema = z
  .object({
    type: z.literal('TRAILING_STOP'),
    ...baseFields,
    trailingOffsetType: z.enum(['PERCENT', 'FIXED']),
    trailingOffsetValue: z.coerce.number().positive(),
  })
  .merge(marginFields)
  .merge(commonFields);

export const trailingStopLimitOrderSchema = z
  .object({
    type: z.literal('TRAILING_STOP_LIMIT'),
    ...baseFields,
    trailingOffsetType: z.enum(['PERCENT', 'FIXED']),
    trailingOffsetValue: z.coerce.number().positive(),
    trailingLimitOffset: z.coerce.number().positive(),
  })
  .merge(marginFields)
  .merge(commonFields);

export const icebergOrderSchema = z
  .object({
    type: z.literal('ICEBERG'),
    ...baseFields,
    limitPrice: z.coerce.number().positive(),
    visibleQuantity: z.coerce.number().positive('Visible quantity must be positive'),
  })
  .merge(marginFields)
  .merge(commonFields);

export const twapOrderSchema = z
  .object({
    type: z.literal('TWAP'),
    ...baseFields,
    twapDurationSeconds: z.coerce.number().positive().int().min(60, 'Minimum 60 seconds'),
    twapSlices: z.coerce.number().positive().int().min(2, 'Minimum 2 slice').max(100, 'Maximum 100 slice'),
  })
  .merge(marginFields)
  .merge(commonFields);

export const ocoOrderSchema = z
  .object({
    type: z.literal('OCO'),
    ...baseFields,
    triggerPrice: z.coerce.number().positive(),
    limitPrice: z.coerce.number().positive(),
    secondTriggerPrice: z.coerce.number().positive(),
    secondLimitPrice: z.coerce.number().positive(),
  })
  .merge(marginFields)
  .merge(commonFields);

export const settlePositionOrderSchema = z
  .object({
    type: z.literal('SETTLE_POSITION'),
    ...baseFields,
    positionId: z.string().min(1, 'Position selection is required'),
  })
  .merge(commonFields);

export const postOnlyLimitOrderSchema = z
  .object({
    type: z.literal('POST_ONLY_LIMIT'),
    ...baseFields,
    limitPrice: z.coerce.number().positive('Price must be positive'),
  })
  .merge(marginFields)
  .merge(commonFields);

export const reduceOnlyOrderSchema = z
  .object({
    type: z.literal('REDUCE_ONLY'),
    ...baseFields,
    limitPrice: z.coerce.number().positive().optional(),
    triggerPrice: z.coerce.number().positive().optional(),
    positionId: z.string().min(1, 'Position selection is required'),
  })
  .merge(marginFields)
  .merge(commonFields);

export const orderInputSchema = z
  .discriminatedUnion('type', [
    marketOrderSchema,
    limitOrderSchema,
    stopLossOrderSchema,
    stopLimitOrderSchema,
    takeProfitOrderSchema,
    takeProfitLimitOrderSchema,
    trailingStopOrderSchema,
    trailingStopLimitOrderSchema,
    icebergOrderSchema,
    twapOrderSchema,
    ocoOrderSchema,
    settlePositionOrderSchema,
    postOnlyLimitOrderSchema,
    reduceOnlyOrderSchema,
  ])
  .refine(
    data => {
      if (data.marketType === 'MARGIN' && 'positionSide' in data) {
        return !!(data as { positionSide?: string }).positionSide && 'leverage' in data && !!(data as { leverage?: number }).leverage;
      }
      return true;
    },
    {
      message:
        'Margin orders require a Long/Short direction and leverage',
    },
  );

export type OrderInputForm = z.infer<typeof orderInputSchema>;

export const resetSimulationSchema = z.object({
  startingBalance: z.coerce.number().positive().default(10000),
});

export const cancelOrderSchema = z.object({
  orderId: z.string().min(1),
});

export const closePositionSchema = z.object({
  positionId: z.string().min(1),
});
