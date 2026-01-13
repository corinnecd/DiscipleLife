-- Migration: Table pour la progression des modules individuels (VERSION CORRIGÉE)
-- Objectif: Permettre de suivre la progression de chaque module individuellement
-- Date: 2024

-- S'assurer que la fonction update_updated_at_column existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer la table user_module_progression si elle n'existe pas
CREATE TABLE IF NOT EXISTS user_module_progression (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  progression_id UUID REFERENCES user_parcours_progression(id) ON DELETE CASCADE NOT NULL,
  module_id UUID REFERENCES modules_parcours(id) ON DELETE CASCADE NOT NULL,
  est_complete BOOLEAN DEFAULT false NOT NULL,
  date_debut TIMESTAMP,
  date_completion TIMESTAMP,
  temps_passe_minutes INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(progression_id, module_id)
);

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_user_module_progression_progression_id 
  ON user_module_progression(progression_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progression_module_id 
  ON user_module_progression(module_id);
CREATE INDEX IF NOT EXISTS idx_user_module_progression_complete 
  ON user_module_progression(progression_id, est_complete);

-- Trigger pour mettre à jour updated_at automatiquement
DROP TRIGGER IF EXISTS update_user_module_progression_updated_at ON user_module_progression;
CREATE TRIGGER update_user_module_progression_updated_at 
  BEFORE UPDATE ON user_module_progression
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Activer RLS
ALTER TABLE user_module_progression ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view their own module progression" ON user_module_progression;
DROP POLICY IF EXISTS "Users can create their own module progression" ON user_module_progression;
DROP POLICY IF EXISTS "Users can update their own module progression" ON user_module_progression;
DROP POLICY IF EXISTS "Users can delete their own module progression" ON user_module_progression;

-- Politiques RLS
CREATE POLICY "Users can view their own module progression" ON user_module_progression
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_parcours_progression upp
      WHERE upp.id = user_module_progression.progression_id
      AND upp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own module progression" ON user_module_progression
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_parcours_progression upp
      WHERE upp.id = user_module_progression.progression_id
      AND upp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own module progression" ON user_module_progression
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_parcours_progression upp
      WHERE upp.id = user_module_progression.progression_id
      AND upp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_parcours_progression upp
      WHERE upp.id = user_module_progression.progression_id
      AND upp.user_id = auth.uid()
    )
  );

-- Commentaires
COMMENT ON TABLE user_module_progression IS 'Progression individuelle des modules pour chaque utilisateur - Objectif 3';
COMMENT ON COLUMN user_module_progression.progression_id IS 'Référence à la progression globale du parcours';
COMMENT ON COLUMN user_module_progression.module_id IS 'Référence au module';
COMMENT ON COLUMN user_module_progression.est_complete IS 'Indique si le module est complété';
COMMENT ON COLUMN user_module_progression.temps_passe_minutes IS 'Temps passé sur le module en minutes';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Table user_module_progression créée avec succès !';
  RAISE NOTICE '✅ Indexes créés !';
  RAISE NOTICE '✅ RLS activé et politiques créées !';
END $$;

