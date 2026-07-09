import type { PositionSide } from "./types";

/**
 * All margin-trading calculations in one place.
 *
 * Uses a simplified isolated margin model (each position has its own
 * collateral, no cross-collateral between positions) — this is more
 * transparent for educational purposes than cross-margin.
 *
 * Conventions:
 *   - size: position size in the BASE asset (e.g. BTC amount), always positive
 *   - entryPrice, markPrice: in QUOTE currency (e.g. USD)
 *   - leverage: integer between 2 and 10 (2, 3, 5, 10)
 *   - maintenanceMarginRate: rate needed for liquidation price
 *     calculation (e.g. 0.005 = 0.5%), simplified to a constant
 */

/** 0.5% — the minimum collateral ratio before forced liquidation (educational simplification). */
export const MAINTENANCE_MARGIN_RATE = 0.005;
/** 0.1% — fee buffer added to liquidation price to prevent immediate re-liquidation. */
export const LIQUIDATION_FEE_RATE = 0.001;

/** Input parameters for margin-related calculations. */
export interface MarginCalcInput {
  /** LONG or SHORT direction. */
  side: PositionSide;
  /** Position size in the base asset (e.g. BTC amount). Always positive. */
  size: number;
  /** Entry price in quote currency (e.g. USD). */
  entryPrice: number;
  /** Leverage multiplier (2, 3, 5, or 10). */
  leverage: number;
  /** Optional override for maintenance margin rate. Defaults to MAINTENANCE_MARGIN_RATE. */
  maintenanceMarginRate?: number;
}

/** Result of a combined margin calculation (position size, margin, liquidation). */
export interface MarginCalcResult {
  /** Notional value of the position: size * entryPrice. */
  positionSizeUsd: number;
  /** Collateral required to open the position: notional / leverage. */
  requiredMargin: number;
  /** Price at which the position would be liquidated. */
  liquidationPrice: number;
}

/**
 * Required margin (initial margin) to open a position.
 *   requiredMargin = (size * entryPrice) / leverage
 *
 * @param size - Position size in base asset.
 * @param entryPrice - Entry price in quote currency.
 * @param leverage - Leverage multiplier.
 * @returns The collateral amount required in quote currency.
 *
 * Edge case: if size is 0, returns 0. If leverage is 0, returns Infinity.
 */
export function calculateRequiredMargin(
  size: number,
  entryPrice: number,
  leverage: number
): number {
  const notional = size * entryPrice;
  return notional / leverage;
}

/**
 * Calculate liquidation price for isolated margin.
 *
 * LONG: the position is liquidated when the price drops so much that
 *   losses reach the deposited collateral minus maintenance margin.
 *   liquidationPrice = entryPrice * (1 - 1/leverage + maintenanceMarginRate + liquidationFeeRate)
 *
 * SHORT: inverse direction.
 *   liquidationPrice = entryPrice * (1 + 1/leverage - maintenanceMarginRate - liquidationFeeRate)
 *
 * @param input - Margin calculation parameters (side, size, entryPrice, leverage).
 * @returns The price at which the position would be fully liquidated.
 *
 * Edge cases:
 *   - If leverage is 1 (no leverage), liquidationPrice approaches entryPrice +/- fees.
 *   - High leverage (10x) makes liquidation very close to entry price (within ~10%).
 */
export function calculateLiquidationPrice(input: MarginCalcInput): number {
  const mmr = input.maintenanceMarginRate ?? MAINTENANCE_MARGIN_RATE;
  const inverseLeverage = 1 / input.leverage;

  if (input.side === "LONG") {
    return input.entryPrice * (1 - inverseLeverage + mmr + LIQUIDATION_FEE_RATE);
  }
  return input.entryPrice * (1 + inverseLeverage - mmr - LIQUIDATION_FEE_RATE);
}

/**
 * Convenience function combining position size notional, required margin,
 * and liquidation price into a single result. Useful for forms that need
 * a unified margin preview.
 *
 * @param input - Margin calculation parameters.
 * @returns Combined MarginCalcResult with notional, margin, and liquidation price.
 */
export function calculateMargin(input: MarginCalcInput): MarginCalcResult {
  const positionSizeUsd = input.size * input.entryPrice;
  const requiredMargin = calculateRequiredMargin(input.size, input.entryPrice, input.leverage);
  const liquidationPrice = calculateLiquidationPrice(input);

  return { positionSizeUsd, requiredMargin, liquidationPrice };
}

