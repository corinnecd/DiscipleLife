-- ============================================
-- Migration: Ajouter cercle_personnes_id à user_parcours_progression
-- Objectif: Permettre de lier les progressions aux disciples individuels dans cercle_personnes
-- ============================================

-- Ajouter la colonne cercle_personnes_id à user_parcours_progression
-- Cette colonne permet de lier une progression à un disciple spécifique dans cercle_personnes
-- Si NULL, la progression est liée à l'utilisateur connecté (comportement actuel)
ALTER TABLE user_parcours_progression
ADD COLUMN IF NOT EXISTS cercle_personnes_id UUID REFERENCES cercle_personnes(id) ON DELETE SET NULL;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_user_parcours_progression_cercle_personnes_id 
ON user_parcours_progression(cercle_personnes_id);

-- Commentaire pour la documentation
COMMENT ON COLUMN user_parcours_progression.cercle_personnes_id IS 
'ID du disciple dans cercle_personnes. Si NULL, la progression est liée à l''utilisateur connecté (user_id). Si renseigné, la progression est spécifique à ce disciple.';

