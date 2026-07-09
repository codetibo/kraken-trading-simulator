/*
  Warnings:

  - The values [MAKER,TAKER] on the enum `ExecutionType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ExecutionType_new" AS ENUM ('Market', 'limit', 'Conditional', 'Algorithmic', 'Settlement', 'Restriction');
ALTER TYPE "ExecutionType" RENAME TO "ExecutionType_old";
ALTER TYPE "ExecutionType_new" RENAME TO "ExecutionType";
DROP TYPE "public"."ExecutionType_old";
COMMIT;
