-- ============================================
-- Migration: Vérifier et corriger l'assignation des familles entre PS PEGGY NN et DR MODE
-- Objectif: Identifier si une famille de DR MODE a été incorrectement assignée à PS PEGGY NN
-- Date: 2025-01-XX
-- ============================================

-- 1. Lister toutes les familles de PS PEGGY NN (PASTEUR-003)
SELECT 
    '=== FAMILLES DE PS PEGGY NN (PASTEUR-003) ===' AS info;

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
        WHEN f.pasteur_id != s.pasteur_id THEN '⚠️  INCOHÉRENCE: Famille et superviseur ont des pasteurs différents'
        WHEN f.identifiant_famille IN ('FAM004', 'FAM006', 'FAM009', 'FAM010', 'FAM012', 'FAM015', 'FAM016', 'FAM017', 'FAM018', 'FAM020', 'FAM023', 'FAM026') THEN '⚠️  FAMILLE DE DR MODE ASSIGNÉE À PS PEGGY NN'
        ELSE '✅ CORRECT'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
LEFT JOIN profils pasteur_superviseur ON pasteur_superviseur.id = s.pasteur_id
LEFT JOIN profils pasteur_famille ON pasteur_famille.id = f.pasteur_id
WHERE f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
   OR s.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
ORDER BY f.identifiant_famille;

-- 2. Identifier les familles de DR MODE qui sont assignées à PS PEGGY NN
SELECT 
    '=== FAMILLES DE DR MODE ASSIGNÉES À PS PEGGY NN ===' AS info;

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
    '❌ DOIT ÊTRE CORRIGÉ' AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
LEFT JOIN profils pasteur_superviseur ON pasteur_superviseur.id = s.pasteur_id
LEFT JOIN profils pasteur_famille ON pasteur_famille.id = f.pasteur_id
WHERE f.identifiant_famille IN ('FAM004', 'FAM006', 'FAM009', 'FAM010', 'FAM012', 'FAM015', 'FAM016', 'FAM017', 'FAM018', 'FAM020', 'FAM023', 'FAM026')
  AND (
    f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
    OR s.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
  )
ORDER BY f.identifiant_famille;

-- 3. Liste des 4 familles attendues pour PS PEGGY NN
SELECT 
    '=== LISTE DES 4 FAMILLES ATTENDUES POUR PS PEGGY NN ===' AS info;

SELECT * FROM (VALUES
    ('ALAIN', 'SIL', 'LES DÉTERMINÉS', 'FAM001'),
    ('CARINE', 'MATONDO', 'Les AMOUREUX', 'FAM005'),
    ('GERVAIS', 'NKATOULOULOU', 'LES FIDÈLES', 'FAM011'),
    ('LAETITIA', 'MISSATOU', 'LES VICTORIEUX', 'FAM017')
) AS t(prenom, nom, famille_nom, identifiant)
ORDER BY identifiant;

-- 4. Liste des 12 familles attendues pour DR MODE
SELECT 
    '=== LISTE DES 12 FAMILLES ATTENDUES POUR DR MODE ===' AS info;

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
ORDER BY identifiant;

