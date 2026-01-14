-- ============================================
-- Migration: Création de la table piliers_mentors
-- Objectif: Gérer les piliers/mentors avec leurs métriques et statistiques
-- ============================================

-- Table pour les piliers/mentors
CREATE TABLE IF NOT EXISTS piliers_mentors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  famille_id UUID REFERENCES familles_disciples(id) ON DELETE CASCADE NOT NULL,
  pilier_id UUID REFERENCES profils(id) ON DELETE CASCADE NOT NULL, -- Le mentor/pilier
  nom TEXT,
  prenom TEXT,
  eglise TEXT,
  nombre_disciples INTEGER DEFAULT 0,
  avancement_pourcentage DECIMAL(5,2) DEFAULT 0, -- Par rapport à l'objectif de 70
  nombre_disciples_presents INTEGER DEFAULT 0,
  taux_participation_semaine DECIMAL(5,2) DEFAULT 0,
  observations TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(famille_id, pilier_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_piliers_mentors_famille_id ON piliers_mentors(famille_id);
CREATE INDEX IF NOT EXISTS idx_piliers_mentors_pilier_id ON piliers_mentors(pilier_id);
CREATE INDEX IF NOT EXISTS idx_piliers_mentors_nombre_disciples ON piliers_mentors(nombre_disciples DESC);
CREATE INDEX IF NOT EXISTS idx_piliers_mentors_avancement ON piliers_mentors(avancement_pourcentage DESC);

-- Trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS update_piliers_mentors_updated_at ON piliers_mentors;
CREATE TRIGGER update_piliers_mentors_updated_at 
  BEFORE UPDATE ON piliers_mentors
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour la documentation
COMMENT ON TABLE piliers_mentors IS 'Table pour gérer les piliers/mentors avec leurs métriques et statistiques par famille';
COMMENT ON COLUMN piliers_mentors.avancement_pourcentage IS 'Pourcentage d''avancement vers l''objectif de 70 disciples pour ce pilier';
COMMENT ON COLUMN piliers_mentors.taux_participation_semaine IS 'Taux de participation de la semaine en cours (%)';

-- RLS (Row Level Security)
ALTER TABLE piliers_mentors ENABLE ROW LEVEL SECURITY;

-- Politique : Les utilisateurs peuvent voir les piliers de leur famille
CREATE POLICY "Users can view piliers of their family" ON piliers_mentors
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profils 
      WHERE id = auth.uid() 
      AND (
        famille_id = piliers_mentors.famille_id
        OR role IN ('admin', 'super_admin', 'pasteur')
        OR EXISTS (
          SELECT 1 FROM familles_disciples 
          WHERE id = piliers_mentors.famille_id 
          AND superviseur_id = auth.uid()
        )
      )
    )
  );

-- Politique : Seuls les admins et superviseurs peuvent modifier les piliers
CREATE POLICY "Admins and supervisors can manage piliers" ON piliers_mentors
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profils 
      WHERE id = auth.uid() 
      AND (
        role IN ('admin', 'super_admin', 'pasteur')
        OR EXISTS (
          SELECT 1 FROM familles_disciples 
          WHERE id = piliers_mentors.famille_id 
          AND superviseur_id = auth.uid()
        )
      )
    )
  );

