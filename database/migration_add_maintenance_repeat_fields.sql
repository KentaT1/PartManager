-- Migration script to add repeat interval and next due runtime fields to maintenance_reviews
-- This enables the new repeating maintenance system

-- Add repeat_interval_matches column (how often maintenance repeats, in matches)
ALTER TABLE maintenance_reviews 
ADD COLUMN IF NOT EXISTS repeat_interval_matches NUMERIC(10, 2);

-- Add next_due_runtime_hours column (runtime in hours when maintenance is next due)
ALTER TABLE maintenance_reviews 
ADD COLUMN IF NOT EXISTS next_due_runtime_hours NUMERIC(10, 2);

-- For existing records, try to extract repeat interval from description and set defaults
-- This is a best-effort migration - existing records may need manual review
UPDATE maintenance_reviews
SET repeat_interval_matches = (
  CASE 
    WHEN description ~ 'Repeats every ([\d.]+) match' THEN
      CAST((regexp_match(description, 'Repeats every ([\d.]+) match'))[1] AS NUMERIC)
    ELSE 10 -- Default to 10 matches if not found
  END
)
WHERE repeat_interval_matches IS NULL AND completed = false;

-- Set next_due_runtime_hours for existing records based on description
-- This is approximate - ideally these would be recalculated
UPDATE maintenance_reviews
SET next_due_runtime_hours = (
  CASE 
    WHEN description ~ 'target runtime: ([\d.]+) hours' THEN
      CAST((regexp_match(description, 'target runtime: ([\d.]+) hours'))[1] AS NUMERIC)
    ELSE NULL
  END
)
WHERE next_due_runtime_hours IS NULL AND completed = false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_maintenance_reviews_next_due_runtime 
ON maintenance_reviews(next_due_runtime_hours) 
WHERE completed = false;

