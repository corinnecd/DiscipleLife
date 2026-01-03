-- Table pour stocker les événements personnalisés des mentors
CREATE TABLE IF NOT EXISTS mentor_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mentor_id UUID NOT NULL REFERENCES profils(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  time TIME NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('tous', 'mentor', 'disciple')),
  recurrence TEXT NOT NULL CHECK (recurrence IN ('hebdomadaire', 'mensuel', 'ponctuel')),
  day_of_week INTEGER CHECK (day_of_week >= 0 AND day_of_week <= 6),
  day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 31),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_mentor_events_mentor_id ON mentor_events(mentor_id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_mentor_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mentor_events_updated_at
  BEFORE UPDATE ON mentor_events
  FOR EACH ROW
  EXECUTE FUNCTION update_mentor_events_updated_at();

-- RLS (Row Level Security) - Les mentors ne peuvent voir/modifier que leurs propres événements
ALTER TABLE mentor_events ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre aux mentors de voir leurs propres événements
CREATE POLICY "Mentors can view their own events"
  ON mentor_events
  FOR SELECT
  USING (auth.uid() = mentor_id);

-- Politique pour permettre aux mentors de créer leurs propres événements
CREATE POLICY "Mentors can create their own events"
  ON mentor_events
  FOR INSERT
  WITH CHECK (auth.uid() = mentor_id);

-- Politique pour permettre aux mentors de modifier leurs propres événements
CREATE POLICY "Mentors can update their own events"
  ON mentor_events
  FOR UPDATE
  USING (auth.uid() = mentor_id);

-- Politique pour permettre aux mentors de supprimer leurs propres événements
CREATE POLICY "Mentors can delete their own events"
  ON mentor_events
  FOR DELETE
  USING (auth.uid() = mentor_id);








