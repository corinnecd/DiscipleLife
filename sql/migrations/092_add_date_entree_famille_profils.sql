-- ============================================
-- Migration 092 : Ajouter date_entree_famille à profils
--
-- La colonne est utilisée par SignupDisciple et FamillesDisciples mais
-- absente du schéma actuel. À exécuter pour aligner la base avec l'app.
-- ============================================

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS date_entree_famille DATE;

COMMENT ON COLUMN profils.date_entree_famille IS 'Date d''entrée du disciple dans la famille (formulaire d''inscription).';

CREATE INDEX IF NOT EXISTS idx_profils_date_entree_famille ON profils(date_entree_famille)
WHERE date_entree_famille IS NOT NULL;
