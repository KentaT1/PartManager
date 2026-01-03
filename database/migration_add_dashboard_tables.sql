-- Migration script to add dashboard tables for lifecycle management
-- Run this in your Supabase SQL Editor to add support for maintenance, failures, and wpilog

-- Create maintenance_reviews table for tracking upcoming maintenance/review items
CREATE TABLE IF NOT EXISTS maintenance_reviews (
  id BIGSERIAL PRIMARY KEY,
  system_id BIGINT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('maintenance', 'review')),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create failures table for reporting system failures
CREATE TABLE IF NOT EXISTS failures (
  id BIGSERIAL PRIMARY KEY,
  system_id BIGINT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  components_needing_replacement TEXT[],
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wpilog table for tracking wpilog uploads
CREATE TABLE IF NOT EXISTS wpilog (
  id BIGSERIAL PRIMARY KEY,
  system_id BIGINT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  time_added NUMERIC(10, 2) NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for linking systems to subsystems
CREATE TABLE IF NOT EXISTS system_subsystems (
  system_id BIGINT NOT NULL REFERENCES systems(id) ON DELETE CASCADE,
  subsystem_id BIGINT NOT NULL REFERENCES subsystems(id) ON DELETE CASCADE,
  PRIMARY KEY (system_id, subsystem_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_maintenance_reviews_system_id ON maintenance_reviews(system_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_reviews_due_date ON maintenance_reviews(due_date);
CREATE INDEX IF NOT EXISTS idx_maintenance_reviews_completed ON maintenance_reviews(completed);
CREATE INDEX IF NOT EXISTS idx_failures_system_id ON failures(system_id);
CREATE INDEX IF NOT EXISTS idx_failures_created_at ON failures(created_at);
CREATE INDEX IF NOT EXISTS idx_wpilog_system_id ON wpilog(system_id);
CREATE INDEX IF NOT EXISTS idx_wpilog_uploaded_at ON wpilog(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_system_subsystems_system_id ON system_subsystems(system_id);
CREATE INDEX IF NOT EXISTS idx_system_subsystems_subsystem_id ON system_subsystems(subsystem_id);

-- Enable Row Level Security (RLS)
ALTER TABLE maintenance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE failures ENABLE ROW LEVEL SECURITY;
ALTER TABLE wpilog ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_subsystems ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write access on maintenance_reviews
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_reviews' AND policyname = 'Allow public read access on maintenance_reviews'
    ) THEN
        CREATE POLICY "Allow public read access on maintenance_reviews"
          ON maintenance_reviews FOR SELECT
          USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_reviews' AND policyname = 'Allow public insert on maintenance_reviews'
    ) THEN
        CREATE POLICY "Allow public insert on maintenance_reviews"
          ON maintenance_reviews FOR INSERT
          WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_reviews' AND policyname = 'Allow public update on maintenance_reviews'
    ) THEN
        CREATE POLICY "Allow public update on maintenance_reviews"
          ON maintenance_reviews FOR UPDATE
          USING (true)
          WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_reviews' AND policyname = 'Allow public delete on maintenance_reviews'
    ) THEN
        CREATE POLICY "Allow public delete on maintenance_reviews"
          ON maintenance_reviews FOR DELETE
          USING (true);
    END IF;
END $$;

-- Create policies for public read/write access on failures
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'failures' AND policyname = 'Allow public read access on failures'
    ) THEN
        CREATE POLICY "Allow public read access on failures"
          ON failures FOR SELECT
          USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'failures' AND policyname = 'Allow public insert on failures'
    ) THEN
        CREATE POLICY "Allow public insert on failures"
          ON failures FOR INSERT
          WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'failures' AND policyname = 'Allow public update on failures'
    ) THEN
        CREATE POLICY "Allow public update on failures"
          ON failures FOR UPDATE
          USING (true)
          WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'failures' AND policyname = 'Allow public delete on failures'
    ) THEN
        CREATE POLICY "Allow public delete on failures"
          ON failures FOR DELETE
          USING (true);
    END IF;
END $$;

-- Create policies for public read/write access on wpilog
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wpilog' AND policyname = 'Allow public read access on wpilog'
    ) THEN
        CREATE POLICY "Allow public read access on wpilog"
          ON wpilog FOR SELECT
          USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wpilog' AND policyname = 'Allow public insert on wpilog'
    ) THEN
        CREATE POLICY "Allow public insert on wpilog"
          ON wpilog FOR INSERT
          WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'wpilog' AND policyname = 'Allow public delete on wpilog'
    ) THEN
        CREATE POLICY "Allow public delete on wpilog"
          ON wpilog FOR DELETE
          USING (true);
    END IF;
END $$;

-- Create policies for public read/write access on system_subsystems
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_subsystems' AND policyname = 'Allow public read access on system_subsystems'
    ) THEN
        CREATE POLICY "Allow public read access on system_subsystems"
          ON system_subsystems FOR SELECT
          USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_subsystems' AND policyname = 'Allow public insert on system_subsystems'
    ) THEN
        CREATE POLICY "Allow public insert on system_subsystems"
          ON system_subsystems FOR INSERT
          WITH CHECK (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'system_subsystems' AND policyname = 'Allow public delete on system_subsystems'
    ) THEN
        CREATE POLICY "Allow public delete on system_subsystems"
          ON system_subsystems FOR DELETE
          USING (true);
    END IF;
END $$;

-- Create triggers to automatically update updated_at
-- Note: Drop existing triggers first to avoid errors on re-run
DROP TRIGGER IF EXISTS update_maintenance_reviews_updated_at ON maintenance_reviews;
CREATE TRIGGER update_maintenance_reviews_updated_at
  BEFORE UPDATE ON maintenance_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_failures_updated_at ON failures;
CREATE TRIGGER update_failures_updated_at
  BEFORE UPDATE ON failures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

