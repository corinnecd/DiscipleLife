-- ============================================
-- Migration: Assigner Manicia Théa à la famille FAM018
-- Objectif: Corriger l'assignation manquante de Manicia Théa à la famille "LES RADIEUSES" (FAM018)
-- ============================================

-- 1. Vérifier si Manicia Théa existe et récupérer son ID
DO $$
DECLARE
  manicia_thea_id UUID;
  famille_radieuses_id UUID;
  famille_actuelle_id UUID;
BEGIN
  -- Récupérer l'ID de Manicia Théa
  SELECT id INTO manicia_thea_id
  FROM profils
  WHERE role = 'superviseur'
    AND (
      (LOWER(first_name) LIKE '%manicia%')
      AND (LOWER(last_name) LIKE '%thea%' OR LOWER(last_name) LIKE '%théa%')
    )
  LIMIT 1;

  -- Récupérer l'ID de la famille "LES RADIEUSES" (FAM018)
  SELECT id INTO famille_radieuses_id
  FROM familles_disciples
  WHERE identifiant_famille = 'FAM018'
  LIMIT 1;

  -- Vérifier si Manicia Théa existe
  IF manicia_thea_id IS NULL THEN
    RAISE NOTICE '⚠️  Manicia Théa non trouvée dans la table profils';
    RETURN;
  END IF;

  -- Vérifier si la famille FAM018 existe
  IF famille_radieuses_id IS NULL THEN
    RAISE NOTICE '⚠️  Famille FAM018 (LES RADIEUSES) non trouvée dans la table familles_disciples';
    RETURN;
  END IF;

  -- Vérifier si la famille FAM018 a déjà un superviseur assigné
  SELECT superviseur_id INTO famille_actuelle_id
  FROM familles_disciples
  WHERE id = famille_radieuses_id;

  -- Si la famille a déjà un superviseur assigné et que ce n'est pas Manicia Théa
  IF famille_actuelle_id IS NOT NULL AND famille_actuelle_id != manicia_thea_id THEN
    RAISE NOTICE '⚠️  La famille FAM018 a déjà un superviseur assigné (ID: %)', famille_actuelle_id;
    RAISE NOTICE 'ℹ️  Remplacement du superviseur actuel par Manicia Théa (ID: %)', manicia_thea_id;
  END IF;

  -- Assigner Manicia Théa à la famille LES RADIEUSES (FAM018)
  UPDATE familles_disciples
  SET superviseur_id = manicia_thea_id,
      updated_at = NOW()
  WHERE id = famille_radieuses_id;
  
  RAISE NOTICE '✅ Manicia Théa assignée à la famille LES RADIEUSES (FAM018)';
  
END $$;

-- 2. Vérification : Afficher Manicia Théa et sa famille
SELECT 
    p.id as superviseur_id,
    p.first_name || ' ' || p.last_name as superviseur_nom,
    p.identifiant_unique as superviseur_identifiant,
    p.email as superviseur_email,
    f.id as famille_id,
    f.nom as famille_nom,
    f.identifiant_famille,
    CASE 
        WHEN f.superviseur_id = p.id THEN '✅ Assignée'
        WHEN f.superviseur_id IS NULL THEN '❌ Pas de superviseur'
        ELSE '⚠️ Autre superviseur'
    END as statut
FROM profils p
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND (
    (LOWER(p.first_name) LIKE '%manicia%')
    AND (LOWER(p.last_name) LIKE '%thea%' OR LOWER(p.last_name) LIKE '%théa%')
  );

-- 3. Vérification : Afficher la famille FAM018 et son superviseur
SELECT 
    f.id as famille_id,
    f.nom as famille_nom,
    f.identifiant_famille,
    f.superviseur_id,
    p.first_name || ' ' || p.last_name as superviseur_nom,
    p.email as superviseur_email,
    p.identifiant_unique as superviseur_identifiant,
    CASE 
        WHEN f.superviseur_id IS NULL THEN '❌ Pas de superviseur'
        WHEN LOWER(p.first_name || ' ' || p.last_name) LIKE '%manicia%' AND LOWER(p.first_name || ' ' || p.last_name) LIKE '%thea%' THEN '✅ Manicia Théa'
        ELSE '⚠️ Autre superviseur'
    END as statut
FROM familles_disciples f
LEFT JOIN profils p ON f.superviseur_id = p.id
WHERE f.identifiant_famille = 'FAM018';

-- 4. Vérification finale : Compter les superviseurs avec famille
SELECT 
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') as total_superviseurs,
    (SELECT COUNT(DISTINCT superviseur_id) FROM familles_disciples WHERE superviseur_id IS NOT NULL) as total_familles_avec_superviseur,
    (SELECT COUNT(*) FROM familles_disciples) as total_familles,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND NOT EXISTS (
      SELECT 1 FROM familles_disciples WHERE superviseur_id = profils.id
    )) as superviseurs_sans_famille,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id IS NULL) as familles_sans_superviseur;
