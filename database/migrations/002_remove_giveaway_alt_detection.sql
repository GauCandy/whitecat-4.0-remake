-- Migration: Remove alt/clone detection from giveaways
-- Date: 2025-01-16
-- Description: Remove min_account_age_days and prevent_alts columns from giveaways table

BEGIN;

-- Drop columns if they exist
ALTER TABLE giveaways
  DROP COLUMN IF EXISTS min_account_age_days,
  DROP COLUMN IF EXISTS prevent_alts;

COMMIT;
