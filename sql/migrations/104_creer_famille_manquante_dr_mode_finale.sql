-- ============================================
-- Migration: Créer la famille manquante finale pour DR MODE
-- Objectif: S'assurer que DR MODE a bien 12 familles
-- Date: 2025-01-XX
-- ============================================

-- 1. Identifier quel superviseur de DR MODE n'a pas de famille
SELECT 
    '=== SUPERVISEURS DE DR MODE SANS FAMILLE ===' AS info;

WITH superviseurs_attendus AS (
    SELECT 'BETSALEEL' AS prenom, 'BADILA' AS nom, 'Les ÉCLAIRÉS' AS famille_nom, 'FAM004' AS identifiant
    UNION ALL SELECT 'COCO', 'OKANZI', 'ZÉLES', 'FAM006'
    UNION ALL SELECT 'ELISABETH', 'AMECY', 'LES COMBATTANTS', 'FAM009'
    UNION ALL SELECT 'EPHREM', 'MBA', 'LES AGAPÉS', 'FAM010'
    UNION ALL SELECT 'HÉLÈNE', 'LAMAGO', 'LES GLORIEUX', 'FAM012'
    UNION ALL SELECT 'KARINE', 'WILLIAM', 'LES ÉQUIPÉS', 'FAM015'
    UNION ALL SELECT 'KÉVIN', 'THÉA', 'LES INGÉNIEUX', 'FAM016'
    UNION ALL SELECT 'LAETITIA', 'OBAME', 'LES RACHETÉS', 'FAM017'
    UNION ALL SELECT 'MANICIA', 'THÉA', 'LES RADIEUSES', 'FAM018'
    UNION ALL SELECT 'NASDÈNE', 'KODIA', 'LES INEBRANLABLES', 'FAM020'
    UNION ALL SELECT 'ROCHELLE', 'PASSI BEN', 'LES PASSIONNÉS', 'FAM023'
    UNION ALL SELECT 'YVAN', 'DESSANDE', 'LES DISCIPLES', 'FAM026'
)
SELECT 
    sa.prenom || ' ' || sa.nom AS superviseur_attendu,
    sa.famille_nom AS famille_attendue,
    sa.identifiant AS identifiant_attendu,
    p.id AS superviseur_id,
    p.email AS superviseur_email,
    p.pasteur_id AS pasteur_id_actuel,
    f.id AS famille_id,
    f.nom AS famille_reelle,
    f.identifiant_famille AS identifiant_reel,
    CASE 
        WHEN p.id IS NULL THEN '❌ SUPERVISEUR NON TROUVÉ'
        WHEN p.pasteur_id != (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1) THEN '❌ MAUVAIS PASTEUR'
        WHEN f.id IS NULL THEN '❌ FAMILLE MANQUANTE'
        WHEN f.identifiant_famille != sa.identifiant THEN '⚠️  MAUVAIS IDENTIFIANT'
        WHEN f.nom != sa.famille_nom THEN '⚠️  MAUVAIS NOM'
        ELSE '✅ CORRECT'
    END AS statut
FROM superviseurs_attendus sa
LEFT JOIN profils p ON (
    (
        LOWER(TRIM(p.first_name)) = LOWER(TRIM(sa.prenom))
        OR (LOWER(TRIM(sa.prenom)) = 'kévin' AND LOWER(TRIM(p.first_name)) = 'kevin')
        OR (LOWER(TRIM(sa.prenom)) = 'hélène' AND LOWER(TRIM(p.first_name)) = 'helene')
        OR (LOWER(TRIM(sa.prenom)) = 'nasdène' AND LOWER(TRIM(p.first_name)) = 'nasdene')
    )
    AND (
        LOWER(TRIM(p.last_name)) = LOWER(TRIM(sa.nom))
        OR (LOWER(TRIM(sa.nom)) = 'passi ben' AND LOWER(TRIM(p.last_name)) LIKE '%passi%')
        OR (LOWER(TRIM(sa.nom)) = 'théa' AND LOWER(TRIM(p.last_name)) = 'thea')
    )
    AND p.role = 'superviseur'
)
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
   OR (p.id IS NULL AND sa.prenom || ' ' || sa.nom IN (
       SELECT first_name || ' ' || last_name FROM profils 
       WHERE role = 'superviseur' 
       AND pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
   ))
