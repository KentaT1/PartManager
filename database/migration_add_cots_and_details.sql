-- Migration script to add is_cots and details columns to existing parts table
-- Run this in your Supabase SQL Editor if you already have a parts table

-- Add is_cots column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'parts' 
        AND column_name = 'is_cots'
    ) THEN
        ALTER TABLE parts ADD COLUMN is_cots BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add details column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'parts' 
        AND column_name = 'details'
    ) THEN
        ALTER TABLE parts ADD COLUMN details JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Create index on is_cots if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_parts_is_cots ON parts(is_cots);