/**
 * Calculate unrealized profit/loss for an open position.
 *   LONG:  (markPrice - entryPrice) * size  — profit when price rises
 *   SHORT: (entryPrice - markPrice) * size  — profit when price falls
 *
 * @param side - Position direction.
 * @param size - Position size in base asset.
 * @param entryPrice - Average entry price.
 * @param markPrice - Current market price.
 * @returns Unrealized PnL in quote currency. Negative means the position is losing money.
 *
 * Edge case: if size is 0, PnL is 0 regardless of price difference.
 */
export function calculateUnrealizedPnl(
  side: PositionSide,
  size: number,
  entryPrice: number,
  markPrice: number
): number {
  return side === "LONG"
    ? (markPrice - entryPrice) * size
    : (entryPrice - markPrice) * size;
}

/**
 * ROE (Return on Equity) — return relative to the invested collateral
 * (usedMargin) as a percentage. Due to leverage, this always has larger
 * swings than the raw price move %.
 *   roe = unrealizedPnl / usedMargin * 100
 *
 * @param unrealizedPnl - Current unrealized profit or loss.
 * @param usedMargin - The collateral used for this position.
 * @returns ROE as a percentage (e.g., 50 means +50% return on margin).
 *
 * Edge case: if usedMargin is 0, returns 0 to avoid division by zero.
 * A position that was fully liquidated may have zero margin.
 */
export function calculateRoe(unrealizedPnl: number, usedMargin: number): number {
  if (usedMargin === 0) return 0;
  return (unrealizedPnl / usedMargin) * 100;
}

/** Consolidated view of a wallet's margin state across all open positions. */
export interface WalletMarginSummary {
  /** Cash balance + sum of all unrealized PnL from open positions. */
  totalEquity: number;
  /** Sum of usedMargin across all open positions. */
  usedMargin: number;
  /** Available collateral for new positions (totalEquity - usedMargin). */
  freeMargin: number;
  /** Health ratio: (totalEquity / usedMargin) * 100. Infinity when no positions open. */
  marginLevel: number;
}

/** Per-position snapshot used for aggregated wallet margin calculations. */
export interface OpenPositionForSummary {
  /** Collateral allocated to this position. */
  usedMargin: number;
  /** Current unrealized profit or loss. */
  unrealizedPnl: number;
}

/**
 * Aggregate wallet-level margin summary across all open positions.
 *
 * Combines cash balance with unrealized PnL from all positions to compute:
 *   - totalEquity: total account value
 *   - usedMargin: sum of all position margins
 *   - freeMargin: available for new positions
 *   - marginLevel: (totalEquity / usedMargin) * 100
 *
 * @param cashBalance - Current cash in the wallet.
 * @param openPositions - Array of open position snapshots.
 * @returns Computed wallet summary.
 *
 * Edge case: if no positions are open, usedMargin is 0 and marginLevel is Infinity.
 */
export function summarizeWalletMargin(
  cashBalance: number,
  openPositions: OpenPositionForSummary[]
): WalletMarginSummary {
  const usedMargin = openPositions.reduce((sum, p) => sum + p.usedMargin, 0);
  const totalUnrealizedPnl = openPositions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
  const totalEquity = cashBalance + totalUnrealizedPnl;
  const freeMargin = totalEquity - usedMargin;
  const marginLevel = usedMargin === 0 ? Infinity : (totalEquity / usedMargin) * 100;

  return { totalEquity, usedMargin, freeMargin, marginLevel };
}

/** Margin call threshold — a warning should be issued when Margin Level drops below this. */
export const MARGIN_CALL_LEVEL = 150; // %
/** Below this threshold the position must be liquidated. */
export const LIQUIDATION_LEVEL = 100; // %

/**
 * Determine the margin warning state based on the current margin level.
 *
 * Thresholds:
 *   - marginLevel > 150%: SAFE
 *   - marginLevel 100-150%: MARGIN_CALL (warning issued)
 *   - marginLevel <= 100%: LIQUIDATION (position must be closed)
 *
 * @param marginLevel - Current wallet margin level (percentage).
 * @returns One of 'SAFE', 'MARGIN_CALL', or 'LIQUIDATION'.
 *
 * Edge case: marginLevel can be Infinity (no positions) — returns SAFE.
 */
export function getMarginWarningState(
  marginLevel: number
): "SAFE" | "MARGIN_CALL" | "LIQUIDATION" {
  if (marginLevel <= LIQUIDATION_LEVEL) return "LIQUIDATION";
  if (marginLevel <= MARGIN_CALL_LEVEL) return "MARGIN_CALL";
  return "SAFE";
}

