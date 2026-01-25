-- ============================================
-- Migration: Créer la famille "LES VICTORIEUX" pour LAETITIA MISSATOU sous PS PEGGY NN
-- Objectif: S'assurer que LAETITIA MISSATOU a sa famille sous PS PEGGY NN
-- Date: 2025-01-XX
-- ============================================

DO $$
DECLARE
    v_pasteur_003_id uuid;
    v_laetitia_missatou_id uuid;
    v_famille_victorieux_id uuid;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRÉATION FAMILLE LAETITIA MISSATOU';
    RAISE NOTICE '========================================';

    -- Trouver PASTEUR-003 (PS PEGGY NN)
    SELECT id INTO v_pasteur_003_id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1;

    IF v_pasteur_003_id IS NULL THEN
        RAISE EXCEPTION '❌ PASTEUR-003 (PS PEGGY NN) non trouvé';
    END IF;

    -- Trouver LAETITIA MISSATOU (avec toutes les variations possibles)
    SELECT id INTO v_laetitia_missatou_id
    FROM profils
    WHERE role = 'superviseur'
      AND (
        (LOWER(TRIM(first_name)) LIKE '%laetitia%' OR LOWER(TRIM(first_name)) LIKE '%laëtitia%')
        AND LOWER(TRIM(last_name)) = 'missatou'
      )
    LIMIT 1;

    IF v_laetitia_missatou_id IS NULL THEN
        RAISE EXCEPTION '❌ LAETITIA MISSATOU non trouvée. Vérifiez l''orthographe dans la base de données.';
    END IF;

    RAISE NOTICE '✅ LAETITIA MISSATOU trouvée (ID: %)', v_laetitia_missatou_id;
    RAISE NOTICE '✅ PASTEUR-003 trouvé (ID: %)', v_pasteur_003_id;

    -- S'assurer que LAETITIA MISSATOU est sous PS PEGGY NN
    UPDATE profils
    SET pasteur_id = v_pasteur_003_id,
        updated_at = NOW()
    WHERE id = v_laetitia_missatou_id;

    RAISE NOTICE '✅ LAETITIA MISSATOU assignée à PS PEGGY NN';

    -- Vérifier si la famille "LES VICTORIEUX" existe déjà pour PS PEGGY NN
    SELECT id INTO v_famille_victorieux_id
    FROM familles_disciples
    WHERE nom = 'LES VICTORIEUX'
      AND pasteur_id = v_pasteur_003_id
    LIMIT 1;

    IF v_famille_victorieux_id IS NOT NULL THEN
        -- La famille existe déjà, la lier à LAETITIA MISSATOU
        UPDATE familles_disciples
        SET superviseur_id = v_laetitia_missatou_id,
            pasteur_id = v_pasteur_003_id,
            nom = 'LES VICTORIEUX',
            updated_at = NOW()
        WHERE id = v_famille_victorieux_id;

        RAISE NOTICE '✅ Famille "LES VICTORIEUX" existante liée à LAETITIA MISSATOU';
    ELSE
        -- Créer la famille "LES VICTORIEUX"
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

        RAISE NOTICE '✅ Famille "LES VICTORIEUX" créée pour LAETITIA MISSATOU';
    END IF;

    -- Mettre à jour le famille_id dans profils
    UPDATE profils
    SET famille_id = v_famille_victorieux_id,
        updated_at = NOW()
    WHERE id = v_laetitia_missatou_id;

    RAISE NOTICE '✅ famille_id mis à jour dans profils';

    -- S'assurer qu'aucune autre famille n'est liée à LAETITIA MISSATOU
    UPDATE familles_disciples
    SET superviseur_id = NULL,
        updated_at = NOW()
    WHERE superviseur_id = v_laetitia_missatou_id
      AND id != v_famille_victorieux_id;

    RAISE NOTICE '✅ Autres familles déliées de LAETITIA MISSATOU';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CORRECTION TERMINÉE';
    RAISE NOTICE '========================================';
END $$;

-- Vérification finale
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

-- Détail des familles de PS PEGGY NN
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
