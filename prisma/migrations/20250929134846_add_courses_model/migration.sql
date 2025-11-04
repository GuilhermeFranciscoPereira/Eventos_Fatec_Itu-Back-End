/*
  Warnings:

  - You are about to drop the column `course` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `course` on the `participant` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `Event_course_semester_startDate_idx` ON `event`;

-- AlterTable
ALTER TABLE `event` DROP COLUMN `course`,
    ADD COLUMN `courseId` INTEGER NULL;

-- AlterTable
ALTER TABLE `participant` DROP COLUMN `course`,
    ADD COLUMN `courseId` INTEGER NULL;

-- CreateTable
CREATE TABLE `Course` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Course_name_key`(`name`),
    INDEX `Course_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Event_courseId_semester_startDate_idx` ON `Event`(`courseId`, `semester`, `startDate`);

-- AddForeignKey
ALTER TABLE `Event` ADD CONSTRAINT `Event_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Participant` ADD CONSTRAINT `Participant_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