-- 5. Corriger les assignations incorrectes
DO $$
DECLARE
    v_pasteur_001_id uuid;
    v_pasteur_003_id uuid;
    v_famille_record RECORD;
    v_superviseur_id uuid;
    v_corrected_count integer := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CORRECTION DES ASSIGNATIONS INCORRECTES';
    RAISE NOTICE '========================================';

    -- Trouver les pasteurs
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_003_id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1;

    -- Pour chaque famille de DR MODE qui est assignée à PS PEGGY NN
    FOR v_famille_record IN
        SELECT 
            f.id,
            f.nom,
            f.identifiant_famille,
            f.superviseur_id,
            s.first_name,
            s.last_name,
            s.pasteur_id AS superviseur_pasteur_id
        FROM familles_disciples f
        LEFT JOIN profils s ON s.id = f.superviseur_id
        WHERE f.identifiant_famille IN ('FAM004', 'FAM006', 'FAM009', 'FAM010', 'FAM012', 'FAM015', 'FAM016', 'FAM017', 'FAM018', 'FAM020', 'FAM023', 'FAM026')
          AND (
            f.pasteur_id = v_pasteur_003_id
            OR s.pasteur_id = v_pasteur_003_id
          )
    LOOP
        RAISE NOTICE '--- Correction de la famille % (%) ---', v_famille_record.nom, v_famille_record.identifiant_famille;

        -- Trouver le superviseur de DR MODE qui devrait avoir cette famille selon l'identifiant
        IF v_famille_record.identifiant_famille = 'FAM004' THEN
            SELECT id INTO v_superviseur_id FROM profils WHERE role = 'superviseur' AND pasteur_id = v_pasteur_001_id AND LOWER(TRIM(first_name)) LIKE '%betsaleel%' AND LOWER(TRIM(last_name)) LIKE '%badila%' LIMIT 1;
        ELSIF v_famille_record.identifiant_famille = 'FAM006' THEN
            SELECT id INTO v_superviseur_id FROM profils WHERE role = 'superviseur' AND pasteur_id = v_pasteur_001_id AND LOWER(TRIM(first_name)) LIKE '%coco%' AND LOWER(TRIM(last_name)) LIKE '%okanzi%' LIMIT 1;
        ELSIF v_famille_record.identifiant_famille = 'FAM009' THEN
            SELECT id INTO v_superviseur_id FROM profils WHERE role = 'superviseur' AND pasteur_id = v_pasteur_001_id AND LOWER(TRIM(first_name)) LIKE '%elisabeth%' AND LOWER(TRIM(last_name)) LIKE '%amecy%' LIMIT 1;
        ELSIF v_famille_record.identifiant_famille = 'FAM010' THEN
            SELECT id INTO v_superviseur_id FROM profils WHERE role = 'superviseur' AND pasteur_id = v_pasteur_001_id AND LOWER(TRIM(first_name)) LIKE '%ephrem%' AND LOWER(TRIM(last_name)) LIKE '%mba%' LIMIT 1;
        ELSIF v_famille_record.identifiant_famille = 'FAM012' THEN
            SELECT id INTO v_superviseur_id FROM profils WHERE role = 'superviseur' AND pasteur_id = v_pasteur_001_id AND (LOWER(TRIM(first_name)) LIKE '%hélène%' OR LOWER(TRIM(first_name)) LIKE '%helene%') AND LOWER(TRIM(last_name)) LIKE '%lamago%' LIMIT 1;
        ELSIF v_famille_record.identifiant_famille = 'FAM015' THEN
            SELECT id INTO v_superviseur_id FROM profils WHERE role = 'superviseur' AND pasteur_id = v_pasteur_001_id AND LOWER(TRIM(first_name)) LIKE '%karine%' AND LOWER(TRIM(last_name)) LIKE '%william%' LIMIT 1;
        ELSIF v_famille_record.identifiant_famille = 'FAM016' THEN
            SELECT id INTO v_superviseur_id FROM profils WHERE role = 'superviseur' AND pasteur_id = v_pasteur_001_id AND (LOWER(TRIM(first_name)) LIKE '%kévin%' OR LOWER(TRIM(first_name)) LIKE '%kevin%') AND (LOWER(TRIM(last_name)) LIKE '%théa%' OR LOWER(TRIM(last_name)) LIKE '%thea%') LIMIT 1;
        ELSIF v_famille_record.identifiant_famille = 'FAM017' THEN
            SELECT id INTO v_superviseur_id FROM profils WHERE role = 'superviseur' AND pasteur_id = v_pasteur_001_id AND LOWER(TRIM(first_name)) LIKE '%laetitia%' AND LOWER(TRIM(last_name)) LIKE '%obame%' LIMIT 1;
        ELSIF v_famille_record.identifiant_famille = 'FAM018' THEN
            SELECT id INTO v_superviseur_id FROM profils WHERE role = 'superviseur' AND pasteur_id = v_pasteur_001_id AND LOWER(TRIM(first_name)) LIKE '%manicia%' AND (LOWER(TRIM(last_name)) LIKE '%théa%' OR LOWER(TRIM(last_name)) LIKE '%thea%') LIMIT 1;
        ELSIF v_famille_record.identifiant_famille = 'FAM020' THEN
            SELECT id INTO v_superviseur_id FROM profils WHERE role = 'superviseur' AND pasteur_id = v_pasteur_001_id AND (LOWER(TRIM(first_name)) LIKE '%nasdène%' OR LOWER(TRIM(first_name)) LIKE '%nasdene%') AND LOWER(TRIM(last_name)) LIKE '%kodia%' LIMIT 1;
        ELSIF v_famille_record.identifiant_famille = 'FAM023' THEN
            SELECT id INTO v_superviseur_id FROM profils WHERE role = 'superviseur' AND pasteur_id = v_pasteur_001_id AND LOWER(TRIM(first_name)) LIKE '%rochelle%' AND LOWER(TRIM(last_name)) LIKE '%passi%' LIMIT 1;
        ELSIF v_famille_record.identifiant_famille = 'FAM026' THEN
            SELECT id INTO v_superviseur_id FROM profils WHERE role = 'superviseur' AND pasteur_id = v_pasteur_001_id AND LOWER(TRIM(first_name)) LIKE '%yvan%' AND LOWER(TRIM(last_name)) LIKE '%dessande%' LIMIT 1;
        END IF;

        IF v_superviseur_id IS NOT NULL THEN
            -- Corriger l'assignation de la famille
            UPDATE familles_disciples
            SET superviseur_id = v_superviseur_id,
                pasteur_id = v_pasteur_001_id,
                updated_at = NOW()
            WHERE id = v_famille_record.id;

            -- Mettre à jour le famille_id dans profils pour le superviseur
            UPDATE profils
            SET famille_id = v_famille_record.id,
                updated_at = NOW()
            WHERE id = v_superviseur_id;

            v_corrected_count := v_corrected_count + 1;
            RAISE NOTICE '✅ Famille % (%) réassignée à DR MODE (superviseur: %)', 
                v_famille_record.nom, 
                v_famille_record.identifiant_famille,
                v_superviseur_id;
        ELSE
            RAISE NOTICE '⚠️  Superviseur de DR MODE non trouvé pour la famille % (%)', 
                v_famille_record.nom, 
                v_famille_record.identifiant_famille;
        END IF;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ % famille(s) corrigée(s)', v_corrected_count;
    RAISE NOTICE '========================================';
END $$;

-- 6. Vérification finale
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