ORDER BY 
    CASE 
        WHEN p.id IS NULL THEN 1
        WHEN p.pasteur_id != (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1) THEN 2
        WHEN f.id IS NULL THEN 3
        ELSE 4
    END,
    sa.identifiant;

-- 2. Créer la famille manquante
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
    RAISE NOTICE 'CRÉATION DE LA FAMILLE MANQUANTE';
    RAISE NOTICE '========================================';

    -- Trouver PASTEUR-001
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;

    IF v_pasteur_001_id IS NULL THEN
        RAISE EXCEPTION '❌ PASTEUR-001 (DR MODE) non trouvé';
    END IF;

    -- Pour chaque superviseur attendu de DR MODE
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

            -- Vérifier si le superviseur a déjà une famille
            SELECT id INTO v_famille_existante_id
            FROM familles_disciples
            WHERE superviseur_id = v_superviseur_id
              AND pasteur_id = v_pasteur_001_id
            LIMIT 1;

            IF v_famille_existante_id IS NOT NULL THEN
                -- Vérifier si la famille a le bon identifiant et nom
                IF EXISTS (
                    SELECT 1 FROM familles_disciples
                    WHERE id = v_famille_existante_id
                      AND identifiant_famille = v_superviseur_record.identifiant
                      AND nom = v_superviseur_record.famille_nom
                ) THEN
                    RAISE NOTICE 'ℹ️  Famille % (%) déjà correctement liée au superviseur % %', 
                        v_superviseur_record.famille_nom, v_superviseur_record.identifiant,
                        v_superviseur_record.prenom, v_superviseur_record.nom;
                    CONTINUE;
                ELSE
                    -- Mettre à jour la famille existante
                    UPDATE familles_disciples
                    SET identifiant_famille = v_superviseur_record.identifiant,
                        nom = v_superviseur_record.famille_nom,
                        updated_at = NOW()
                    WHERE id = v_famille_existante_id;
                    v_updated_count := v_updated_count + 1;
                    RAISE NOTICE '✅ Famille existante mise à jour: % (%) pour superviseur % %', 
                        v_superviseur_record.famille_nom, v_superviseur_record.identifiant,
                        v_superviseur_record.prenom, v_superviseur_record.nom;
                END IF;
            ELSE
                -- Vérifier si la famille existe déjà avec cet identifiant
                SELECT id INTO v_famille_existante_id
                FROM familles_disciples
                WHERE identifiant_famille = v_superviseur_record.identifiant
                LIMIT 1;

                IF v_famille_existante_id IS NOT NULL THEN
                    -- Mettre à jour la famille existante pour la lier au superviseur
                    UPDATE familles_disciples
                    SET superviseur_id = v_superviseur_id,
                        pasteur_id = v_pasteur_001_id,
                        nom = v_superviseur_record.famille_nom,
                        updated_at = NOW()
                    WHERE id = v_famille_existante_id;
                    v_famille_id := v_famille_existante_id;
                    v_updated_count := v_updated_count + 1;
                    RAISE NOTICE '✅ Famille existante % (%) liée au superviseur % %', 
                        v_superviseur_record.famille_nom, v_superviseur_record.identifiant,
                        v_superviseur_record.prenom, v_superviseur_record.nom;
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
            END IF;
        END;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ % famille(s) créée(s)', v_created_count;
    RAISE NOTICE '✅ % famille(s) mise(s) à jour', v_updated_count;
    RAISE NOTICE '========================================';
END $$;

-- 3. Vérification finale
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

-- 4. Détail des familles de DR MODE
SELECT 
    '=== DÉTAIL DES FAMILLES DE DR MODE ===' AS info;

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
