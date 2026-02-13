-- ============================================
-- Migration 106 : Colonne pilier_attribue_par_id sur profils
--
-- Pilier ≠ Berger. Un pilier est un membre de l'équipe restreinte du superviseur ou du mentor.
-- - Le superviseur peut upgrader un mentor en pilier (dans sa famille).
-- - Un mentor peut upgrader un mentor sous sa responsabilité (mentor_id = ce mentor) en pilier.
-- Berger = fonction pastorale (charge pastorale, pas superviseur d'une famille de 70) ; voir colonne fonction (migration 107).
--
-- Cette colonne enregistre qui a attribué le statut pilier (superviseur ou mentor).
-- ============================================

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS pilier_attribue_par_id UUID REFERENCES profils(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profils_pilier_attribue_par_id ON profils(pilier_attribue_par_id)
WHERE pilier_attribue_par_id IS NOT NULL;

COMMENT ON COLUMN profils.pilier_attribue_par_id IS
'Profil (superviseur ou mentor) qui a upgradé ce membre en pilier. Équipe restreinte : superviseur ou mentor responsable.';
