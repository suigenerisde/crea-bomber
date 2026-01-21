-- Crea-Bomber: Scheduled Messages Table
-- Run this migration in Supabase SQL Editor

-- Create scheduled_messages table
CREATE TABLE IF NOT EXISTS scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  recurring BOOLEAN DEFAULT false,
  type TEXT NOT NULL DEFAULT 'TEXT',
  content TEXT NOT NULL,
  image_url TEXT,
  video_url TEXT,
  audio_url TEXT,
  video_autoplay BOOLEAN DEFAULT false,
  audio_autoplay BOOLEAN DEFAULT false,
  target_devices TEXT[],  -- NULL = alle Clients
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_shown_year INT,    -- Verhindert Mehrfach-Anzeige bei recurring

  CONSTRAINT valid_type CHECK (type IN ('TEXT', 'TEXT_IMAGE', 'VIDEO', 'AUDIO'))
);

-- Index fuer schnelle Datum-Abfragen
CREATE INDEX IF NOT EXISTS idx_scheduled_date ON scheduled_messages(date);
CREATE INDEX IF NOT EXISTS idx_scheduled_recurring ON scheduled_messages(recurring, date);
CREATE INDEX IF NOT EXISTS idx_scheduled_target_devices ON scheduled_messages USING GIN(target_devices);

-- Trigger fuer updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_scheduled_messages_updated_at ON scheduled_messages;
CREATE TRIGGER update_scheduled_messages_updated_at
  BEFORE UPDATE ON scheduled_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
-- HINWEIS: Fuer internes Tool ohne Auth - alle Operationen erlaubt
ALTER TABLE scheduled_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Erlaubt ALLES fuer anon (internes Tool ohne Auth)
CREATE POLICY "Allow all for anon" ON scheduled_messages
  FOR ALL USING (true) WITH CHECK (true);

-- Beispiel-Daten (optional - auskommentiert)
-- INSERT INTO scheduled_messages (date, recurring, type, content) VALUES
--   ('2026-10-01', true, 'TEXT', 'Thilo hat heute Geburtstag - lasst uns hart feiern!'),
--   ('2026-12-24', true, 'TEXT', 'Frohe Weihnachten!'),
--   ('2026-12-31', true, 'TEXT', 'Guten Rutsch ins neue Jahr!');

COMMENT ON TABLE scheduled_messages IS 'Geplante Nachrichten fuer Crea-Bomber Clients';
COMMENT ON COLUMN scheduled_messages.recurring IS 'Wenn true, wird die Nachricht jedes Jahr am gleichen Tag angezeigt';
COMMENT ON COLUMN scheduled_messages.last_shown_year IS 'Jahr der letzten Anzeige, verhindert Mehrfach-Anzeige bei recurring';
COMMENT ON COLUMN scheduled_messages.target_devices IS 'Array von Device-IDs oder NULL fuer alle Clients';
