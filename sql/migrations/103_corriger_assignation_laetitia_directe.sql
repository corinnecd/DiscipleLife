-- ============================================
-- Migration: Corriger directement l'assignation des deux Laetitia
-- Objectif: 
--   - LAËTITIA OBAME -> DR MODE avec "LES RACHETÉS" (FAM017)
--   - LAETITIA MISSATOU -> PS PEGGY NN avec "LES VICTORIEUX"
-- Date: 2025-01-XX
-- ============================================

DO $$
DECLARE
    v_pasteur_001_id uuid;
    v_pasteur_003_id uuid;
    v_laetitia_obame_id uuid;
    v_laetitia_missatou_id uuid;
    v_famille_rachetes_id uuid;
    v_famille_victorieux_id uuid;
    v_corrected_count integer := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CORRECTION DIRECTE DES ASSIGNATIONS';
    RAISE NOTICE '========================================';

    -- Trouver les pasteurs
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_003_id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1;

    -- Trouver LAËTITIA OBAME
    SELECT id INTO v_laetitia_obame_id
    FROM profils
    WHERE role = 'superviseur'
      AND LOWER(TRIM(first_name)) LIKE '%laetitia%'
      AND LOWER(TRIM(last_name)) = 'obame'
    LIMIT 1;

    -- Trouver LAETITIA MISSATOU
    SELECT id INTO v_laetitia_missatou_id
    FROM profils
    WHERE role = 'superviseur'
      AND LOWER(TRIM(first_name)) LIKE '%laetitia%'
      AND LOWER(TRIM(last_name)) = 'missatou'
    LIMIT 1;

    RAISE NOTICE 'LAËTITIA OBAME ID: %', v_laetitia_obame_id;
    RAISE NOTICE 'LAETITIA MISSATOU ID: %', v_laetitia_missatou_id;

    -- ============================================
    -- ÉTAPE 1: Assigner LAËTITIA OBAME à DR MODE
    -- ============================================
    IF v_laetitia_obame_id IS NOT NULL THEN
        -- Assigner le pasteur
        UPDATE profils
        SET pasteur_id = v_pasteur_001_id,
            updated_at = NOW()
        WHERE id = v_laetitia_obame_id;

        RAISE NOTICE '✅ LAËTITIA OBAME assignée à DR MODE (PASTEUR-001)';

        -- Trouver ou créer la famille "LES RACHETÉS" (FAM017)
        SELECT id INTO v_famille_rachetes_id
        FROM familles_disciples
        WHERE identifiant_famille = 'FAM017'
          AND nom = 'LES RACHETÉS'
        LIMIT 1;

        IF v_famille_rachetes_id IS NOT NULL THEN
            -- Mettre à jour la famille pour la lier à LAËTITIA OBAME et DR MODE
            UPDATE familles_disciples
            SET superviseur_id = v_laetitia_obame_id,
                pasteur_id = v_pasteur_001_id,
                nom = 'LES RACHETÉS',
                updated_at = NOW()
            WHERE id = v_famille_rachetes_id;

            RAISE NOTICE '✅ Famille "LES RACHETÉS" (FAM017) mise à jour pour LAËTITIA OBAME (DR MODE)';
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
        WHERE id = v_laetitia_obame_id;

        v_corrected_count := v_corrected_count + 1;
    END IF;

    -- ============================================
    -- ÉTAPE 2: Assigner LAETITIA MISSATOU à PS PEGGY NN
    -- ============================================
    IF v_laetitia_missatou_id IS NOT NULL THEN
        -- Assigner le pasteur
        UPDATE profils
        SET pasteur_id = v_pasteur_003_id,
            updated_at = NOW()
        WHERE id = v_laetitia_missatou_id;

        RAISE NOTICE '✅ LAETITIA MISSATOU assignée à PS PEGGY NN (PASTEUR-003)';

        -- Trouver ou créer la famille "LES VICTORIEUX" pour LAETITIA MISSATOU
        -- Chercher d'abord si une famille "LES VICTORIEUX" existe déjà pour PS PEGGY NN
        SELECT id INTO v_famille_victorieux_id
        FROM familles_disciples
        WHERE nom = 'LES VICTORIEUX'
          AND pasteur_id = v_pasteur_003_id
        LIMIT 1;

        IF v_famille_victorieux_id IS NOT NULL THEN
            -- Mettre à jour la famille existante
            UPDATE familles_disciples
            SET superviseur_id = v_laetitia_missatou_id,
                pasteur_id = v_pasteur_003_id,
                nom = 'LES VICTORIEUX',
                updated_at = NOW()
            WHERE id = v_famille_victorieux_id;

            RAISE NOTICE '✅ Famille "LES VICTORIEUX" existante liée à LAETITIA MISSATOU (PS PEGGY NN)';
        ELSE
            -- Vérifier si une famille "LES VICTORIEUX" existe avec un autre identifiant
            SELECT id INTO v_famille_victorieux_id
            FROM familles_disciples
            WHERE nom = 'LES VICTORIEUX'
            LIMIT 1;

            IF v_famille_victorieux_id IS NOT NULL THEN
                -- Mettre à jour la famille existante
                UPDATE familles_disciples
                SET superviseur_id = v_laetitia_missatou_id,
                    pasteur_id = v_pasteur_003_id,
                    nom = 'LES VICTORIEUX',
                    updated_at = NOW()
                WHERE id = v_famille_victorieux_id;

                RAISE NOTICE '✅ Famille "LES VICTORIEUX" existante mise à jour pour LAETITIA MISSATOU (PS PEGGY NN)';
            ELSE
                -- Créer une nouvelle famille "LES VICTORIEUX"
                -- Utiliser un identifiant unique car FAM017 est déjà utilisé pour "LES RACHETÉS"
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
                    'LES VICTORIEUX',
                    'FAM017-VICTORIEUX',
                    v_laetitia_missatou_id,
                    v_pasteur_003_id,
                    'actif',
                    70,
                    NOW(),
                    NOW()
                ) RETURNING id INTO v_famille_victorieux_id;

                RAISE NOTICE '✅ Famille "LES VICTORIEUX" (FAM017-VICTORIEUX) créée pour LAETITIA MISSATOU (PS PEGGY NN)';
            END IF;
        END IF;

        -- Mettre à jour le famille_id dans profils
        UPDATE profils
        SET famille_id = v_famille_victorieux_id,
            updated_at = NOW()
        WHERE id = v_laetitia_missatou_id;

        v_corrected_count := v_corrected_count + 1;
    END IF;

    -- ============================================
    -- ÉTAPE 3: S'assurer qu'aucune autre famille n'est liée à ces superviseurs
    -- ============================================
    
    -- Délier toutes les autres familles de LAËTITIA OBAME (sauf "LES RACHETÉS")
    IF v_laetitia_obame_id IS NOT NULL AND v_famille_rachetes_id IS NOT NULL THEN
        UPDATE familles_disciples
        SET superviseur_id = NULL,
            updated_at = NOW()
        WHERE superviseur_id = v_laetitia_obame_id
          AND id != v_famille_rachetes_id;

        IF FOUND THEN
            RAISE NOTICE '✅ Autres familles déliées de LAËTITIA OBAME';
        END IF;
    END IF;

    -- Délier toutes les autres familles de LAETITIA MISSATOU (sauf "LES VICTORIEUX")
    IF v_laetitia_missatou_id IS NOT NULL AND v_famille_victorieux_id IS NOT NULL THEN
        UPDATE familles_disciples
        SET superviseur_id = NULL,
            updated_at = NOW()
        WHERE superviseur_id = v_laetitia_missatou_id
          AND id != v_famille_victorieux_id;

        IF FOUND THEN
            RAISE NOTICE '✅ Autres familles déliées de LAETITIA MISSATOU';
        END IF;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ % correction(s) effectuée(s)', v_corrected_count;
    RAISE NOTICE '========================================';
