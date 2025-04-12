/*
  Warnings:

  - You are about to drop the column `ibiId` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `ibiName` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `user` DROP COLUMN `ibiId`,
    DROP COLUMN `ibiName`;
