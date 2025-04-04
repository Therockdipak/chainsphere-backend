/*
  Warnings:

  - You are about to alter the column `amount` on the `transaction` table. The data in that column could be lost. The data in that column will be cast from `Double` to `VarChar(191)`.

*/
-- AlterTable
ALTER TABLE `transaction` MODIFY `amount` VARCHAR(191) NOT NULL;
