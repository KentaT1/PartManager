-- Migration script to add MTBF tracking and predicted warnings system
-- Run this in your Supabase SQL Editor to add support for MTBF-based predictive maintenance

-- Add MTBF columns to systems table
ALTER TABLE systems 
ADD COLUMN IF NOT EXISTS mtbf_minutes NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS last_failure_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_failures INTEGER DEFAULT 0;

-- Create predicted_warnings table for MTBF-based predictive maintenance
CREATE TABLE IF NOT EXISTS predicted_warnings (
  id BIGSERIAL PRIMARY KEY,
  system_id BIGINT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  predicted_failure_runtime_minutes NUMERIC(10, 2) NOT NULL,
  review_notes TEXT NOT NULL,
  likely_failures TEXT[],
  mtbf_minutes NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_predicted_warnings_system_id ON predicted_warnings(system_id);
CREATE INDEX IF NOT EXISTS idx_predicted_warnings_dismissed ON predicted_warnings(dismissed);
CREATE INDEX IF NOT EXISTS idx_predicted_warnings_predicted_runtime ON predicted_warnings(predicted_failure_runtime_minutes);
CREATE INDEX IF NOT EXISTS idx_systems_mtbf ON systems(mtbf_minutes);
CREATE INDEX IF NOT EXISTS idx_failures_created_at ON failures(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE predicted_warnings ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write access on predicted_warnings
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'predicted_warnings' AND policyname = 'Allow public read access on predicted_warnings'
    ) THEN
        CREATE POLICY "Allow public read access on predicted_warnings"
          ON predicted_warnings FOR SELECT
          USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'predicted_warnings' AND policyname = 'Allow public insert on predicted_warnings'
    ) THEN
        CREATE POLICY "Allow public insert on predicted_warnings"
          ON predicted_warnings FOR INSERT
          WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'predicted_warnings' AND policyname = 'Allow public update on predicted_warnings'
    ) THEN
        CREATE POLICY "Allow public update on predicted_warnings"
          ON predicted_warnings FOR UPDATE
          USING (true)
          WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'predicted_warnings' AND policyname = 'Allow public delete on predicted_warnings'
    ) THEN
        CREATE POLICY "Allow public delete on predicted_warnings"
          ON predicted_warnings FOR DELETE
          USING (true);
    END IF;
END $$;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_predicted_warnings_updated_at ON predicted_warnings;
CREATE TRIGGER update_predicted_warnings_updated_at
  BEFORE UPDATE ON predicted_warnings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate and update MTBF for a system
CREATE OR REPLACE FUNCTION calculate_system_mtbf(p_system_id BIGINT)
RETURNS NUMERIC(10, 2) AS $$
DECLARE
  v_total_failures INTEGER;
  v_usage_time NUMERIC(10, 2);
  v_mtbf NUMERIC(10, 2);
BEGIN
  -- Get total failures count
  SELECT COUNT(*) INTO v_total_failures
  FROM failures
  WHERE system_id = p_system_id;

  -- Get current usage time
  SELECT COALESCE(usage_time, 0) INTO v_usage_time
  FROM systems
  WHERE id = p_system_id;

  -- Calculate MTBF: Total Operating Time / Number of Failures
  -- If no failures, return NULL (can't calculate MTBF)
  IF v_total_failures = 0 THEN
    v_mtbf := NULL;
  ELSE
    v_mtbf := v_usage_time / v_total_failures;
  END IF;

  -- Update system with calculated MTBF and failure count
  UPDATE systems
  SET 
    mtbf_minutes = v_mtbf,
    total_failures = v_total_failures,
    last_failure_at = (SELECT MAX(created_at) FROM failures WHERE system_id = p_system_id)
  WHERE id = p_system_id;

  RETURN v_mtbf;
END;
$$ LANGUAGE plpgsql;

