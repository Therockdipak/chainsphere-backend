/*
  Warnings:

  - You are about to drop the column `transactionId` on the `transaction` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Transaction_transactionId_key` ON `transaction`;

-- AlterTable
ALTER TABLE `transaction` DROP COLUMN `transactionId`;
