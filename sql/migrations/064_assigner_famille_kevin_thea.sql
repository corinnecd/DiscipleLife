-- ============================================
-- Migration: Assigner la famille à Kevin Théa
-- Objectif: Corriger l'assignation manquante de Kevin Théa à sa famille "LES INGÉNIEUX" (FAM016)
-- ============================================

-- 1. Vérifier si Kevin Théa existe et récupérer son ID
DO $$
DECLARE
  kevin_thea_id UUID;
  famille_ingenieux_id UUID;
BEGIN
  -- Récupérer l'ID de Kevin Théa
  SELECT id INTO kevin_thea_id
  FROM profils
  WHERE role = 'superviseur'
    AND (
      (LOWER(first_name) LIKE '%kevin%' OR LOWER(first_name) LIKE '%kévin%')
      AND (LOWER(last_name) LIKE '%thea%' OR LOWER(last_name) LIKE '%théa%')
    )
  LIMIT 1;

  -- Récupérer l'ID de la famille "LES INGÉNIEUX" (FAM016)
  SELECT id INTO famille_ingenieux_id
  FROM familles_disciples
  WHERE identifiant_famille = 'FAM016'
    OR (LOWER(nom) LIKE '%ingénieux%' OR LOWER(nom) LIKE '%ingenieux%')
  LIMIT 1;

  -- Si Kevin Théa existe mais n'a pas de famille assignée
  IF kevin_thea_id IS NOT NULL AND famille_ingenieux_id IS NOT NULL THEN
    -- Vérifier si la famille n'a pas déjà de superviseur assigné ou si c'est Kevin Théa
    IF NOT EXISTS (
      SELECT 1 FROM familles_disciples
      WHERE id = famille_ingenieux_id
        AND superviseur_id = kevin_thea_id
    ) THEN
      -- Assigner Kevin Théa à la famille LES INGÉNIEUX
      UPDATE familles_disciples
      SET superviseur_id = kevin_thea_id,
          updated_at = NOW()
      WHERE id = famille_ingenieux_id;
      
      RAISE NOTICE '✅ Kevin Théa assigné à la famille LES INGÉNIEUX (FAM016)';
    ELSE
      RAISE NOTICE 'ℹ️  Kevin Théa est déjà assigné à la famille LES INGÉNIEUX';
    END IF;
  ELSE
    IF kevin_thea_id IS NULL THEN
      RAISE NOTICE '⚠️  Kevin Théa non trouvé dans la table profils';
    END IF;
    IF famille_ingenieux_id IS NULL THEN
      RAISE NOTICE '⚠️  Famille LES INGÉNIEUX (FAM016) non trouvée dans la table familles_disciples';
    END IF;
  END IF;
END $$;

-- 2. Vérification : Afficher Kevin Théa et sa famille
SELECT 
    p.id as superviseur_id,
    p.first_name || ' ' || p.last_name as superviseur_nom,
    p.identifiant_unique as superviseur_identifiant,
    f.id as famille_id,
    f.nom as famille_nom,
    f.identifiant_famille
FROM profils p
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND (
    (LOWER(p.first_name) LIKE '%kevin%' OR LOWER(p.first_name) LIKE '%kévin%')
    AND (LOWER(p.last_name) LIKE '%thea%' OR LOWER(p.last_name) LIKE '%théa%')
  );

-- 3. Vérification finale : Compter les superviseurs avec famille
SELECT 
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') as total_superviseurs,
    (SELECT COUNT(DISTINCT superviseur_id) FROM familles_disciples WHERE superviseur_id IS NOT NULL) as total_familles_avec_superviseur,
    (SELECT COUNT(*) FROM familles_disciples) as total_familles;
