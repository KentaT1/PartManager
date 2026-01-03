-- Supabase Database Schema for Parts Management System
-- Team 1538 / The Holy Cows

-- Create subsystems table
CREATE TABLE IF NOT EXISTS subsystems (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create parts table
CREATE TABLE IF NOT EXISTS parts (
  id BIGSERIAL PRIMARY KEY,
  subsystem_id BIGINT NOT NULL REFERENCES subsystems(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  onshape_link TEXT,
  status TEXT NOT NULL DEFAULT 'ready-to-manufacture',
  drawn_by TEXT,
  reviewed_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_parts_subsystem_id ON parts(subsystem_id);
CREATE INDEX IF NOT EXISTS idx_parts_status ON parts(status);
CREATE INDEX IF NOT EXISTS idx_parts_created_at ON parts(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE subsystems ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

-- Create policies for public read/write access
-- NOTE: Adjust these policies based on your security requirements
-- For a public GitHub Pages site, you may want to restrict writes

-- Allow public read access
CREATE POLICY "Allow public read access on subsystems"
  ON subsystems FOR SELECT
  USING (true);

CREATE POLICY "Allow public read access on parts"
  ON parts FOR SELECT
  USING (true);

-- Allow public insert/update/delete (adjust based on your needs)
-- For production, you may want to add authentication
CREATE POLICY "Allow public insert on subsystems"
  ON subsystems FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public insert on parts"
  ON parts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on parts"
  ON parts FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on parts"
  ON parts FOR DELETE
  USING (true);

CREATE POLICY "Allow public delete on subsystems"
  ON subsystems FOR DELETE
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_subsystems_updated_at
  BEFORE UPDATE ON subsystems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_parts_updated_at
  BEFORE UPDATE ON parts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert some default subsystems (optional)
INSERT INTO subsystems (name) VALUES
  ('Drivetrain'),
  ('Intake'),
  ('Shooter'),
  ('Climber'),
  ('Electronics')
ON CONFLICT (name) DO NOTHING;

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
CREATE POLICY "Allow public read access on systems"
  ON systems FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on systems"
  ON systems FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on systems"
  ON systems FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on systems"
  ON systems FOR DELETE
  USING (true);

-- Create policies for public read/write access on system_parts
CREATE POLICY "Allow public read access on system_parts"
  ON system_parts FOR SELECT
  USING (true);

CREATE POLICY "Allow public insert on system_parts"
  ON system_parts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update on system_parts"
  ON system_parts FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete on system_parts"
  ON system_parts FOR DELETE
  USING (true);

-- Create trigger to automatically update updated_at for systems
CREATE TRIGGER update_systems_updated_at
  BEFORE UPDATE ON systems
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

