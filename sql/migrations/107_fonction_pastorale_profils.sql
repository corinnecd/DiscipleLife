-- ============================================
-- Migration 107 : Colonne fonction (charge pastorale) sur profils
--
-- À l'inscription, la personne peut indiquer sa fonction : Pasteur, AP (Assistant Pasteur), Berger.
-- - Pasteur : charge pastorale, superviseur de familles.
-- - AP : Assistant Pasteur.
-- - Berger : charge pastorale mais n'est pas superviseur d'une famille de 70.
-- Cette fonction apparaît sur la fiche du membre. Pour les stats et l'arbre : dès 1 disciple = Mentor.
-- Pilier = profil distinct (équipe restreinte, role = 'pilier'), pas une fonction.
-- ============================================

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS fonction TEXT;

CREATE INDEX IF NOT EXISTS idx_profils_fonction ON profils(fonction)
WHERE fonction IS NOT NULL;

COMMENT ON COLUMN profils.fonction IS
'Fonction indiquée à l''inscription : Pasteur, AP, Berger. Charge pastorale, affichée sur la fiche. Distinct du rôle (mentor, pilier, disciple) et des stats (dès 1 disciple = mentor).';
