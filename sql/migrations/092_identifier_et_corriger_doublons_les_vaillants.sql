-- ============================================
-- Migration: Identifier et corriger les doublons "LES VAILLANTS"
-- Objectif: Trouver les 3 familles "LES VAILLANTS" et les consolider
-- Date: 2025-01-XX
-- ============================================

-- 1. Identifier toutes les familles "LES VAILLANTS" (avec variations de casse)
SELECT 
    '=== TOUTES LES FAMILLES "LES VAILLANTS" (VARIATIONS) ===' AS info;

SELECT 
    f.id,
    f.nom,
    f.identifiant_famille,
    f.superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    s.email AS superviseur_email,
    s.pasteur_id,
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    f.pasteur_id AS famille_pasteur_id,
    f.created_at,
    f.updated_at,
    CASE 
        WHEN f.superviseur_id IS NULL THEN '⚠️  SANS SUPERVISEUR'
        WHEN s.id IS NULL THEN '⚠️  SUPERVISEUR INEXISTANT'
        WHEN f.pasteur_id IS NULL THEN '⚠️  SANS PASTEUR'
        WHEN f.pasteur_id != s.pasteur_id THEN '⚠️  INCOHÉRENCE PASTEUR'
        ELSE '✅ CORRECT'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
LEFT JOIN profils pasteur ON pasteur.id = COALESCE(f.pasteur_id, s.pasteur_id)
WHERE LOWER(TRIM(f.nom)) LIKE '%vaillant%'
   OR f.identifiant_famille IN ('FAM002', 'FAM013')
ORDER BY f.identifiant_famille, f.created_at;

-- 2. Compter les occurrences
SELECT 
    '=== COMPTAGE DES OCCURRENCES ===' AS info;

SELECT 
    COUNT(*) AS total_familles_vaillants,
    COUNT(DISTINCT identifiant_famille) AS identifiants_uniques,
    COUNT(DISTINCT superviseur_id) AS superviseurs_uniques,
    STRING_AGG(DISTINCT identifiant_famille, ', ' ORDER BY identifiant_famille) AS liste_identifiants,
    STRING_AGG(DISTINCT nom, ' | ' ORDER BY nom) AS liste_noms
FROM familles_disciples
WHERE LOWER(TRIM(nom)) LIKE '%vaillant%'
   OR identifiant_famille IN ('FAM002', 'FAM013');

-- 3. Identifier les superviseurs concernés
SELECT 
    '=== SUPERVISEURS CONCERNÉS PAR "LES VAILLANTS" ===' AS info;

SELECT 
    s.id AS superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    s.email AS superviseur_email,
    s.pasteur_id,
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    f.id AS famille_id,
    f.nom AS famille_nom,
    f.identifiant_famille,
    CASE 
        WHEN s.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1) THEN 'DR MODE'
        WHEN s.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-004' AND role = 'pasteur' LIMIT 1) THEN 'PS JESSY'
        ELSE 'AUTRE'
    END AS pasteur_attendu
FROM profils s
LEFT JOIN familles_disciples f ON f.superviseur_id = s.id
LEFT JOIN profils pasteur ON pasteur.id = s.pasteur_id
WHERE s.role = 'superviseur'
  AND (
    LOWER(TRIM(s.first_name)) = 'andréa' AND LOWER(TRIM(s.last_name)) = 'ernest'
    OR LOWER(TRIM(s.first_name)) = 'andrea' AND LOWER(TRIM(s.last_name)) = 'ernest'
    OR LOWER(TRIM(s.first_name)) LIKE '%hélène%' AND LOWER(TRIM(s.last_name)) LIKE '%lamago%'
    OR LOWER(TRIM(s.first_name)) LIKE '%helene%' AND LOWER(TRIM(s.last_name)) LIKE '%lamago%'
  )
ORDER BY s.first_name, s.last_name;

