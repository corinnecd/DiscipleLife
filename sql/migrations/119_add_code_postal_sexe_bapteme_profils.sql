-- ============================================
-- Migration 119 : Ajouter code_postal, sexe, baptise_immersion, date_bapteme à profils
--
-- Utilisés par le formulaire d'inscription.
-- ============================================

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS code_postal TEXT;

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS sexe TEXT;

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS baptise_immersion BOOLEAN DEFAULT NULL;

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS date_bapteme DATE;

COMMENT ON COLUMN profils.code_postal IS 'Code postal du membre (formulaire d''inscription).';
COMMENT ON COLUMN profils.sexe IS 'Sexe : Homme, Femme ou vide.';
COMMENT ON COLUMN profils.baptise_immersion IS 'Baptisé(e) par immersion ? true = oui, false = non, null = non renseigné.';
COMMENT ON COLUMN profils.date_bapteme IS 'Date du baptême (si baptise_immersion = true).';

CREATE INDEX IF NOT EXISTS idx_profils_code_postal ON profils(code_postal) WHERE code_postal IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profils_sexe ON profils(sexe) WHERE sexe IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profils_date_bapteme ON profils(date_bapteme) WHERE date_bapteme IS NOT NULL;
