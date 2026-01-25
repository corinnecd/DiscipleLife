-- ============================================
-- Migration: Identifier et créer la famille manquante pour DR MODE
-- Objectif: Trouver exactement quel superviseur de DR MODE n'a pas de famille et la créer
-- Date: 2025-01-XX
-- ============================================

-- 1. Liste complète des 12 superviseurs attendus pour DR MODE avec leurs familles
SELECT 
    '=== LISTE COMPLÈTE DES 12 SUPERVISEURS DR MODE ===' AS info;

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
    sa.prenom,
    sa.nom,
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
    AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
)
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
ORDER BY 
    CASE 
        WHEN p.id IS NULL THEN 1
        WHEN f.id IS NULL THEN 2
        ELSE 3
    END,
    sa.prenom, sa.nom;

-- 2. Identifier le superviseur SANS famille
SELECT 
    '=== SUPERVISEUR SANS FAMILLE ===' AS info;

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
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    sa.famille_nom AS famille_attendue,
    sa.identifiant AS identifiant_attendu,
    '❌ FAMILLE MANQUANTE' AS statut
FROM superviseurs_attendus sa
JOIN profils p ON (
    LOWER(TRIM(p.first_name)) = LOWER(TRIM(sa.prenom))
    AND LOWER(TRIM(p.last_name)) = LOWER(TRIM(sa.nom))
    AND p.role = 'superviseur'
    AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
)
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE f.id IS NULL
ORDER BY p.first_name, p.last_name;

-- 3. Créer la famille manquante
DO $$
DECLARE
    v_superviseur_record RECORD;
    v_famille_id uuid;
    v_famille_existante_id uuid;
    v_pasteur_001_id uuid;
    v_created_count integer := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CRÉATION DE LA FAMILLE MANQUANTE';
    RAISE NOTICE '========================================';

    -- Trouver PASTEUR-001
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;

    IF v_pasteur_001_id IS NULL THEN
        RAISE EXCEPTION '❌ PASTEUR-001 (DR MODE) non trouvé';
    END IF;

    -- Pour chaque superviseur de DR MODE sans famille
    FOR v_superviseur_record IN
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
            p.id AS superviseur_id,
            p.first_name,
            p.last_name,
            p.email,
            sa.famille_nom,
            sa.identifiant
        FROM superviseurs_attendus sa
        JOIN profils p ON (
            LOWER(TRIM(p.first_name)) = LOWER(TRIM(sa.prenom))
            AND LOWER(TRIM(p.last_name)) = LOWER(TRIM(sa.nom))
            AND p.role = 'superviseur'
            AND p.pasteur_id = v_pasteur_001_id
        )
        LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
        WHERE f.id IS NULL
        ORDER BY p.first_name, p.last_name
    LOOP
        RAISE NOTICE '--- Traitement de % % (Famille attendue: % - %) ---', 
            v_superviseur_record.first_name, 
            v_superviseur_record.last_name,
            v_superviseur_record.famille_nom,
            v_superviseur_record.identifiant;

        -- Vérifier si la famille existe déjà avec cet identifiant
        SELECT id INTO v_famille_existante_id
        FROM familles_disciples
        WHERE identifiant_famille = v_superviseur_record.identifiant
        LIMIT 1;

        IF v_famille_existante_id IS NOT NULL THEN
            -- La famille existe déjà, la lier au superviseur
            UPDATE familles_disciples
            SET superviseur_id = v_superviseur_record.superviseur_id,
                pasteur_id = v_pasteur_001_id,
                nom = v_superviseur_record.famille_nom,
                updated_at = NOW()
            WHERE id = v_famille_existante_id;

            v_famille_id := v_famille_existante_id;
            RAISE NOTICE '✅ Famille existante % (%) liée au superviseur % %', 
                v_superviseur_record.famille_nom, 
                v_superviseur_record.identifiant,
                v_superviseur_record.first_name, 
                v_superviseur_record.last_name;
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
                v_superviseur_record.superviseur_id,
                v_pasteur_001_id,
                'actif',
                70,
                NOW(),
                NOW()
            ) RETURNING id INTO v_famille_id;

            RAISE NOTICE '✅ Nouvelle famille créée: % (%) pour superviseur % %', 
                v_superviseur_record.famille_nom, 
                v_superviseur_record.identifiant,
                v_superviseur_record.first_name, 
                v_superviseur_record.last_name;
        END IF;

        -- Mettre à jour le famille_id dans profils
        UPDATE profils
        SET famille_id = v_famille_id,
            updated_at = NOW()
        WHERE id = v_superviseur_record.superviseur_id
          AND (famille_id IS NULL OR famille_id != v_famille_id);

        v_created_count := v_created_count + 1;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ % famille(s) créée(s) ou mise(s) à jour', v_created_count;
    RAISE NOTICE '========================================';
END $$;

-- 4. Vérification finale complète
SELECT 
    '=== VÉRIFICATION FINALE COMPLÈTE ===' AS info;

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
    COUNT(*) AS total_superviseurs_attendus,
    COUNT(p.id) AS superviseurs_trouves,
    COUNT(f.id) AS superviseurs_avec_famille,
    COUNT(*) - COUNT(f.id) AS superviseurs_sans_famille,
    CASE 
        WHEN COUNT(*) = 12 AND COUNT(f.id) = 12 THEN '✅ CORRECT (12 superviseurs, 12 familles)'
        WHEN COUNT(*) = 12 AND COUNT(f.id) < 12 THEN '⚠️  MANQUANT: ' || (12 - COUNT(f.id)) || ' famille(s)'
        ELSE '⚠️  PROBLÈME DÉTECTÉ'
    END AS statut
FROM superviseurs_attendus sa
LEFT JOIN profils p ON (
    LOWER(TRIM(p.first_name)) = LOWER(TRIM(sa.prenom))
    AND LOWER(TRIM(p.last_name)) = LOWER(TRIM(sa.nom))
    AND p.role = 'superviseur'
    AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
)
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id;

-- 5. Compter les familles par pasteur
SELECT 
    '=== COMPTAGE FINAL DES FAMILLES PAR PASTEUR ===' AS info;

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
