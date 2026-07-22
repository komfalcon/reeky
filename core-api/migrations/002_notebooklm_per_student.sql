-- One-Notebook-Per-Student Architecture
-- Adds notebooklm_url to User table and tracks notebook source + content hashes for assets

-- Add notebooklm_url to students/users table
ALTER TABLE users
  ADD COLUMN notebooklm_url TEXT NULL AFTER password,
  ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add notebook source tracking and content deduplication to asset_bundles
ALTER TABLE asset_bundles
  ADD COLUMN notebook_source_url TEXT NULL AFTER original_file_url,
  ADD COLUMN content_hash VARCHAR(64) NULL AFTER notebook_source_url,
  ADD INDEX idx_notebook_source (notebook_source_url(255)),
  ADD INDEX idx_content_hash (content_hash),
  ADD INDEX idx_user_id (user_id);

-- Update existing asset statuses to include FAILED state
UPDATE asset_bundles SET status = 'COMPLETED' WHERE status NOT IN ('PENDING', 'PROCESSING', 'FAILED');
UPDATE asset_bundles SET status = 'FAILED' WHERE status NOT IN ('PENDING', 'PROCESSING', 'COMPLETED');