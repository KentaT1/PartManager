-- Migration: Add System Attributes
-- Date: 2024
-- Description: Adds usage_time, time_since_last_maintenance, and in_usage columns to systems table
-- Team 1538 / The Holy Cows

-- Add usage_time column (if not exists)
ALTER TABLE systems ADD COLUMN IF NOT EXISTS usage_time NUMERIC(10, 2) DEFAULT 0.0;

-- Add time_since_last_maintenance column (if not exists)
ALTER TABLE systems ADD COLUMN IF NOT EXISTS time_since_last_maintenance NUMERIC(10, 2) DEFAULT 0.0;

-- Add in_usage column (if not exists)
ALTER TABLE systems ADD COLUMN IF NOT EXISTS in_usage BOOLEAN DEFAULT true;

-- Update existing systems to have default values if they are NULL
UPDATE systems 
SET usage_time = 0.0 
WHERE usage_time IS NULL;

UPDATE systems 
SET time_since_last_maintenance = 0.0 
WHERE time_since_last_maintenance IS NULL;

UPDATE systems 
SET in_usage = true 
WHERE in_usage IS NULL;

-- Verify the migration
DO $$
BEGIN
    -- Check if columns exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'systems' AND column_name = 'usage_time'
    ) THEN
        RAISE EXCEPTION 'Column usage_time was not added successfully';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'systems' AND column_name = 'time_since_last_maintenance'
    ) THEN
        RAISE EXCEPTION 'Column time_since_last_maintenance was not added successfully';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'systems' AND column_name = 'in_usage'
    ) THEN
        RAISE EXCEPTION 'Column in_usage was not added successfully';
    END IF;
    
    RAISE NOTICE 'Migration completed successfully. All columns added to systems table.';
END $$;

