/*
  Warnings:

  - The `farcasterId` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "farcasterId",
ADD COLUMN     "farcasterId" INTEGER;
