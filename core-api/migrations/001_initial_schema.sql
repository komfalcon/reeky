-- Initial schema for Reeky Academic Hub
-- This migration creates the core tables if they don't exist

CREATE TABLE IF NOT EXISTS `User` (
  `id` VARCHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `preferences` JSON NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE IF NOT EXISTS `AssetBundle` (
  `id` VARCHAR(36) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `originalFileUrl` TEXT NOT NULL,
  `status` VARCHAR(20) DEFAULT 'PENDING',
  `assets` JSON NULL,
  `customInstructions` TEXT NULL,
  `assetsRequested` JSON NULL,
  `userId` VARCHAR(36) NOT NULL,
  `createdAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS `idx_assetbundle_userId` ON `AssetBundle`(`userId`);
CREATE INDEX IF NOT EXISTS `idx_assetbundle_status` ON `AssetBundle`(`status`);