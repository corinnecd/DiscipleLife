-- ============================================
-- Migration: Créer la famille manquante pour PS PEGGY NN
-- Objectif: S'assurer que PS PEGGY NN a bien 4 familles
-- Date: 2025-01-XX
-- ============================================

-- 1. Vérifier les familles actuelles de PS PEGGY NN
SELECT 
    '=== FAMILLES ACTUELLES DE PS PEGGY NN ===' AS info;

SELECT 
    f.id,
    f.nom,
    f.identifiant_famille,
    f.superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    s.email AS superviseur_email,
    CASE 
        WHEN f.superviseur_id IS NULL THEN '⚠️  SANS SUPERVISEUR'
        WHEN s.id IS NULL THEN '⚠️  SUPERVISEUR INEXISTANT'
        ELSE '✅ CORRECT'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
ORDER BY f.identifiant_famille;

-- 2. Comparer avec les 4 superviseurs attendus pour PS PEGGY NN
SELECT 
    '=== COMPARAISON: SUPERVISEURS ATTENDUS VS FAMILLES ===' AS info;

WITH superviseurs_attendus AS (
    SELECT 'ALAIN' AS prenom, 'SIL' AS nom, 'LES DÉTERMINÉS' AS famille_nom, 'FAM001' AS identifiant
    UNION ALL SELECT 'CARINE', 'MATONDO', 'Les AMOUREUX', 'FAM005'
    UNION ALL SELECT 'GERVAIS', 'NKATOULOULOU', 'LES FIDÈLES', 'FAM011'
    UNION ALL SELECT 'LAETITIA', 'MISSATOU', 'LES VICTORIEUX', 'FAM017'
)
SELECT 
    sa.prenom || ' ' || sa.nom AS superviseur_attendu,
    sa.famille_nom AS famille_attendue,
    sa.identifiant AS identifiant_attendu,
    p.id AS superviseur_id,
    p.email AS superviseur_email,
    f.id AS famille_id,
    f.nom AS famille_reelle,
    f.identifiant_famille AS identifiant_reel,
    CASE 
        WHEN p.id IS NULL THEN '❌ SUPERVISEUR NON TROUVÉ'
        WHEN f.id IS NULL THEN '❌ FAMILLE MANQUANTE'
        WHEN f.identifiant_famille != sa.identifiant THEN '⚠️  MAUVAIS IDENTIFIANT'
        WHEN f.nom != sa.famille_nom THEN '⚠️  MAUVAIS NOM'
        ELSE '✅ CORRECT'
    END AS statut
FROM superviseurs_attendus sa
LEFT JOIN profils p ON (
    LOWER(TRIM(p.first_name)) = LOWER(TRIM(sa.prenom))
    AND LOWER(TRIM(p.last_name)) = LOWER(TRIM(sa.nom))
    AND p.role = 'superviseur'
    AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
)
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
ORDER BY sa.identifiant;

