/*
  Warnings:

  - Added the required column `price` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `value` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `transaction` ADD COLUMN `price` VARCHAR(191) NOT NULL,
    ADD COLUMN `value` VARCHAR(191) NOT NULL;
