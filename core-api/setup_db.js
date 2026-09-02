import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;

async function setup() {
    try {
        const connection = await mysql.createConnection({
            uri: url,
            ssl: {
                rejectUnauthorized: true
            }
        });
        console.log('Connected to MySQL natively.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`User\` (
                \`id\` VARCHAR(191) PRIMARY KEY,
                \`name\` VARCHAR(191) NOT NULL,
                \`email\` VARCHAR(191) UNIQUE NOT NULL,
                \`password\` VARCHAR(191) NOT NULL,
                \`preferences\` JSON NULL,
                \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
            )
        `);
        console.log('User table ready.');

        await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`AssetBundle\` (
                \`id\` VARCHAR(191) PRIMARY KEY,
                \`title\` VARCHAR(191) NOT NULL,
                \`originalFileUrl\` TEXT NOT NULL,
                \`status\` VARCHAR(191) NOT NULL DEFAULT 'PENDING',
                \`assets\` JSON,
                \`customInstructions\` TEXT NULL,
                \`assetsRequested\` JSON NULL,
                \`userId\` VARCHAR(191) NOT NULL,
                \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
                FOREIGN KEY (\`userId\`) REFERENCES \`User\`(\`id\`) ON DELETE CASCADE
            )
        `);
        console.log('AssetBundle table ready.');

        // Idempotent upgrades for existing deployments
        const alters = [
            'ALTER TABLE `User` ADD COLUMN `preferences` JSON NULL',
            'ALTER TABLE `AssetBundle` MODIFY `originalFileUrl` TEXT NOT NULL',
            'ALTER TABLE `AssetBundle` ADD COLUMN `customInstructions` TEXT NULL',
            'ALTER TABLE `AssetBundle` ADD COLUMN `assetsRequested` JSON NULL',
        ];
        for (const sql of alters) {
            try {
                await connection.execute(sql);
                console.log('Applied:', sql);
            } catch (e) {
                // Duplicate column / already applied
            }
        }

        await connection.end();
        console.log('Setup complete!');
    } catch (e) {
        console.error(e);
    }
}
setup();
