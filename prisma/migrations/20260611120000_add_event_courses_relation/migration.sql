-- CreateTable
CREATE TABLE `EventCourse` (
    `eventId` INTEGER NOT NULL,
    `courseId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EventCourse_courseId_idx`(`courseId`),
    PRIMARY KEY (`eventId`, `courseId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Preserve existing single-course restrictions as relation rows
INSERT INTO `EventCourse` (`eventId`, `courseId`)
SELECT `id`, `courseId`
FROM `Event`
WHERE `courseId` IS NOT NULL;

-- DropForeignKey
ALTER TABLE `Event` DROP FOREIGN KEY `Event_courseId_fkey`;

-- DropIndex
DROP INDEX `Event_courseId_semester_startDate_idx` ON `Event`;

-- AlterTable
ALTER TABLE `Event` DROP COLUMN `courseId`;

-- CreateIndex
CREATE INDEX `Event_semester_startDate_idx` ON `Event`(`semester`, `startDate`);

-- AddForeignKey
ALTER TABLE `EventCourse` ADD CONSTRAINT `EventCourse_eventId_fkey` FOREIGN KEY (`eventId`) REFERENCES `Event`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EventCourse` ADD CONSTRAINT `EventCourse_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `Course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
