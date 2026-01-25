-- ============================================
-- Migration: Corriger la confusion entre LAËTITIA OBAME et LAETITIA MISSATOU
-- Objectif: 
--   - LAËTITIA OBAME (DR MODE) -> LES RACHETÉS (FAM017)
--   - LAETITIA MISSATOU (PS PEGGY NN) -> LES VICTORIEUX (FAM017 ou nouvelle famille)
-- Date: 2025-01-XX
-- ============================================

-- 1. Identifier les deux Laetitia
SELECT 
    '=== IDENTIFICATION DES DEUX LAETITIA ===' AS info;

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
    CASE 
        WHEN LOWER(TRIM(p.last_name)) = 'obame' AND pasteur.identifiant_unique = 'PASTEUR-001' THEN '✅ LAËTITIA OBAME (DR MODE) - CORRECT'
        WHEN LOWER(TRIM(p.last_name)) = 'obame' AND pasteur.identifiant_unique != 'PASTEUR-001' THEN '❌ LAËTITIA OBAME - MAUVAIS PASTEUR'
        WHEN LOWER(TRIM(p.last_name)) = 'missatou' AND pasteur.identifiant_unique = 'PASTEUR-003' THEN '✅ LAETITIA MISSATOU (PS PEGGY NN) - CORRECT'
        WHEN LOWER(TRIM(p.last_name)) = 'missatou' AND pasteur.identifiant_unique != 'PASTEUR-003' THEN '❌ LAETITIA MISSATOU - MAUVAIS PASTEUR'
        ELSE '⚠️  À VÉRIFIER'
    END AS statut
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND LOWER(TRIM(p.first_name)) LIKE '%laetitia%'
ORDER BY p.last_name, p.pasteur_id;

-- 2. Vérifier les familles FAM017
SELECT 
    '=== VÉRIFICATION DES FAMILLES FAM017 ===' AS info;

SELECT 
    f.id,
    f.nom,
    f.identifiant_famille,
    f.superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    s.email AS superviseur_email,
    s.pasteur_id AS superviseur_pasteur_id,
    pasteur_superviseur.identifiant_unique AS superviseur_pasteur_identifiant,
    f.pasteur_id AS famille_pasteur_id,
    pasteur_famille.identifiant_unique AS famille_pasteur_identifiant,
    CASE 
        WHEN f.nom = 'LES RACHETÉS' AND LOWER(TRIM(s.last_name)) = 'obame' AND pasteur_superviseur.identifiant_unique = 'PASTEUR-001' THEN '✅ CORRECT'
        WHEN f.nom = 'LES VICTORIEUX' AND LOWER(TRIM(s.last_name)) = 'missatou' AND pasteur_superviseur.identifiant_unique = 'PASTEUR-003' THEN '✅ CORRECT'
        ELSE '⚠️  À CORRIGER'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
LEFT JOIN profils pasteur_superviseur ON pasteur_superviseur.id = s.pasteur_id
LEFT JOIN profils pasteur_famille ON pasteur_famille.id = f.pasteur_id
WHERE f.identifiant_famille = 'FAM017'
   OR f.nom IN ('LES RACHETÉS', 'LES VICTORIEUX')
ORDER BY f.identifiant_famille, f.nom;

