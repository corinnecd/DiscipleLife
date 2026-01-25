-- ============================================
-- Migration: Forcer la création de toutes les familles manquantes pour DR MODE
-- Objectif: S'assurer que les 12 superviseurs de DR MODE ont tous une famille
-- Date: 2025-01-XX
-- ============================================

DO $$
DECLARE
    v_pasteur_001_id uuid;
    v_superviseur_record RECORD;
    v_famille_id uuid;
    v_famille_existante_id uuid;
    v_created_count integer := 0;
    v_updated_count integer := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRÉATION FORCÉE DES FAMILLES MANQUANTES';
    RAISE NOTICE '========================================';

    -- Trouver PASTEUR-001
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;

    IF v_pasteur_001_id IS NULL THEN
        RAISE EXCEPTION '❌ PASTEUR-001 (DR MODE) non trouvé';
    END IF;

    RAISE NOTICE 'PASTEUR-001 trouvé: %', v_pasteur_001_id;

    -- Pour chaque superviseur attendu
    FOR v_superviseur_record IN
        SELECT * FROM (VALUES
            ('BETSALEEL', 'BADILA', 'Les ÉCLAIRÉS', 'FAM004'),
            ('COCO', 'OKANZI', 'ZÉLES', 'FAM006'),
            ('ELISABETH', 'AMECY', 'LES COMBATTANTS', 'FAM009'),
            ('EPHREM', 'MBA', 'LES AGAPÉS', 'FAM010'),
            ('HÉLÈNE', 'LAMAGO', 'LES GLORIEUX', 'FAM012'),
            ('KARINE', 'WILLIAM', 'LES ÉQUIPÉS', 'FAM015'),
            ('KÉVIN', 'THÉA', 'LES INGÉNIEUX', 'FAM016'),
            ('LAETITIA', 'OBAME', 'LES RACHETÉS', 'FAM017'),
            ('MANICIA', 'THÉA', 'LES RADIEUSES', 'FAM018'),
            ('NASDÈNE', 'KODIA', 'LES INEBRANLABLES', 'FAM020'),
            ('ROCHELLE', 'PASSI BEN', 'LES PASSIONNÉS', 'FAM023'),
            ('YVAN', 'DESSANDE', 'LES DISCIPLES', 'FAM026')
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
              AND pasteur_id = v_pasteur_001_id
              AND (
                (
                    LOWER(TRIM(first_name)) = LOWER(TRIM(v_superviseur_record.prenom))
                    OR (LOWER(TRIM(v_superviseur_record.prenom)) = 'kévin' AND LOWER(TRIM(first_name)) = 'kevin')
                    OR (LOWER(TRIM(v_superviseur_record.prenom)) = 'hélène' AND LOWER(TRIM(first_name)) = 'helene')
                    OR (LOWER(TRIM(v_superviseur_record.prenom)) = 'nasdène' AND LOWER(TRIM(first_name)) = 'nasdene')
                )
                AND (
                    LOWER(TRIM(last_name)) = LOWER(TRIM(v_superviseur_record.nom))
                    OR (LOWER(TRIM(v_superviseur_record.nom)) = 'passi ben' AND LOWER(TRIM(last_name)) LIKE '%passi%')
                    OR (LOWER(TRIM(v_superviseur_record.nom)) = 'théa' AND LOWER(TRIM(last_name)) = 'thea')
                )
              )
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
                ) THEN
                    RAISE NOTICE 'ℹ️  Famille % (%) déjà liée au superviseur', 
                        v_superviseur_record.famille_nom, v_superviseur_record.identifiant;
                    v_famille_id := v_famille_existante_id;
                ELSE
                    -- Mettre à jour la famille pour la lier au superviseur
                    UPDATE familles_disciples
                    SET superviseur_id = v_superviseur_id,
                        pasteur_id = v_pasteur_001_id,
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
                    v_pasteur_001_id,
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
