-- ============================================
-- Migration: Vérifier et créer la famille "LES RACHETÉS" (FAM017) pour LAËTITIA OBAME
-- Objectif: Trouver LAËTITIA OBAME et créer sa famille sous DR MODE
-- Date: 2025-01-XX
-- ============================================

-- 1. Chercher tous les superviseurs avec "laetitia" dans le prénom
SELECT 
    '=== RECHERCHE DE TOUS LES SUPERVISEURS "LAETITIA" ===' AS info;

SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.pasteur_id,
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    p.famille_id,
    f.id AS famille_id_dans_familles_disciples,
    f.nom AS famille_nom,
    f.identifiant_famille
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND LOWER(TRIM(p.first_name)) LIKE '%laetitia%'
ORDER BY p.last_name, p.first_name;

-- 2. Chercher spécifiquement LAËTITIA OBAME avec différentes variations
SELECT 
    '=== RECHERCHE SPÉCIFIQUE DE LAËTITIA OBAME ===' AS info;

SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.pasteur_id,
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    p.famille_id,
    f.id AS famille_id_dans_familles_disciples,
    f.nom AS famille_nom,
    f.identifiant_famille,
    'TROUVÉ' AS statut
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND (
    (LOWER(TRIM(p.first_name)) LIKE '%laetitia%' OR LOWER(TRIM(p.first_name)) LIKE '%laëtitia%')
    AND LOWER(TRIM(p.last_name)) = 'obame'
  )
ORDER BY p.first_name, p.last_name;

-- 3. Créer la famille pour LAËTITIA OBAME si elle existe
DO $$
DECLARE
    v_pasteur_001_id uuid;
    v_laetitia_obame_id uuid;
    v_famille_rachetes_id uuid;
    v_famille_existante_id uuid;
    v_found boolean := false;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRÉATION DE LA FAMILLE POUR LAËTITIA OBAME';
    RAISE NOTICE '========================================';

    -- Trouver PASTEUR-001 (DR MODE)
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;

    IF v_pasteur_001_id IS NULL THEN
        RAISE EXCEPTION '❌ PASTEUR-001 (DR MODE) non trouvé';
    END IF;

    -- Chercher LAËTITIA OBAME avec différentes variations
    SELECT id INTO v_laetitia_obame_id
    FROM profils
    WHERE role = 'superviseur'
      AND (
        (LOWER(TRIM(first_name)) LIKE '%laetitia%' OR LOWER(TRIM(first_name)) LIKE '%laëtitia%')
        AND LOWER(TRIM(last_name)) = 'obame'
      )
    LIMIT 1;

    IF v_laetitia_obame_id IS NULL THEN
        RAISE NOTICE '⚠️  LAËTITIA OBAME non trouvée dans la base de données';
        RAISE NOTICE '   Vérifiez si ce superviseur existe avec une orthographe différente';
        
        -- Afficher tous les superviseurs pour aider à identifier
        RAISE NOTICE '   Liste de tous les superviseurs:';
        FOR v_laetitia_obame_id IN
            SELECT id FROM profils WHERE role = 'superviseur' ORDER BY first_name, last_name LIMIT 5
        LOOP
            -- Juste pour itérer, on ne fait rien ici
            NULL;
        END LOOP;
        
        -- Ne pas lever d'exception, continuer pour créer la famille si elle n'existe pas
    ELSE
        RAISE NOTICE '✅ LAËTITIA OBAME trouvée (ID: %)', v_laetitia_obame_id;
        v_found := true;

        -- S'assurer que LAËTITIA OBAME est sous DR MODE
        UPDATE profils
        SET pasteur_id = v_pasteur_001_id,
            updated_at = NOW()
        WHERE id = v_laetitia_obame_id
          AND (pasteur_id IS NULL OR pasteur_id != v_pasteur_001_id);

        IF FOUND THEN
            RAISE NOTICE '✅ LAËTITIA OBAME assignée à DR MODE';
        END IF;
    END IF;

    -- Vérifier si la famille "LES RACHETÉS" (FAM017) existe déjà
    SELECT id INTO v_famille_existante_id
    FROM familles_disciples
    WHERE identifiant_famille = 'FAM017'
      AND nom = 'LES RACHETÉS'
    LIMIT 1;

    IF v_famille_existante_id IS NOT NULL THEN
        -- La famille existe déjà
        IF v_found THEN
            -- Mettre à jour la famille pour la lier à LAËTITIA OBAME et DR MODE
            UPDATE familles_disciples
            SET superviseur_id = v_laetitia_obame_id,
                pasteur_id = v_pasteur_001_id,
                nom = 'LES RACHETÉS',
                updated_at = NOW()
            WHERE id = v_famille_existante_id;

            v_famille_rachetes_id := v_famille_existante_id;
            RAISE NOTICE '✅ Famille "LES RACHETÉS" (FAM017) existante liée à LAËTITIA OBAME (DR MODE)';

            -- Mettre à jour le famille_id dans profils
            UPDATE profils
            SET famille_id = v_famille_rachetes_id,
                updated_at = NOW()
            WHERE id = v_laetitia_obame_id;
        ELSE
            RAISE NOTICE '⚠️  Famille "LES RACHETÉS" (FAM017) existe mais LAËTITIA OBAME non trouvée';
        END IF;
    ELSE
        -- La famille n'existe pas
        IF v_found THEN
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

            -- Mettre à jour le famille_id dans profils
            UPDATE profils
            SET famille_id = v_famille_rachetes_id,
                updated_at = NOW()
            WHERE id = v_laetitia_obame_id;
        ELSE
            RAISE NOTICE '⚠️  Impossible de créer la famille: LAËTITIA OBAME non trouvée';
        END IF;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CORRECTION TERMINÉE';
    RAISE NOTICE '========================================';
END $$;

-- 4. Vérification finale - Tous les superviseurs de DR MODE
SELECT 
    '=== TOUS LES SUPERVISEURS DE DR MODE ===' AS info;

SELECT 
    p.id,
    p.first_name || ' ' || p.last_name AS superviseur_nom,
    p.email AS superviseur_email,
    p.pasteur_id,
    pasteur.identifiant_unique AS pasteur_identifiant,
    f.id AS famille_id,
    f.nom AS famille_nom,
    f.identifiant_famille,
    CASE 
        WHEN f.id IS NULL THEN '❌ PAS DE FAMILLE'
        ELSE '✅ FAMILLE'
    END AS statut
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
ORDER BY p.first_name, p.last_name;

-- 5. Compter les familles de DR MODE
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