/**
 * Check whether a position should be liquidated at a given markPrice.
 * Uses simplified isolated margin model: compares the position's own
 * liquidation price directly against the current mark price.
 *
 * @param side - Position direction (LONG or SHORT).
 * @param markPrice - Current market price of the asset.
 * @param liquidationPrice - The pre-calculated liquidation price for this position.
 * @returns True if the position has crossed the liquidation threshold.
 *
 * Edge case: if markPrice exactly equals liquidationPrice, counts as liquidated.
 */
export function isPositionLiquidated(
  side: PositionSide,
  markPrice: number,
  liquidationPrice: number
): boolean {
  return side === "LONG" ? markPrice <= liquidationPrice : markPrice >= liquidationPrice;
}

/**
 * Input parameters for risk/reward calculations.
 * Used by the Risk Management panel to show position sizing and R:R ratio.
 */
export interface RiskRewardInput {
  /** Entry price in quote currency. */
  entryPrice: number;
  /** Stop-loss price (exit if price moves against position). */
  stopLossPrice: number;
  /** Take-profit price (target exit price). */
  takeProfitPrice: number;
  /** Position size in base asset. */
  size: number;
}

/**
 * Result of a risk/reward calculation.
 * Shows dollar and percentage amounts for risk and reward.
 */
export interface RiskRewardResult {
  /** Dollar amount at risk (entry - stopLoss) * size. */
  riskAmount: number;
  /** Dollar potential reward (takeProfit - entry) * size. */
  rewardAmount: number;
  /** Risk-reward ratio (reward / risk). E.g., 2 = 1:2 ratio. */
  riskRewardRatio: number;
  /** Risk as a percentage of notional value. */
  riskPercent: number;
  /** Reward as a percentage of notional value. */
  rewardPercent: number;
}

/**
 * Calculate risk/reward metrics from entry, stop-loss, take-profit, and size.
 *
 * Uses absolute price distance * size for dollar amounts:
 *   - riskAmount = |entry - stopLoss| * size
 *   - rewardAmount = |takeProfit - entry| * size
 *   - R:R ratio = reward / risk (0 if risk is 0)
 *
 * @param input - Risk/reward parameters.
 * @returns Calculated risk and reward amounts, ratio, and percentages.
 *
 * Edge cases:
 *   - If stopLoss equals entry, riskAmount is 0 and R:R ratio is 0.
 *   - If size is 0, both risk and reward are 0.
 *   - If notional is 0, percentages are 0.
 */
export function calculateRiskReward(input: RiskRewardInput): RiskRewardResult {
  const notional = input.entryPrice * input.size;
  const riskAmount = Math.abs(input.entryPrice - input.stopLossPrice) * input.size;
  const rewardAmount = Math.abs(input.takeProfitPrice - input.entryPrice) * input.size;

  return {
    riskAmount,
    rewardAmount,
    riskRewardRatio: riskAmount === 0 ? 0 : rewardAmount / riskAmount,
    riskPercent: notional === 0 ? 0 : (riskAmount / notional) * 100,
    rewardPercent: notional === 0 ? 0 : (rewardAmount / notional) * 100,
  };
}

/**
 * Calculate the maximum position size for a given risk tolerance.
 *
 * Formula: size = (accountEquity * riskPercent / 100) / |entryPrice - stopLossPrice|
 *
 * Example: $10,000 account, 1% risk ($100), entry=$50,000, stop=$48,000 (distance=$2,000)
 *   size = $100 / $2,000 = 0.05 BTC
 *
 * @param accountEquity - Total account value in quote currency.
 * @param riskPercentOfAccount - Percentage of equity to risk (e.g., 1 = 1%).
 * @param entryPrice - Intended entry price.
 * @param stopLossPrice - Stop-loss price.
 * @returns Position size in base asset. Returns 0 if price distance is 0
 *          (stop-loss equals entry) or if riskPercent is 0.
 *
 * Edge cases:
 *   - riskPercent = 0 returns 0 (no risk tolerance).
 *   - stopLossPrice = entryPrice returns 0 (undefined position size).
 *   - Very small price distances can produce extremely large position sizes.
 */
export function calculatePositionSizeForRisk(
  accountEquity: number,
  riskPercentOfAccount: number,
  entryPrice: number,
  stopLossPrice: number
): number {
  const riskAmount = accountEquity * (riskPercentOfAccount / 100);
  const priceDistance = Math.abs(entryPrice - stopLossPrice);
  if (priceDistance === 0) return 0;
  return riskAmount / priceDistance;
}
