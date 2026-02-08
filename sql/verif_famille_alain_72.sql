-- Vérification famille Alain SIL (Les Déterminés)
-- Exécuter dans Supabase SQL Editor AVANT et APRÈS la migration 114.
-- Après 114 : total_famille = 72, nb_disciples = 71.

SELECT
  f.nom AS famille,
  p.first_name || ' ' || p.last_name AS superviseur,
  p.nb_disciples,
  (SELECT COUNT(*) FROM profils q WHERE q.famille_id = f.id) AS total_membres_famille,
  (SELECT COUNT(*) FROM profils q WHERE q.famille_id = f.id) + 1 AS total_avec_superviseur
FROM familles_disciples f
JOIN profils p ON p.id = f.superviseur_id
WHERE (UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES') OR f.identifiant_famille = 'FAM001')
  AND UPPER(TRIM(p.last_name)) = 'SIL' AND UPPER(TRIM(p.first_name)) = 'ALAIN';
