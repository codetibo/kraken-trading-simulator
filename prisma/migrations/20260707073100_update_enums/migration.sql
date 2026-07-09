/*
  Warnings:

  - The values [STOP_LIMIT] on the enum `OrderType` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "TriggerType" AS ENUM ('LAST_PRICE', 'INDEX_PRICE', 'MARK_PRICE');

-- CreateEnum
CREATE TYPE "TriggerDirection" AS ENUM ('ABOVE', 'BELOW');

-- CreateEnum
CREATE TYPE "TimeInForce" AS ENUM ('GTC', 'IOC', 'FOK', 'GTD');

-- CreateEnum
CREATE TYPE "SelfTradePrevention" AS ENUM ('CANCEL_OLDEST', 'CANCEL_NEWEST', 'CANCEL_BOTH');

-- CreateEnum
CREATE TYPE "ExecutionType" AS ENUM ('MAKER', 'TAKER');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'REJECTED';

-- AlterEnum
BEGIN;
CREATE TYPE "OrderType_new" AS ENUM ('MARKET', 'LIMIT', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT', 'TRAILING_STOP', 'TRAILING_STOP_LIMIT', 'ICEBERG', 'TWAP', 'OCO', 'SETTLE_POSITION', 'POST_ONLY_LIMIT', 'REDUCE_ONLY');
ALTER TABLE "Order" ALTER COLUMN "type" TYPE "OrderType_new" USING ("type"::text::"OrderType_new");
ALTER TABLE "Trade" ALTER COLUMN "orderType" TYPE "OrderType_new" USING ("orderType"::text::"OrderType_new");
ALTER TYPE "OrderType" RENAME TO "OrderType_old";
ALTER TYPE "OrderType_new" RENAME TO "OrderType";
DROP TYPE "public"."OrderType_old";
COMMIT;
