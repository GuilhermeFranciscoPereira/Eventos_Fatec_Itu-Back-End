-- AlterTable
ALTER TABLE `User` ADD COLUMN `sessionVersion` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `AuthCode` (
    `id` CHAR(36) NOT NULL,
    `userId` INTEGER NULL,
    `purpose` ENUM('TWO_FACTOR', 'PASSWORD_RESET') NOT NULL,
    `codeHash` CHAR(64) NOT NULL,
    `failures` INTEGER NOT NULL DEFAULT 0,
    `usedAt` DATETIME(3) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AuthCode_userId_purpose_idx`(`userId`, `purpose`),
    INDEX `AuthCode_expiresAt_idx`(`expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `actorId` INTEGER NULL,
    `actorName` VARCHAR(120) NULL,
    `actorEmail` VARCHAR(191) NULL,
    `actorRole` ENUM('ADMIN', 'COORDENADOR', 'AUXILIAR') NULL,
    `action` VARCHAR(40) NOT NULL,
    `resource` VARCHAR(40) NOT NULL,
    `summary` VARCHAR(255) NOT NULL,
    `targetId` VARCHAR(64) NULL,
    `targetLabel` VARCHAR(255) NULL,
    `outcome` ENUM('SUCCESS', 'ERROR', 'DENIED') NOT NULL,
    `statusCode` INTEGER NOT NULL,
    `method` VARCHAR(10) NOT NULL,
    `path` VARCHAR(255) NOT NULL,
    `ip` VARCHAR(64) NULL,
    `userAgent` VARCHAR(255) NULL,
    `errorMessage` VARCHAR(500) NULL,
    `before` JSON NULL,
    `after` JSON NULL,
    `changes` JSON NULL,
    `requestBody` JSON NULL,
    `response` JSON NULL,
    `details` JSON NULL,

    INDEX `AuditLog_createdAt_idx`(`createdAt`),
    INDEX `AuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
    INDEX `AuditLog_resource_createdAt_idx`(`resource`, `createdAt`),
    INDEX `AuditLog_outcome_createdAt_idx`(`outcome`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AuthCode` ADD CONSTRAINT `AuthCode_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