-- 4. Corriger les doublons
DO $$
DECLARE
    v_famille_record RECORD;
    v_famille_a_garder_id uuid;
    v_famille_a_supprimer_ids uuid[];
    v_superviseur_andrea_id uuid;
    v_superviseur_helene_id uuid;
    v_pasteur_001_id uuid;
    v_pasteur_004_id uuid;
    v_famille_andrea_id uuid;
    v_famille_helene_id uuid;
    v_corrected_count integer := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CORRECTION DES DOUBLONS "LES VAILLANTS"';
    RAISE NOTICE '========================================';

    -- Trouver les pasteurs
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_004_id FROM profils WHERE identifiant_unique = 'PASTEUR-004' AND role = 'pasteur' LIMIT 1;

    -- Trouver les superviseurs concernés
    -- ANDRÉA ERNEST (PS JESSY - PASTEUR-004) -> FAM002 "Les VAILLANTS"
    SELECT id INTO v_superviseur_andrea_id
    FROM profils
    WHERE role = 'superviseur'
      AND (
        (LOWER(TRIM(first_name)) = 'andréa' OR LOWER(TRIM(first_name)) = 'andrea')
        AND LOWER(TRIM(last_name)) = 'ernest'
      )
      AND pasteur_id = v_pasteur_004_id
    LIMIT 1;

    -- HÉLÈNE LAMAGO (DR MODE - PASTEUR-001) -> FAM012 "LES GLORIEUX" (pas "LES VAILLANTS")
    -- Mais selon la migration 035, HÉLÈNE LAMAGO a aussi "Les Vaillants" FAM013
    SELECT id INTO v_superviseur_helene_id
    FROM profils
    WHERE role = 'superviseur'
      AND (
        LOWER(TRIM(first_name)) LIKE '%hélène%' OR LOWER(TRIM(first_name)) LIKE '%helene%'
      )
      AND LOWER(TRIM(last_name)) LIKE '%lamago%'
      AND pasteur_id = v_pasteur_001_id
    LIMIT 1;

    RAISE NOTICE 'Superviseur ANDRÉA ERNEST trouvé: %', v_superviseur_andrea_id;
    RAISE NOTICE 'Superviseur HÉLÈNE LAMAGO trouvé: %', v_superviseur_helene_id;

    -- Pour ANDRÉA ERNEST (PS JESSY) -> FAM002 "Les VAILLANTS"
    IF v_superviseur_andrea_id IS NOT NULL THEN
        -- Chercher la famille FAM002
        SELECT id INTO v_famille_andrea_id
        FROM familles_disciples
        WHERE identifiant_famille = 'FAM002'
        LIMIT 1;

        IF v_famille_andrea_id IS NOT NULL THEN
            -- Mettre à jour la famille FAM002 pour la lier à ANDRÉA ERNEST
            UPDATE familles_disciples
            SET superviseur_id = v_superviseur_andrea_id,
                pasteur_id = v_pasteur_004_id,
                nom = 'Les VAILLANTS',
                updated_at = NOW()
            WHERE id = v_famille_andrea_id;

            -- Mettre à jour le famille_id dans profils
            UPDATE profils
            SET famille_id = v_famille_andrea_id,
                updated_at = NOW()
            WHERE id = v_superviseur_andrea_id;

            RAISE NOTICE '✅ FAM002 "Les VAILLANTS" liée à ANDRÉA ERNEST (PS JESSY)';
            v_corrected_count := v_corrected_count + 1;
        END IF;
    END IF;

    -- Pour HÉLÈNE LAMAGO (DR MODE) -> FAM012 "LES GLORIEUX" (pas "LES VAILLANTS")
    -- Supprimer ou corriger les familles "LES VAILLANTS" liées à HÉLÈNE LAMAGO
    IF v_superviseur_helene_id IS NOT NULL THEN
        -- Chercher la famille FAM012 "LES GLORIEUX"
        SELECT id INTO v_famille_helene_id
        FROM familles_disciples
        WHERE identifiant_famille = 'FAM012'
          AND LOWER(TRIM(nom)) LIKE '%glorieux%'
        LIMIT 1;

        IF v_famille_helene_id IS NOT NULL THEN
            -- Mettre à jour la famille FAM012 pour la lier à HÉLÈNE LAMAGO
            UPDATE familles_disciples
            SET superviseur_id = v_superviseur_helene_id,
                pasteur_id = v_pasteur_001_id,
                nom = 'LES GLORIEUX',
                updated_at = NOW()
            WHERE id = v_famille_helene_id;

            -- Mettre à jour le famille_id dans profils
            UPDATE profils
            SET famille_id = v_famille_helene_id,
                updated_at = NOW()
            WHERE id = v_superviseur_helene_id;

            RAISE NOTICE '✅ FAM012 "LES GLORIEUX" liée à HÉLÈNE LAMAGO (DR MODE)';
            v_corrected_count := v_corrected_count + 1;
        END IF;

        -- Supprimer les familles "LES VAILLANTS" liées à HÉLÈNE LAMAGO (FAM013)
        FOR v_famille_record IN
            SELECT id, identifiant_famille, nom
            FROM familles_disciples
            WHERE superviseur_id = v_superviseur_helene_id
              AND (LOWER(TRIM(nom)) LIKE '%vaillant%' OR identifiant_famille = 'FAM013')
        LOOP
            -- Vérifier s'il y a des membres dans cette famille avant de supprimer
            DECLARE
                v_nombre_membres integer;
            BEGIN
                SELECT COUNT(*) INTO v_nombre_membres
                FROM profils
                WHERE famille_id = v_famille_record.id;

                IF v_nombre_membres = 0 THEN
                    -- Supprimer la famille si elle n'a pas de membres
                    DELETE FROM familles_disciples
                    WHERE id = v_famille_record.id;
                    RAISE NOTICE '✅ Famille dupliquée supprimée: % (%)', v_famille_record.nom, v_famille_record.identifiant_famille;
                    v_corrected_count := v_corrected_count + 1;
                ELSE
                    -- Si la famille a des membres, ne pas la supprimer mais la délier du superviseur
                    UPDATE familles_disciples
                    SET superviseur_id = NULL,
                        updated_at = NOW()
                    WHERE id = v_famille_record.id;
                    RAISE NOTICE '⚠️  Famille % (%) a % membre(s), déliée du superviseur (non supprimée)', 
                        v_famille_record.nom, v_famille_record.identifiant_famille, v_nombre_membres;
                END IF;
            END;
        END LOOP;
    END IF;

    -- Supprimer les autres doublons "LES VAILLANTS" qui ne sont liés à aucun superviseur
    FOR v_famille_record IN
        SELECT id, identifiant_famille, nom, superviseur_id
        FROM familles_disciples
        WHERE LOWER(TRIM(nom)) LIKE '%vaillant%'
          AND superviseur_id IS NULL
    LOOP
        -- Vérifier s'il y a des membres dans cette famille avant de supprimer
        DECLARE
            v_nombre_membres integer;
        BEGIN
            SELECT COUNT(*) INTO v_nombre_membres
            FROM profils
            WHERE famille_id = v_famille_record.id;

            IF v_nombre_membres = 0 THEN
                -- Supprimer la famille orpheline
                DELETE FROM familles_disciples
                WHERE id = v_famille_record.id;
                RAISE NOTICE '✅ Famille orpheline supprimée: % (%)', v_famille_record.nom, v_famille_record.identifiant_famille;
                v_corrected_count := v_corrected_count + 1;
            ELSE
                RAISE NOTICE '⚠️  Famille orpheline % (%) a % membre(s), conservée', 
                    v_famille_record.nom, v_famille_record.identifiant_famille, v_nombre_membres;
            END IF;
        END;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ % correction(s) effectuée(s)', v_corrected_count;
    RAISE NOTICE '========================================';
END $$;

-- 5. Vérification finale
SELECT 
    '=== VÉRIFICATION FINALE ===' AS info;

SELECT 
    f.id,
    f.nom,
    f.identifiant_famille,
    f.superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    pasteur.identifiant_unique AS pasteur_identifiant,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    CASE 
        WHEN f.superviseur_id IS NULL THEN '⚠️  SANS SUPERVISEUR'
        WHEN s.id IS NULL THEN '⚠️  SUPERVISEUR INEXISTANT'
        ELSE '✅ CORRECT'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
LEFT JOIN profils pasteur ON pasteur.id = COALESCE(f.pasteur_id, s.pasteur_id)
WHERE LOWER(TRIM(f.nom)) LIKE '%vaillant%'
   OR f.identifiant_famille IN ('FAM002', 'FAM013')
ORDER BY f.identifiant_famille;

-- 6. Compter les familles par pasteur après correction
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
