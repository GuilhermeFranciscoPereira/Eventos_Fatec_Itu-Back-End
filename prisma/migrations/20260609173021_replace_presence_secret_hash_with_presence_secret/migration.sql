/*
  Warnings:

  - You are about to drop the column `presenceSecretHash` on the `event` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `event` DROP COLUMN `presenceSecretHash`,
    ADD COLUMN `presenceSecret` VARCHAR(80) NULL;

-- CreateIndex
CREATE INDEX `Participant_email_idx` ON `Participant`(`email`);
