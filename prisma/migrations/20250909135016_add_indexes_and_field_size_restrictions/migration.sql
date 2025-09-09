/*
  Warnings:

  - You are about to alter the column `name` on the `carousel` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `name` on the `category` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(80)`.
  - You are about to alter the column `name` on the `event` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(140)`.
  - You are about to alter the column `customLocation` on the `event` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(140)`.
  - You are about to alter the column `speakerName` on the `event` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(120)`.
  - You are about to alter the column `name` on the `participant` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(120)`.
  - You are about to alter the column `ra` on the `participant` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(32)`.
  - You are about to alter the column `tokenHash` on the `refreshtoken` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Char(64)`.
  - You are about to alter the column `name` on the `user` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(120)`.
  - A unique constraint covering the columns `[order]` on the table `Carousel` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[eventId,email]` on the table `Participant` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[tokenHash]` on the table `RefreshToken` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `refreshtoken` DROP FOREIGN KEY `RefreshToken_userId_fkey`;

-- AlterTable
ALTER TABLE `carousel` MODIFY `name` VARCHAR(80) NOT NULL,
    MODIFY `imageUrl` VARCHAR(2048) NOT NULL,
    MODIFY `isActive` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `category` MODIFY `name` VARCHAR(80) NOT NULL;

-- AlterTable
ALTER TABLE `event` MODIFY `name` VARCHAR(140) NOT NULL,
    MODIFY `description` TEXT NOT NULL,
    MODIFY `imageUrl` VARCHAR(2048) NOT NULL,
    MODIFY `customLocation` VARCHAR(140) NULL,
    MODIFY `speakerName` VARCHAR(120) NOT NULL;

-- AlterTable
ALTER TABLE `participant` MODIFY `name` VARCHAR(120) NOT NULL,
    MODIFY `ra` VARCHAR(32) NULL;

-- AlterTable
ALTER TABLE `refreshtoken` MODIFY `tokenHash` CHAR(64) NOT NULL;

-- AlterTable
ALTER TABLE `user` MODIFY `name` VARCHAR(120) NOT NULL,
    MODIFY `password` VARCHAR(255) NOT NULL,
    MODIFY `imageUrl` VARCHAR(2048) NULL;

-- CreateIndex
CREATE INDEX `Carousel_isActive_idx` ON `Carousel`(`isActive`);

-- CreateIndex
CREATE UNIQUE INDEX `Carousel_order_key` ON `Carousel`(`order`);

-- CreateIndex
CREATE INDEX `Category_createdAt_idx` ON `Category`(`createdAt`);

-- CreateIndex
CREATE INDEX `Event_location_idx` ON `Event`(`location`);

-- CreateIndex
CREATE INDEX `Event_isRestricted_idx` ON `Event`(`isRestricted`);

-- CreateIndex
CREATE INDEX `Event_course_semester_startDate_idx` ON `Event`(`course`, `semester`, `startDate`);

-- CreateIndex
CREATE FULLTEXT INDEX `Event_name_description_idx` ON `Event`(`name`, `description`);

-- CreateIndex
CREATE INDEX `Participant_eventId_isPresent_idx` ON `Participant`(`eventId`, `isPresent`);

-- CreateIndex
CREATE INDEX `Participant_createdAt_idx` ON `Participant`(`createdAt`);

-- CreateIndex
CREATE UNIQUE INDEX `Participant_eventId_email_key` ON `Participant`(`eventId`, `email`);

-- CreateIndex
CREATE UNIQUE INDEX `RefreshToken_tokenHash_key` ON `RefreshToken`(`tokenHash`);

-- CreateIndex
CREATE INDEX `RefreshToken_expiresAt_idx` ON `RefreshToken`(`expiresAt`);

-- CreateIndex
CREATE INDEX `User_role_idx` ON `User`(`role`);

-- CreateIndex
CREATE INDEX `User_createdAt_idx` ON `User`(`createdAt`);

-- AddForeignKey
ALTER TABLE `RefreshToken` ADD CONSTRAINT `RefreshToken_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `event` RENAME INDEX `Event_categoryId_fkey` TO `Event_categoryId_idx`;

-- RenameIndex
ALTER TABLE `refreshtoken` RENAME INDEX `RefreshToken_userId_fkey` TO `RefreshToken_userId_idx`;