-- 3. Corriger les assignations
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
    RAISE NOTICE 'CORRECTION DES ASSIGNATIONS LAETITIA';
    RAISE NOTICE '========================================';

    -- Trouver les pasteurs
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_003_id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1;

    -- Trouver LAËTITIA OBAME (devrait être sous DR MODE)
    SELECT id INTO v_laetitia_obame_id
    FROM profils
    WHERE role = 'superviseur'
      AND LOWER(TRIM(first_name)) LIKE '%laetitia%'
      AND LOWER(TRIM(last_name)) = 'obame'
    LIMIT 1;

    -- Trouver LAETITIA MISSATOU (devrait être sous PS PEGGY NN)
    SELECT id INTO v_laetitia_missatou_id
    FROM profils
    WHERE role = 'superviseur'
      AND LOWER(TRIM(first_name)) LIKE '%laetitia%'
      AND LOWER(TRIM(last_name)) = 'missatou'
    LIMIT 1;

    RAISE NOTICE 'LAËTITIA OBAME trouvée: %', v_laetitia_obame_id;
    RAISE NOTICE 'LAETITIA MISSATOU trouvée: %', v_laetitia_missatou_id;

    -- S'assurer que LAËTITIA OBAME est sous DR MODE
    IF v_laetitia_obame_id IS NOT NULL THEN
        UPDATE profils
        SET pasteur_id = v_pasteur_001_id,
            updated_at = NOW()
        WHERE id = v_laetitia_obame_id
          AND (pasteur_id IS NULL OR pasteur_id != v_pasteur_001_id);

        IF FOUND THEN
            RAISE NOTICE '✅ LAËTITIA OBAME assignée à DR MODE';
        END IF;

        -- Trouver ou créer la famille "LES RACHETÉS" (FAM017) pour LAËTITIA OBAME
        SELECT id INTO v_famille_rachetes_id
        FROM familles_disciples
        WHERE identifiant_famille = 'FAM017'
          AND nom = 'LES RACHETÉS'
        LIMIT 1;

        IF v_famille_rachetes_id IS NOT NULL THEN
            -- Mettre à jour la famille
            UPDATE familles_disciples
            SET superviseur_id = v_laetitia_obame_id,
                pasteur_id = v_pasteur_001_id,
                nom = 'LES RACHETÉS',
                updated_at = NOW()
            WHERE id = v_famille_rachetes_id;

            RAISE NOTICE '✅ Famille "LES RACHETÉS" (FAM017) liée à LAËTITIA OBAME (DR MODE)';
        ELSE
            -- Créer la famille
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

    -- S'assurer que LAETITIA MISSATOU est sous PS PEGGY NN
    IF v_laetitia_missatou_id IS NOT NULL THEN
        UPDATE profils
        SET pasteur_id = v_pasteur_003_id,
            updated_at = NOW()
        WHERE id = v_laetitia_missatou_id
          AND (pasteur_id IS NULL OR pasteur_id != v_pasteur_003_id);

        IF FOUND THEN
            RAISE NOTICE '✅ LAETITIA MISSATOU assignée à PS PEGGY NN';
        END IF;

        -- Trouver ou créer la famille "LES VICTORIEUX" pour LAETITIA MISSATOU
        -- Note: Si FAM017 est déjà utilisé pour "LES RACHETÉS", on peut utiliser un autre identifiant ou créer une nouvelle famille
        SELECT id INTO v_famille_victorieux_id
        FROM familles_disciples
        WHERE superviseur_id = v_laetitia_missatou_id
          AND nom = 'LES VICTORIEUX'
        LIMIT 1;

        IF v_famille_victorieux_id IS NOT NULL THEN
            -- Mettre à jour la famille
            UPDATE familles_disciples
            SET pasteur_id = v_pasteur_003_id,
                nom = 'LES VICTORIEUX',
                updated_at = NOW()
            WHERE id = v_famille_victorieux_id;

            RAISE NOTICE '✅ Famille "LES VICTORIEUX" liée à LAETITIA MISSATOU (PS PEGGY NN)';
        ELSE
            -- Chercher si une famille "LES VICTORIEUX" existe déjà avec un autre identifiant
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
                    updated_at = NOW()
                WHERE id = v_famille_victorieux_id;

                RAISE NOTICE '✅ Famille "LES VICTORIEUX" existante liée à LAETITIA MISSATOU (PS PEGGY NN)';
            ELSE
                -- Créer une nouvelle famille "LES VICTORIEUX" avec un identifiant unique
                -- Utiliser FAM016 si disponible, sinon créer avec un identifiant unique
                DECLARE
                    v_identifiant text;
                BEGIN
                    -- Vérifier si FAM016 est disponible
                    IF NOT EXISTS (SELECT 1 FROM familles_disciples WHERE identifiant_famille = 'FAM016') THEN
                        v_identifiant := 'FAM016';
                    ELSE
                        -- Utiliser un identifiant unique basé sur le superviseur
                        v_identifiant := 'FAM017-VICTORIEUX';
                    END IF;

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
                        v_identifiant,
                        v_laetitia_missatou_id,
                        v_pasteur_003_id,
                        'actif',
                        70,
                        NOW(),
                        NOW()
                    ) RETURNING id INTO v_famille_victorieux_id;

                    RAISE NOTICE '✅ Famille "LES VICTORIEUX" (%) créée pour LAETITIA MISSATOU (PS PEGGY NN)', v_identifiant;
                END;
            END IF;
        END IF;

        -- Mettre à jour le famille_id dans profils
        UPDATE profils
        SET famille_id = v_famille_victorieux_id,
            updated_at = NOW()
        WHERE id = v_laetitia_missatou_id;

        v_corrected_count := v_corrected_count + 1;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ % correction(s) effectuée(s)', v_corrected_count;
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

-- 5. Détail des deux Laetitia après correction
SELECT 
    '=== DÉTAIL DES DEUX LAETITIA APRÈS CORRECTION ===' AS info;

SELECT 
    p.first_name || ' ' || p.last_name AS superviseur_nom,
    p.email AS superviseur_email,
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    f.nom AS famille_nom,
    f.identifiant_famille,
    CASE 
        WHEN LOWER(TRIM(p.last_name)) = 'obame' AND pasteur.identifiant_unique = 'PASTEUR-001' AND f.nom = 'LES RACHETÉS' THEN '✅ CORRECT'
        WHEN LOWER(TRIM(p.last_name)) = 'missatou' AND pasteur.identifiant_unique = 'PASTEUR-003' AND f.nom = 'LES VICTORIEUX' THEN '✅ CORRECT'
        ELSE '⚠️  À VÉRIFIER'
    END AS statut
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND LOWER(TRIM(p.first_name)) LIKE '%laetitia%'
ORDER BY p.last_name;
