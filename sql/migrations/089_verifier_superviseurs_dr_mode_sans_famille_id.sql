-- ============================================
-- Migration: Vérifier les superviseurs de DR MODE sans famille_id
-- Objectif: Identifier les superviseurs de DR MODE qui n'ont pas de famille_id dans profils
-- Date: 2025-01-XX
-- ============================================

-- 1. Lister tous les superviseurs de DR MODE (PASTEUR-001)
SELECT 
    '=== SUPERVISEURS DE DR MODE (PASTEUR-001) ===' AS info;

SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.identifiant_unique,
    p.pasteur_id,
    p.famille_id,
    f.nom AS famille_nom,
    f.identifiant_famille,
    CASE 
        WHEN p.famille_id IS NULL THEN '❌ PAS DE famille_id'
        WHEN f.id IS NULL THEN '⚠️  famille_id INVALIDE'
        WHEN f.superviseur_id != p.id THEN '⚠️  FAMILLE NON LIÉE AU SUPERVISEUR'
        ELSE '✅ CORRECT'
    END AS statut
FROM profils p
LEFT JOIN familles_disciples f ON p.famille_id = f.id
WHERE p.role = 'superviseur'
  AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
ORDER BY 
    CASE 
        WHEN p.famille_id IS NULL THEN 1
        WHEN f.id IS NULL THEN 2
        WHEN f.superviseur_id != p.id THEN 3
        ELSE 4
    END,
    p.first_name, p.last_name;

-- 2. Compter les superviseurs avec et sans famille_id
SELECT 
    '=== STATISTIQUES DR MODE ===' AS info;

SELECT 
    COUNT(*) AS total_superviseurs,
    COUNT(p.famille_id) AS superviseurs_avec_famille_id,
    COUNT(*) - COUNT(p.famille_id) AS superviseurs_sans_famille_id,
    COUNT(f.id) AS superviseurs_avec_famille_valide,
    CASE 
        WHEN COUNT(*) = 12 AND COUNT(p.famille_id) = 12 THEN '✅ CORRECT (12 superviseurs avec famille_id)'
        WHEN COUNT(*) = 12 AND COUNT(p.famille_id) < 12 THEN '⚠️  MANQUANT: ' || (12 - COUNT(p.famille_id)) || ' superviseur(s) sans famille_id'
        ELSE '⚠️  PROBLÈME: Nombre total incorrect'
    END AS statut
FROM profils p
LEFT JOIN familles_disciples f ON p.famille_id = f.id AND f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1);

-- 3. Identifier les superviseurs sans famille_id et leurs familles potentielles
SELECT 
    '=== SUPERVISEURS SANS famille_id ET LEURS FAMILLES POTENTIELLES ===' AS info;

SELECT 
    p.id AS superviseur_id,
    p.first_name || ' ' || p.last_name AS superviseur_nom,
    p.email AS superviseur_email,
    f.id AS famille_id,
    f.nom AS famille_nom,
    f.identifiant_famille,
    f.superviseur_id AS famille_superviseur_id,
    CASE 
        WHEN f.id IS NULL THEN '❌ AUCUNE FAMILLE TROUVÉE'
        WHEN f.superviseur_id = p.id THEN '✅ FAMILLE TROUVÉE ET CORRECTEMENT LIÉE'
        WHEN f.superviseur_id IS NULL THEN '⚠️  FAMILLE SANS SUPERVISEUR'
        ELSE '⚠️  FAMILLE LIÉE À UN AUTRE SUPERVISEUR'
    END AS statut
FROM profils p
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
  AND p.famille_id IS NULL
ORDER BY p.first_name, p.last_name;

-- 4. Corriger les superviseurs sans famille_id
DO $$
DECLARE
    v_superviseur_record RECORD;
    v_famille_id uuid;
    v_corrected_count integer := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CORRECTION DES famille_id MANQUANTS';
    RAISE NOTICE '========================================';

    -- Pour chaque superviseur de DR MODE sans famille_id
    FOR v_superviseur_record IN
        SELECT 
            p.id,
            p.first_name,
            p.last_name,
            p.email
        FROM profils p
        WHERE p.role = 'superviseur'
          AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
          AND p.famille_id IS NULL
        ORDER BY p.first_name, p.last_name
    LOOP
        -- Chercher la famille de ce superviseur
        SELECT id INTO v_famille_id
        FROM familles_disciples
        WHERE superviseur_id = v_superviseur_record.id
        LIMIT 1;

        -- Si une famille est trouvée, assigner le famille_id
        IF v_famille_id IS NOT NULL THEN
            UPDATE profils
            SET famille_id = v_famille_id,
                updated_at = NOW()
            WHERE id = v_superviseur_record.id;

            v_corrected_count := v_corrected_count + 1;
            RAISE NOTICE '✅ famille_id assigné à % % (famille: %)', 
                v_superviseur_record.first_name, 
                v_superviseur_record.last_name,
                v_famille_id;
        ELSE
            RAISE NOTICE '⚠️  Aucune famille trouvée pour % %', 
                v_superviseur_record.first_name, 
                v_superviseur_record.last_name;
        END IF;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ % superviseur(s) corrigé(s)', v_corrected_count;
    RAISE NOTICE '========================================';
END $$;

-- 5. Vérification finale
SELECT 
    '=== VÉRIFICATION FINALE ===' AS info;

SELECT 
    COUNT(*) AS total_superviseurs,
    COUNT(p.famille_id) AS superviseurs_avec_famille_id,
    COUNT(*) - COUNT(p.famille_id) AS superviseurs_sans_famille_id,
    CASE 
        WHEN COUNT(*) = 12 AND COUNT(p.famille_id) = 12 THEN '✅ CORRECT (12 superviseurs avec famille_id)'
        WHEN COUNT(*) = 12 AND COUNT(p.famille_id) < 12 THEN '⚠️  MANQUANT: ' || (12 - COUNT(p.famille_id)) || ' superviseur(s) sans famille_id'
        ELSE '⚠️  PROBLÈME: Nombre total incorrect'
    END AS statut
FROM profils p
WHERE p.role = 'superviseur'
  AND p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1);
