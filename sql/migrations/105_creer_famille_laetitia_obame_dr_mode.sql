-- ============================================
-- Migration: Créer la famille "LES RACHETÉS" (FAM017) pour LAËTITIA OBAME sous DR MODE
-- Objectif: S'assurer que LAËTITIA OBAME a sa famille "LES RACHETÉS" sous DR MODE
-- Date: 2025-01-XX
-- ============================================

-- 1. Vérifier l'état actuel de LAËTITIA OBAME
SELECT 
    '=== ÉTAT ACTUEL DE LAËTITIA OBAME ===' AS info;

SELECT 
    p.id,
    p.first_name || ' ' || p.last_name AS superviseur_nom,
    p.email AS superviseur_email,
    p.pasteur_id AS pasteur_id_actuel,
    pasteur.identifiant_unique AS pasteur_identifiant_actuel,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom_actuel,
    p.famille_id,
    f.id AS famille_id_dans_familles_disciples,
    f.nom AS famille_nom,
    f.identifiant_famille,
    f.pasteur_id AS famille_pasteur_id,
    CASE 
        WHEN p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
            AND f.nom = 'LES RACHETÉS'
            AND f.identifiant_famille = 'FAM017'
        THEN '✅ CORRECT'
        WHEN p.pasteur_id != (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
        THEN '❌ MAUVAIS PASTEUR'
        WHEN f.id IS NULL THEN '❌ PAS DE FAMILLE'
        WHEN f.nom != 'LES RACHETÉS' THEN '⚠️  MAUVAIS NOM DE FAMILLE'
        WHEN f.identifiant_famille != 'FAM017' THEN '⚠️  MAUVAIS IDENTIFIANT'
        ELSE '⚠️  À CORRIGER'
    END AS statut
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND LOWER(TRIM(p.first_name)) LIKE '%laetitia%'
  AND LOWER(TRIM(p.last_name)) = 'obame';

-- 2. Corriger et créer la famille
DO $$
DECLARE
    v_pasteur_001_id uuid;
    v_laetitia_obame_id uuid;
    v_famille_rachetes_id uuid;
    v_famille_existante_id uuid;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRÉATION DE LA FAMILLE POUR LAËTITIA OBAME';
    RAISE NOTICE '========================================';

    -- Trouver PASTEUR-001 (DR MODE)
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;

    IF v_pasteur_001_id IS NULL THEN
        RAISE EXCEPTION '❌ PASTEUR-001 (DR MODE) non trouvé';
    END IF;

    -- Trouver LAËTITIA OBAME
    SELECT id INTO v_laetitia_obame_id
    FROM profils
    WHERE role = 'superviseur'
      AND LOWER(TRIM(first_name)) LIKE '%laetitia%'
      AND LOWER(TRIM(last_name)) = 'obame'
    LIMIT 1;

    IF v_laetitia_obame_id IS NULL THEN
        RAISE EXCEPTION '❌ LAËTITIA OBAME non trouvée';
    END IF;

    RAISE NOTICE '✅ LAËTITIA OBAME trouvée (ID: %)', v_laetitia_obame_id;
    RAISE NOTICE '✅ PASTEUR-001 trouvé (ID: %)', v_pasteur_001_id;

    -- S'assurer que LAËTITIA OBAME est sous DR MODE
    UPDATE profils
    SET pasteur_id = v_pasteur_001_id,
        updated_at = NOW()
    WHERE id = v_laetitia_obame_id
      AND (pasteur_id IS NULL OR pasteur_id != v_pasteur_001_id);

    IF FOUND THEN
        RAISE NOTICE '✅ LAËTITIA OBAME assignée à DR MODE';
    ELSE
        RAISE NOTICE 'ℹ️  LAËTITIA OBAME est déjà sous DR MODE';
    END IF;

    -- Vérifier si la famille "LES RACHETÉS" (FAM017) existe déjà
    SELECT id INTO v_famille_existante_id
    FROM familles_disciples
    WHERE identifiant_famille = 'FAM017'
      AND nom = 'LES RACHETÉS'
    LIMIT 1;

    IF v_famille_existante_id IS NOT NULL THEN
        -- La famille existe déjà, la lier à LAËTITIA OBAME et DR MODE
        UPDATE familles_disciples
        SET superviseur_id = v_laetitia_obame_id,
            pasteur_id = v_pasteur_001_id,
            nom = 'LES RACHETÉS',
            updated_at = NOW()
        WHERE id = v_famille_existante_id;

        v_famille_rachetes_id := v_famille_existante_id;
        RAISE NOTICE '✅ Famille "LES RACHETÉS" (FAM017) existante liée à LAËTITIA OBAME (DR MODE)';
    ELSE
        -- Créer la famille "LES RACHETÉS" (FAM017)
        INSERT INTO familles_disciples (
            nom,
            identifiant_famille,
            superviseur_id,
            pasteur_id,
            statut,
            objectif_disciples,
            created_at,
            updated_at
        ) VALUES (
            'LES RACHETÉS',
            'FAM017',
            v_laetitia_obame_id,
            v_pasteur_001_id,
            'actif',
            70,
            NOW(),
            NOW()
        ) RETURNING id INTO v_famille_rachetes_id;

        RAISE NOTICE '✅ Famille "LES RACHETÉS" (FAM017) créée pour LAËTITIA OBAME (DR MODE)';
    END IF;

    -- Mettre à jour le famille_id dans profils
    UPDATE profils
    SET famille_id = v_famille_rachetes_id,
        updated_at = NOW()
    WHERE id = v_laetitia_obame_id
      AND (famille_id IS NULL OR famille_id != v_famille_rachetes_id);

    IF FOUND THEN
        RAISE NOTICE '✅ famille_id mis à jour dans profils pour LAËTITIA OBAME';
    END IF;

    -- S'assurer qu'aucune autre famille n'est liée à LAËTITIA OBAME
    UPDATE familles_disciples
    SET superviseur_id = NULL,
        updated_at = NOW()
    WHERE superviseur_id = v_laetitia_obame_id
      AND id != v_famille_rachetes_id;

    IF FOUND THEN
        RAISE NOTICE '✅ Autres familles déliées de LAËTITIA OBAME';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CORRECTION TERMINÉE';
    RAISE NOTICE '========================================';
END $$;

-- 3. Vérification finale
SELECT 
    '=== VÉRIFICATION FINALE ===' AS info;

SELECT 
    p.first_name || ' ' || p.last_name AS superviseur_nom,
    p.email AS superviseur_email,
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    f.nom AS famille_nom,
    f.identifiant_famille,
    CASE 
        WHEN pasteur.identifiant_unique = 'PASTEUR-001' 
            AND f.nom = 'LES RACHETÉS' 
            AND f.identifiant_famille = 'FAM017'
        THEN '✅ CORRECT (LAËTITIA OBAME - DR MODE - LES RACHETÉS)'
        WHEN pasteur.identifiant_unique != 'PASTEUR-001' 
        THEN '❌ ERREUR: Doit être sous DR MODE'
        WHEN f.id IS NULL THEN '❌ PAS DE FAMILLE'
        ELSE '⚠️  À VÉRIFIER'
    END AS statut
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND LOWER(TRIM(p.first_name)) LIKE '%laetitia%'
  AND LOWER(TRIM(p.last_name)) = 'obame';

-- 4. Compter les familles de DR MODE
SELECT 
    '=== COMPTAGE DES FAMILLES DE DR MODE ===' AS info;

SELECT 
    COUNT(DISTINCT f.id) AS nb_familles,
    12 AS nb_familles_attendu,
    CASE 
        WHEN COUNT(DISTINCT f.id) = 12 THEN '✅ CORRECT (12 familles)'
        ELSE '⚠️  MANQUANT (' || (12 - COUNT(DISTINCT f.id)) || ' famille(s))'
    END AS statut
FROM familles_disciples f
WHERE f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1);

-- 5. Liste complète des familles de DR MODE
SELECT 
    '=== LISTE COMPLÈTE DES FAMILLES DE DR MODE ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS famille_nom,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    s.email AS superviseur_email,
    CASE 
        WHEN f.superviseur_id IS NOT NULL AND f.pasteur_id IS NOT NULL THEN '✅ COMPLÈTE'
        WHEN f.superviseur_id IS NULL THEN '⚠️  SANS SUPERVISEUR'
        WHEN f.pasteur_id IS NULL THEN '⚠️  SANS PASTEUR'
        ELSE '⚠️  INCOMPLÈTE'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
ORDER BY f.identifiant_famille;
