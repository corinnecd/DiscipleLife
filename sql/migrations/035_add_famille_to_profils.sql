-- ============================================
-- Migration: Ajout des colonnes famille dans profils
-- Objectif: Lier les utilisateurs à leurs familles et créer la hiérarchie
-- ============================================

-- Ajouter la colonne famille_id à profils
ALTER TABLE profils
ADD COLUMN IF NOT EXISTS famille_id UUID REFERENCES familles_disciples(id) ON DELETE SET NULL;

-- Ajouter la colonne identifiant_disciple à profils
ALTER TABLE profils
ADD COLUMN IF NOT EXISTS identifiant_disciple TEXT;

-- Ajouter la colonne superviseur_id à profils (pour les mentors qui ont un superviseur)
ALTER TABLE profils
ADD COLUMN IF NOT EXISTS superviseur_id UUID REFERENCES profils(id) ON DELETE SET NULL;

-- Ajouter la colonne mentor_id à profils (pour les disciples qui ont un mentor)
ALTER TABLE profils
ADD COLUMN IF NOT EXISTS mentor_id UUID REFERENCES profils(id) ON DELETE SET NULL;

-- Modifier la colonne role pour inclure les nouveaux rôles
-- Note: Cette modification nécessite de mettre à jour les valeurs existantes
DO $$ 
BEGIN
  -- Vérifier si la contrainte CHECK existe déjà
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profils_role_check'
  ) THEN
    -- Supprimer l'ancienne contrainte
    ALTER TABLE profils DROP CONSTRAINT profils_role_check;
  END IF;
  
  -- Créer la nouvelle contrainte avec tous les rôles
  ALTER TABLE profils 
  ADD CONSTRAINT profils_role_check 
  CHECK (role IN ('super_admin', 'admin', 'pasteur', 'superviseur', 'mentor', 'disciple', 'tutore'));
END $$;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profils_famille_id ON profils(famille_id);
CREATE INDEX IF NOT EXISTS idx_profils_identifiant_disciple ON profils(identifiant_disciple);
CREATE INDEX IF NOT EXISTS idx_profils_superviseur_id ON profils(superviseur_id);
CREATE INDEX IF NOT EXISTS idx_profils_mentor_id ON profils(mentor_id);

-- Contrainte unique : un disciple ne peut appartenir qu'à une seule famille
-- (mais peut avoir un identifiant_disciple unique même sans famille)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profils_famille_identifiant_unique 
ON profils(famille_id, identifiant_disciple) 
WHERE famille_id IS NOT NULL AND identifiant_disciple IS NOT NULL;

-- Commentaires pour la documentation
COMMENT ON COLUMN profils.famille_id IS 'ID de la famille de disciples à laquelle appartient l''utilisateur';
COMMENT ON COLUMN profils.identifiant_disciple IS 'Identifiant unique du disciple au format [ID_FAMILLE][ID_UNIQUE] (ex: FAM001-DISC-12345)';
COMMENT ON COLUMN profils.superviseur_id IS 'ID du superviseur pour les mentors/piliers';
COMMENT ON COLUMN profils.mentor_id IS 'ID du mentor/pilier pour les disciples';

