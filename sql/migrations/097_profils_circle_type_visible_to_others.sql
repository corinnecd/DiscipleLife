-- ============================================
-- Migration 097 : Colonnes circle_type et visible_to_others sur profils
--
-- Permet de migrer toutes les pages de cercle_personnes vers profils.
-- circle_type = niveau spirituel (unbelievers, newBelievers, established, makers).
-- visible_to_others = visibilité dans le groupe (ex-Cercles).
-- ============================================

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS circle_type TEXT;

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS visible_to_others BOOLEAN DEFAULT false;

COMMENT ON COLUMN profils.circle_type IS 'Niveau spirituel (unbelievers, newBelievers, established, makers). Aligné avec cercle_personnes.circle_type.';
COMMENT ON COLUMN profils.visible_to_others IS 'Visible par le groupe (ex-cercle).';

CREATE INDEX IF NOT EXISTS idx_profils_circle_type ON profils(circle_type);
CREATE INDEX IF NOT EXISTS idx_profils_mentor_id_circle_type ON profils(mentor_id, circle_type);
