-- ============================================
-- Migration 093 : Ajouter phone et ville_residence à profils
--
-- Utilisés par le formulaire d'inscription (numéro de téléphone, ville de résidence).
-- ============================================

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS ville_residence TEXT;

COMMENT ON COLUMN profils.phone IS 'Numéro de téléphone du membre (formulaire d''inscription).';
COMMENT ON COLUMN profils.ville_residence IS 'Ville de résidence du membre (formulaire d''inscription).';

CREATE INDEX IF NOT EXISTS idx_profils_phone ON profils(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profils_ville_residence ON profils(ville_residence) WHERE ville_residence IS NOT NULL;
