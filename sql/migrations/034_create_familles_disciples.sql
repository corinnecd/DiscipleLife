-- ============================================
-- Migration: Création de la table familles_disciples
-- Objectif: Gérer les 26 familles de disciples avec leurs superviseurs
-- ============================================

-- Table pour les familles de disciples
CREATE TABLE IF NOT EXISTS familles_disciples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT UNIQUE NOT NULL, -- Ex: "LES DÉTERMINÉS"
  identifiant_famille TEXT UNIQUE NOT NULL, -- Ex: "FAM001"
  superviseur_id UUID REFERENCES profils(id) ON DELETE SET NULL,
  objectif_disciples INTEGER DEFAULT 70 NOT NULL,
  nombre_disciples_actuels INTEGER DEFAULT 0,
  statut TEXT CHECK (statut IN ('actif', 'inactif')) DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_familles_disciples_superviseur_id ON familles_disciples(superviseur_id);
CREATE INDEX IF NOT EXISTS idx_familles_disciples_identifiant ON familles_disciples(identifiant_famille);
CREATE INDEX IF NOT EXISTS idx_familles_disciples_statut ON familles_disciples(statut);

-- Trigger pour mettre à jour automatiquement updated_at
DROP TRIGGER IF EXISTS update_familles_disciples_updated_at ON familles_disciples;
CREATE TRIGGER update_familles_disciples_updated_at 
  BEFORE UPDATE ON familles_disciples
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Commentaires pour la documentation
COMMENT ON TABLE familles_disciples IS 'Table pour gérer les 26 familles de disciples avec leurs superviseurs. Objectif : 70 disciples par famille.';
COMMENT ON COLUMN familles_disciples.identifiant_famille IS 'Identifiant unique de la famille (ex: FAM001). Utilisé comme préfixe pour les identifiants des disciples.';
COMMENT ON COLUMN familles_disciples.objectif_disciples IS 'Objectif de nombre de disciples pour cette famille (par défaut 70).';
COMMENT ON COLUMN familles_disciples.nombre_disciples_actuels IS 'Nombre actuel de disciples dans la famille (disciples directs + disciples des disciples).';

-- RLS (Row Level Security)
ALTER TABLE familles_disciples ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent (pour rendre le script idempotent)
DROP POLICY IF EXISTS "Users can view families" ON familles_disciples;
DROP POLICY IF EXISTS "Admins can manage families" ON familles_disciples;

-- Politique : Les utilisateurs peuvent voir les familles
CREATE POLICY "Users can view families" ON familles_disciples
  FOR SELECT USING (true);

-- Politique : Seuls les admins peuvent créer/modifier/supprimer des familles
CREATE POLICY "Admins can manage families" ON familles_disciples
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profils 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

