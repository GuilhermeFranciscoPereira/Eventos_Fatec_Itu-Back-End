-- AlterTable
ALTER TABLE `Event` ADD COLUMN `endDate` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `Event_endDate_idx` ON `Event`(`endDate`);
