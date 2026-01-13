-- ============================================
-- OBJECTIF 3: Supprimer les doublons et ajouter contrainte UNIQUE
-- ============================================

-- Supprimer les doublons en gardant le plus récent
DELETE FROM parcours_transformation p1
WHERE EXISTS (
  SELECT 1 FROM parcours_transformation p2
  WHERE p2.nom = p1.nom
  AND p2.id != p1.id
  AND p2.created_at > p1.created_at
);

-- Alternative : Supprimer les doublons basés sur thematique (si nom est NULL ou vide)
DELETE FROM parcours_transformation p1
WHERE EXISTS (
  SELECT 1 FROM parcours_transformation p2
  WHERE p2.thematique = p1.thematique
  AND p2.id != p1.id
  AND (
    (p2.nom IS NOT NULL AND p2.nom != '' AND p1.nom IS NULL)
    OR (p2.created_at > p1.created_at)
  )
);

-- S'assurer que tous les parcours ont un nom valide
UPDATE parcours_transformation
SET nom = thematique
WHERE nom IS NULL OR nom = '' OR nom = 'Parcours sans nom';

-- Ajouter une contrainte UNIQUE sur nom si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'parcours_transformation_nom_key'
  ) THEN
    ALTER TABLE parcours_transformation
    ADD CONSTRAINT parcours_transformation_nom_key UNIQUE (nom);
    
    RAISE NOTICE '✅ Contrainte UNIQUE ajoutée sur nom';
  ELSE
    RAISE NOTICE '✅ Contrainte UNIQUE existe déjà sur nom';
  END IF;
END $$;

-- Vérification finale
DO $$
DECLARE
  total_count INTEGER;
  unique_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM parcours_transformation;
  SELECT COUNT(DISTINCT nom) INTO unique_count FROM parcours_transformation;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SUPPRESSION DES DOUBLONS TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total parcours: %', total_count;
  RAISE NOTICE 'Parcours uniques (par nom): %', unique_count;
  IF total_count != unique_count THEN
    RAISE WARNING 'ATTENTION: Il reste des doublons potentiels';
  END IF;
  RAISE NOTICE '========================================';
END $$;


