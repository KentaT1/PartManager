-- Migration: Add quantity column to parts table
-- This column tracks inventory stock for each part

-- Add quantity column if it doesn't exist
ALTER TABLE parts ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 0;

-- Create index for better query performance on quantity
CREATE INDEX IF NOT EXISTS idx_parts_quantity ON parts(quantity);

