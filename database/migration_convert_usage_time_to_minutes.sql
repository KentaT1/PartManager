-- Migration: Convert usage_time from hours to minutes
-- Date: 2024
-- Description: Converts existing usage_time values from hours to minutes by multiplying by 60
-- Team 1538 / The Holy Cows

-- Convert existing usage_time values from hours to minutes
UPDATE systems 
SET usage_time = usage_time * 60
WHERE usage_time IS NOT NULL;

-- Also convert time_since_last_maintenance if it exists and is in hours
UPDATE systems 
SET time_since_last_maintenance = time_since_last_maintenance * 60
WHERE time_since_last_maintenance IS NOT NULL;

-- Verify the migration
DO $$
DECLARE
    sample_count INTEGER;
    sample_value NUMERIC;
BEGIN
    -- Check a sample to verify conversion (optional check)
    SELECT COUNT(*), COALESCE(MAX(usage_time), 0)
    INTO sample_count, sample_value
    FROM systems
    WHERE usage_time IS NOT NULL;
    
    RAISE NOTICE 'Migration completed. % system(s) processed. Sample max value: %', sample_count, sample_value;
    RAISE NOTICE 'usage_time is now stored in MINUTES instead of hours.';
END $$;

