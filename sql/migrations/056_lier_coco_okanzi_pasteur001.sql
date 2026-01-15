-- ============================================
-- Correction: Lier COCO OKANZI à PASTEUR-001 (DR MODE)
-- Objectif: S'assurer que COCO OKANZI est correctement lié
-- ============================================

-- COCO OKANZI doit être sous PASTEUR-001 (DR MODE)

DO $$
DECLARE
    v_coco_okanzi_id UUID;
    v_pasteur_001_id UUID;
    v_famille_coco_id UUID;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CORRECTION: LIER COCO OKANZI À PASTEUR-001';
    RAISE NOTICE '========================================';
    
    -- Étape 1: Trouver COCO OKANZI
    SELECT id INTO v_coco_okanzi_id
    FROM profils
    WHERE role = 'superviseur'
    AND (
        (LOWER(first_name) = 'coco' AND LOWER(last_name) = 'okanzi')
        OR LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = 'coco okanzi'
        OR email = 'coco.okanzi@example.com'
    )
    LIMIT 1;
    
    IF v_coco_okanzi_id IS NULL THEN
        RAISE EXCEPTION '❌ COCO OKANZI non trouvé dans profils';
    END IF;
    
    RAISE NOTICE '✅ COCO OKANZI trouvé (ID: %)', v_coco_okanzi_id;
    
    -- Étape 2: Trouver PASTEUR-001 (DR MODE)
    SELECT id INTO v_pasteur_001_id
    FROM profils
    WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur'
    LIMIT 1;
    
    IF v_pasteur_001_id IS NULL THEN
        RAISE EXCEPTION '❌ PASTEUR-001 (DR MODE) non trouvé. Exécutez d''abord la migration 049_complete_pasteurs_setup.sql';
    END IF;
    
    RAISE NOTICE '✅ PASTEUR-001 trouvé (ID: %)', v_pasteur_001_id;
    
    -- Étape 3: Lier COCO OKANZI à PASTEUR-001
    UPDATE profils
    SET pasteur_id = v_pasteur_001_id,
        updated_at = NOW()
    WHERE id = v_coco_okanzi_id;
    
    RAISE NOTICE '✅ COCO OKANZI lié à PASTEUR-001 (DR MODE)';
    
    -- Étape 4: Vérifier si COCO OKANZI a une famille et la lier à PASTEUR-001
    SELECT id INTO v_famille_coco_id
    FROM familles_disciples
    WHERE superviseur_id = v_coco_okanzi_id
    LIMIT 1;
    
    IF v_famille_coco_id IS NOT NULL THEN
        UPDATE familles_disciples
        SET pasteur_id = v_pasteur_001_id,
            updated_at = NOW()
        WHERE id = v_famille_coco_id;
        
        RAISE NOTICE '✅ Famille de COCO OKANZI liée à PASTEUR-001';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CORRECTION TERMINÉE AVEC SUCCÈS';
    RAISE NOTICE '========================================';
END $$;

-- Vérification finale
SELECT 
    '=== VÉRIFICATION FINALE ===' AS info;

SELECT 
    p.id AS superviseur_id,
    p.first_name || ' ' || p.last_name AS nom_complet,
    p.email,
    (SELECT identifiant_unique FROM profils WHERE id = p.pasteur_id) AS pasteur_identifiant,
    (SELECT first_name || ' ' || last_name FROM profils WHERE id = p.pasteur_id) AS pasteur_nom,
    CASE 
        WHEN p.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1)
            THEN '✅ CORRECTEMENT LIÉ À PASTEUR-001'
        WHEN p.pasteur_id IS NULL
            THEN '❌ NON LIÉ'
        ELSE '⚠️  LIÉ À UN AUTRE PASTEUR'
    END AS statut
FROM profils p
WHERE p.role = 'superviseur'
AND (
    (LOWER(p.first_name) = 'coco' AND LOWER(p.last_name) = 'okanzi')
    OR p.email = 'coco.okanzi@example.com'
);

-- Vérification globale des superviseurs
SELECT 
    '=== VÉRIFICATION GLOBALE ===' AS info;

SELECT 
    COUNT(*) AS total_superviseurs,
    COUNT(pasteur_id) AS superviseurs_lies,
    COUNT(*) - COUNT(pasteur_id) AS superviseurs_non_lies,
    CASE 
        WHEN COUNT(*) = COUNT(pasteur_id) THEN '✅ TOUS LES SUPERVISEURS SONT LIÉS'
        ELSE '❌ IL MANQUE ENCORE DES LIENS: ' || (COUNT(*) - COUNT(pasteur_id)) || ' superviseur(s) non lié(s)'
    END AS conclusion
FROM profils
WHERE role = 'superviseur';
