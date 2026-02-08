-- ============================================
-- Fix Alain SIL (Les Déterminés) : aligner nb_disciples sur le total réel
--
-- Votre vérification affiche : total_membres_famille = 67, nb_disciples = 12.
-- Ce script met nb_disciples d'Alain = total_membres_famille (même définition que verif_famille_alain_72).
-- (Le trigger 102 ne touche pas à cette colonne quand on fait UPDATE nb_disciples sans changer mentor_id.)
--
-- À exécuter dans Supabase → SQL Editor.
-- ============================================

UPDATE profils p
SET nb_disciples = (
  SELECT COUNT(*)::INTEGER FROM profils q WHERE q.famille_id = f.id
)
FROM familles_disciples f
WHERE f.superviseur_id = p.id
  AND (UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES') OR f.identifiant_famille = 'FAM001')
  AND UPPER(TRIM(p.last_name)) = 'SIL' AND UPPER(TRIM(p.first_name)) = 'ALAIN';

-- Vérification : relancer sql/verif_famille_alain_72.sql pour voir nb_disciples = 67 et total_avec_superviseur = 68.
