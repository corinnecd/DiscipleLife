-- ============================================
-- Migration: Corriger les assignations de Laetitia Obame et Manicia Théa
-- Objectif: 
--   - Assigner Laetitia Obame à la famille FAM017 (LES RACHETÉS)
--   - Assigner Manicia Théa à la famille FAM018 (LES RADIEUSES)
-- ============================================

-- 1. Assigner Laetitia Obame à FAM017 (LES RACHETÉS)
DO $$
DECLARE
  laetitia_obame_id UUID;
  famille_rachetes_id UUID;
BEGIN
  -- Récupérer l'ID de Laetitia Obame
  SELECT id INTO laetitia_obame_id
  FROM profils
  WHERE role = 'superviseur'
    AND (
      (LOWER(first_name) LIKE '%laetitia%' OR LOWER(first_name) LIKE '%laëtitia%')
      AND (LOWER(last_name) LIKE '%obame%')
    )
  LIMIT 1;

  -- Récupérer l'ID de la famille FAM017 (LES RACHETÉS)
  SELECT id INTO famille_rachetes_id
  FROM familles_disciples
  WHERE identifiant_famille = 'FAM017'
  LIMIT 1;

  -- Vérifier si Laetitia Obame existe
  IF laetitia_obame_id IS NULL THEN
    RAISE NOTICE '⚠️  Laetitia Obame non trouvée dans la table profils';
  ELSIF famille_rachetes_id IS NULL THEN
    RAISE NOTICE '⚠️  Famille FAM017 (LES RACHETÉS) non trouvée dans la table familles_disciples';
  ELSE
    -- Assigner Laetitia Obame à la famille LES RACHETÉS (FAM017)
    UPDATE familles_disciples
    SET superviseur_id = laetitia_obame_id,
        updated_at = NOW()
    WHERE id = famille_rachetes_id;
    
    RAISE NOTICE '✅ Laetitia Obame assignée à la famille LES RACHETÉS (FAM017)';
  END IF;
END $$;

-- 2. Assigner Manicia Théa à FAM018 (LES RADIEUSES)
DO $$
DECLARE
  manicia_thea_id UUID;
  famille_radieuses_id UUID;
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

  -- Récupérer l'ID de la famille FAM018 (LES RADIEUSES)
  SELECT id INTO famille_radieuses_id
  FROM familles_disciples
  WHERE identifiant_famille = 'FAM018'
  LIMIT 1;

  -- Vérifier si Manicia Théa existe
  IF manicia_thea_id IS NULL THEN
    RAISE NOTICE '⚠️  Manicia Théa non trouvée dans la table profils';
  ELSIF famille_radieuses_id IS NULL THEN
    RAISE NOTICE '⚠️  Famille FAM018 (LES RADIEUSES) non trouvée dans la table familles_disciples';
  ELSE
    -- Assigner Manicia Théa à la famille LES RADIEUSES (FAM018)
    UPDATE familles_disciples
    SET superviseur_id = manicia_thea_id,
        updated_at = NOW()
    WHERE id = famille_radieuses_id;
    
    RAISE NOTICE '✅ Manicia Théa assignée à la famille LES RADIEUSES (FAM018)';
  END IF;
END $$;

-- 3. Vérification : Afficher Laetitia Obame et sa famille
SELECT 
    p.id as superviseur_id,
    p.first_name || ' ' || p.last_name as superviseur_nom,
    p.identifiant_unique as superviseur_identifiant,
    p.email as superviseur_email,
    f.id as famille_id,
    f.nom as famille_nom,
    f.identifiant_famille,
    CASE 
        WHEN f.superviseur_id = p.id AND f.identifiant_famille = 'FAM017' THEN '✅ Correctement assignée à FAM017'
        WHEN f.superviseur_id = p.id THEN '⚠️ Assignée à ' || f.identifiant_famille
        WHEN f.superviseur_id IS NULL THEN '❌ Pas de famille'
        ELSE '⚠️ Autre superviseur'
    END as statut
FROM profils p
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND (
    (LOWER(p.first_name) LIKE '%laetitia%' OR LOWER(p.first_name) LIKE '%laëtitia%')
    AND (LOWER(p.last_name) LIKE '%obame%')
  );

-- 4. Vérification : Afficher Manicia Théa et sa famille
SELECT 
    p.id as superviseur_id,
    p.first_name || ' ' || p.last_name as superviseur_nom,
    p.identifiant_unique as superviseur_identifiant,
    p.email as superviseur_email,
    f.id as famille_id,
    f.nom as famille_nom,
    f.identifiant_famille,
    CASE 
        WHEN f.superviseur_id = p.id AND f.identifiant_famille = 'FAM018' THEN '✅ Correctement assignée à FAM018'
        WHEN f.superviseur_id = p.id THEN '⚠️ Assignée à ' || f.identifiant_famille
        WHEN f.superviseur_id IS NULL THEN '❌ Pas de famille'
        ELSE '⚠️ Autre superviseur'
    END as statut
FROM profils p
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND (
    (LOWER(p.first_name) LIKE '%manicia%')
    AND (LOWER(p.last_name) LIKE '%thea%' OR LOWER(p.last_name) LIKE '%théa%')
  );

-- 5. Vérification : Afficher les familles FAM017 et FAM018 avec leur superviseur
SELECT 
    f.id as famille_id,
    f.nom as famille_nom,
    f.identifiant_famille,
    f.superviseur_id,
    p.first_name || ' ' || p.last_name as superviseur_nom,
    p.email as superviseur_email,
    p.identifiant_unique as superviseur_identifiant,
    CASE 
        WHEN f.identifiant_famille = 'FAM017' AND LOWER(p.first_name || ' ' || p.last_name) LIKE '%laetitia%' AND LOWER(p.first_name || ' ' || p.last_name) LIKE '%obame%' THEN '✅ Laetitia Obame'
        WHEN f.identifiant_famille = 'FAM018' AND LOWER(p.first_name || ' ' || p.last_name) LIKE '%manicia%' AND LOWER(p.first_name || ' ' || p.last_name) LIKE '%thea%' THEN '✅ Manicia Théa'
        WHEN f.superviseur_id IS NULL THEN '❌ Pas de superviseur'
        ELSE '⚠️ ' || (p.first_name || ' ' || p.last_name)
    END as statut
FROM familles_disciples f
LEFT JOIN profils p ON f.superviseur_id = p.id
WHERE f.identifiant_famille IN ('FAM017', 'FAM018')
ORDER BY f.identifiant_famille;

-- 6. Vérification finale : Compter les superviseurs avec famille
SELECT 
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur') as total_superviseurs,
    (SELECT COUNT(DISTINCT superviseur_id) FROM familles_disciples WHERE superviseur_id IS NOT NULL) as total_familles_avec_superviseur,
    (SELECT COUNT(*) FROM familles_disciples) as total_familles,
    (SELECT COUNT(*) FROM profils WHERE role = 'superviseur' AND NOT EXISTS (
      SELECT 1 FROM familles_disciples WHERE superviseur_id = profils.id
    )) as superviseurs_sans_famille,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id IS NULL) as familles_sans_superviseur;
