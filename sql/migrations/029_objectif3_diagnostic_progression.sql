-- Migration: Diagnostic des progressions utilisateur
-- Objectif: Vérifier que les progressions sont bien créées et récupérables
-- Date: 2024

-- 1. Vérifier les progressions existantes
DO $$
DECLARE
  total_progressions INTEGER;
  progressions_en_cours INTEGER;
  progressions_inscrit INTEGER;
  progressions_avec_parcours INTEGER;
BEGIN
  -- Compter toutes les progressions
  SELECT COUNT(*) INTO total_progressions
  FROM user_parcours_progression;
  
  -- Compter les progressions en_cours
  SELECT COUNT(*) INTO progressions_en_cours
  FROM user_parcours_progression
  WHERE statut = 'en_cours';
  
  -- Compter les progressions inscrit
  SELECT COUNT(*) INTO progressions_inscrit
  FROM user_parcours_progression
  WHERE statut = 'inscrit';
  
  -- Compter les progressions avec parcours valide
  SELECT COUNT(*) INTO progressions_avec_parcours
  FROM user_parcours_progression upp
  INNER JOIN parcours_transformation pt ON upp.parcours_id = pt.id;
  
  RAISE NOTICE '📊 Statistiques des progressions:';
  RAISE NOTICE '   Total: %', total_progressions;
  RAISE NOTICE '   En cours: %', progressions_en_cours;
  RAISE NOTICE '   Inscrit: %', progressions_inscrit;
  RAISE NOTICE '   Avec parcours valide: %', progressions_avec_parcours;
END $$;

-- 2. Afficher les progressions récentes avec leurs parcours
SELECT 
  upp.id as progression_id,
  upp.user_id,
  upp.parcours_id,
  upp.statut,
  upp.date_debut,
  upp.progression_pourcentage,
  upp.modules_completes,
  pt.nom as parcours_nom,
  pt.categorie as parcours_categorie
FROM user_parcours_progression upp
LEFT JOIN parcours_transformation pt ON upp.parcours_id = pt.id
ORDER BY upp.date_inscription DESC
LIMIT 20;

-- 3. Vérifier les progressions sans parcours (problème de relation)
SELECT 
  upp.id,
  upp.parcours_id,
  upp.statut,
  CASE 
    WHEN pt.id IS NULL THEN '❌ Parcours introuvable'
    ELSE '✅ Parcours trouvé'
  END as statut_parcours
FROM user_parcours_progression upp
LEFT JOIN parcours_transformation pt ON upp.parcours_id = pt.id
WHERE pt.id IS NULL;

-- 4. Vérifier les contraintes de clé étrangère
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'user_parcours_progression'::regclass
AND contype = 'f';