END $$;

-- Vérification finale
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
        WHEN LOWER(TRIM(p.last_name)) = 'obame' 
            AND pasteur.identifiant_unique = 'PASTEUR-001' 
            AND f.nom = 'LES RACHETÉS' 
        THEN '✅ CORRECT (LAËTITIA OBAME - DR MODE - LES RACHETÉS)'
        WHEN LOWER(TRIM(p.last_name)) = 'missatou' 
            AND pasteur.identifiant_unique = 'PASTEUR-003' 
            AND f.nom = 'LES VICTORIEUX' 
        THEN '✅ CORRECT (LAETITIA MISSATOU - PS PEGGY NN - LES VICTORIEUX)'
        WHEN LOWER(TRIM(p.last_name)) = 'obame' 
            AND pasteur.identifiant_unique != 'PASTEUR-001' 
        THEN '❌ ERREUR: LAËTITIA OBAME devrait être sous DR MODE'
        WHEN LOWER(TRIM(p.last_name)) = 'missatou' 
            AND pasteur.identifiant_unique != 'PASTEUR-003' 
        THEN '❌ ERREUR: LAETITIA MISSATOU devrait être sous PS PEGGY NN'
        WHEN f.id IS NULL THEN '⚠️  PAS DE FAMILLE'
        ELSE '⚠️  À VÉRIFIER'
    END AS statut
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND LOWER(TRIM(p.first_name)) LIKE '%laetitia%'
ORDER BY p.last_name;

-- Compter les familles par pasteur
SELECT 
    '=== COMPTAGE DES FAMILLES PAR PASTEUR ===' AS info;

SELECT 
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    COUNT(DISTINCT f.id) AS nb_familles,
    CASE pasteur.identifiant_unique
        WHEN 'PASTEUR-001' THEN 12
        WHEN 'PASTEUR-002' THEN 5
        WHEN 'PASTEUR-003' THEN 4
        WHEN 'PASTEUR-004' THEN 5
        ELSE 0
    END AS nb_familles_attendu,
    CASE 
        WHEN COUNT(DISTINCT f.id) = CASE pasteur.identifiant_unique
            WHEN 'PASTEUR-001' THEN 12
            WHEN 'PASTEUR-002' THEN 5
            WHEN 'PASTEUR-003' THEN 4
            WHEN 'PASTEUR-004' THEN 5
            ELSE 0
        END THEN '✅ CORRECT'
        ELSE '⚠️  MANQUANT'
    END AS statut
FROM profils pasteur
LEFT JOIN familles_disciples f ON f.pasteur_id = pasteur.id
WHERE pasteur.role = 'pasteur' AND pasteur.identifiant_unique LIKE 'PASTEUR-%'
GROUP BY pasteur.id, pasteur.identifiant_unique, pasteur.first_name, pasteur.last_name
ORDER BY pasteur.identifiant_unique;