-- 3. Créer la famille manquante
DO $$
DECLARE
    v_pasteur_003_id uuid;
    v_superviseur_record RECORD;
    v_famille_id uuid;
    v_famille_existante_id uuid;
    v_created_count integer := 0;
    v_updated_count integer := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRÉATION DE LA FAMILLE MANQUANTE';
    RAISE NOTICE '========================================';

    -- Trouver PASTEUR-003
    SELECT id INTO v_pasteur_003_id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1;

    IF v_pasteur_003_id IS NULL THEN
        RAISE EXCEPTION '❌ PASTEUR-003 (PS PEGGY NN) non trouvé';
    END IF;

    RAISE NOTICE 'PASTEUR-003 trouvé: %', v_pasteur_003_id;

    -- Pour chaque superviseur attendu de PS PEGGY NN
    FOR v_superviseur_record IN
        SELECT * FROM (VALUES
            ('ALAIN', 'SIL', 'LES DÉTERMINÉS', 'FAM001'),
            ('CARINE', 'MATONDO', 'Les AMOUREUX', 'FAM005'),
            ('GERVAIS', 'NKATOULOULOU', 'LES FIDÈLES', 'FAM011'),
            ('LAETITIA', 'MISSATOU', 'LES VICTORIEUX', 'FAM017')
        ) AS t(prenom, nom, famille_nom, identifiant)
    LOOP
        DECLARE
            v_superviseur_id uuid;
        BEGIN
            RAISE NOTICE '--- Traitement de % % (Famille: % - %) ---', 
                v_superviseur_record.prenom, 
                v_superviseur_record.nom,
                v_superviseur_record.famille_nom,
                v_superviseur_record.identifiant;

            -- Trouver le superviseur dans la base
            SELECT id INTO v_superviseur_id
            FROM profils
            WHERE role = 'superviseur'
              AND pasteur_id = v_pasteur_003_id
              AND LOWER(TRIM(first_name)) = LOWER(TRIM(v_superviseur_record.prenom))
              AND LOWER(TRIM(last_name)) = LOWER(TRIM(v_superviseur_record.nom))
            LIMIT 1;

            IF v_superviseur_id IS NULL THEN
                RAISE NOTICE '⚠️  Superviseur % % non trouvé dans la base', v_superviseur_record.prenom, v_superviseur_record.nom;
                CONTINUE;
            END IF;

            RAISE NOTICE '✅ Superviseur trouvé: % (ID: %)', v_superviseur_record.prenom || ' ' || v_superviseur_record.nom, v_superviseur_id;

            -- Vérifier si la famille existe déjà avec cet identifiant
            SELECT id INTO v_famille_existante_id
            FROM familles_disciples
            WHERE identifiant_famille = v_superviseur_record.identifiant
            LIMIT 1;

            IF v_famille_existante_id IS NOT NULL THEN
                -- La famille existe déjà, vérifier si elle est liée au bon superviseur
                IF EXISTS (
                    SELECT 1 FROM familles_disciples 
                    WHERE id = v_famille_existante_id 
                      AND superviseur_id = v_superviseur_id
                      AND pasteur_id = v_pasteur_003_id
                ) THEN
                    RAISE NOTICE 'ℹ️  Famille % (%) déjà liée au superviseur', 
                        v_superviseur_record.famille_nom, v_superviseur_record.identifiant;
                    v_famille_id := v_famille_existante_id;
                ELSE
                    -- Mettre à jour la famille pour la lier au superviseur
                    UPDATE familles_disciples
                    SET superviseur_id = v_superviseur_id,
                        pasteur_id = v_pasteur_003_id,
                        nom = v_superviseur_record.famille_nom,
                        updated_at = NOW()
                    WHERE id = v_famille_existante_id;

                    v_famille_id := v_famille_existante_id;
                    v_updated_count := v_updated_count + 1;
                    RAISE NOTICE '✅ Famille existante % (%) mise à jour et liée au superviseur', 
                        v_superviseur_record.famille_nom, v_superviseur_record.identifiant;
                END IF;
            ELSE
                -- Créer une nouvelle famille
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
                    v_superviseur_record.famille_nom,
                    v_superviseur_record.identifiant,
                    v_superviseur_id,
                    v_pasteur_003_id,
                    'actif',
                    70,
                    NOW(),
                    NOW()
                ) RETURNING id INTO v_famille_id;

                v_created_count := v_created_count + 1;
                RAISE NOTICE '✅ Nouvelle famille créée: % (%) pour superviseur % %', 
                    v_superviseur_record.famille_nom, v_superviseur_record.identifiant,
                    v_superviseur_record.prenom, v_superviseur_record.nom;
            END IF;

            -- Mettre à jour le famille_id dans profils
            UPDATE profils
            SET famille_id = v_famille_id,
                updated_at = NOW()
            WHERE id = v_superviseur_id
              AND (famille_id IS NULL OR famille_id != v_famille_id);

            IF FOUND THEN
                RAISE NOTICE '✅ famille_id mis à jour dans profils';
            END IF;
        END;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ % famille(s) créée(s)', v_created_count;
    RAISE NOTICE '✅ % famille(s) mise(s) à jour', v_updated_count;
    RAISE NOTICE '========================================';
END $$;

-- 4. Vérification finale
SELECT 
    '=== VÉRIFICATION FINALE ===' AS info;

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

-- 5. Détail des familles de PS PEGGY NN
SELECT 
    '=== DÉTAIL DES FAMILLES DE PS PEGGY NN ===' AS info;

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
WHERE f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
ORDER BY f.identifiant_famille;
