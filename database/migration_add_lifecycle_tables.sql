-- Migration script to add lifecycle management tables
-- Run this in your Supabase SQL Editor to add support for the lifecycle management page
-- This is safe to run even if some parts already exist (uses IF NOT EXISTS)

-- Create systems table
CREATE TABLE IF NOT EXISTS systems (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  usage_time NUMERIC(10, 2) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add system_id to parts table (nullable, for one-to-many relationship)
ALTER TABLE parts ADD COLUMN IF NOT EXISTS system_id BIGINT REFERENCES systems(id) ON DELETE SET NULL;

-- Create junction table for many-to-many relationship between systems and parts
CREATE TABLE IF NOT EXISTS system_parts (
  system_id BIGINT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  part_id BIGINT NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  PRIMARY KEY (system_id, part_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_parts_system_id ON parts(system_id);
CREATE INDEX IF NOT EXISTS idx_system_parts_system_id ON system_parts(system_id);
CREATE INDEX IF NOT EXISTS idx_system_parts_part_id ON system_parts(part_id);

-- Enable Row Level Security (RLS) for systems table
ALTER TABLE systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_parts ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write access on systems
-- Note: If policies already exist, you may need to drop them first or use CREATE POLICY IF NOT EXISTS
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'systems' AND policyname = 'Allow public read access on systems'
    ) THEN
        CREATE POLICY "Allow public read access on systems"
          ON systems FOR SELECT
          USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'systems' AND policyname = 'Allow public insert on systems'
    ) THEN
        CREATE POLICY "Allow public insert on systems"
          ON systems FOR INSERT
          WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'systems' AND policyname = 'Allow public update on systems'
    ) THEN
        CREATE POLICY "Allow public update on systems"
          ON systems FOR UPDATE
          USING (true)
          WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'systems' AND policyname = 'Allow public delete on systems'
    ) THEN
        CREATE POLICY "Allow public delete on systems"
          ON systems FOR DELETE
          USING (true);
    END IF;
END $$;

-- Create policies for public read/write access on system_parts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_parts' AND policyname = 'Allow public read access on system_parts'
    ) THEN
        CREATE POLICY "Allow public read access on system_parts"
          ON system_parts FOR SELECT
          USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_parts' AND policyname = 'Allow public insert on system_parts'
    ) THEN
        CREATE POLICY "Allow public insert on system_parts"
          ON system_parts FOR INSERT
          WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_parts' AND policyname = 'Allow public update on system_parts'
    ) THEN
        CREATE POLICY "Allow public update on system_parts"
          ON system_parts FOR UPDATE
          USING (true)
          WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_parts' AND policyname = 'Allow public delete on system_parts'
    ) THEN
        CREATE POLICY "Allow public delete on system_parts"
          ON system_parts FOR DELETE
          USING (true);
    END IF;
END $$;

-- Create trigger to automatically update updated_at for systems
-- Note: This assumes the update_updated_at_column() function already exists from the main schema
DROP TRIGGER IF EXISTS update_systems_updated_at ON systems;
CREATE TRIGGER update_systems_updated_at
  BEFORE UPDATE ON systems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

