-- ============================================
-- Correction: Lier la famille manquante à PASTEUR-003
-- Objectif: S'assurer que toutes les familles des superviseurs de PS PEGGY NN sont liées
-- ============================================

-- Les 4 superviseurs sous PS PEGGY NN (PASTEUR-003) sont :
-- 1. ALAIN SIL → FAM001 (LES DÉTERMINÉS)
-- 2. CARINE MATONDO → FAM005 (Les AMOUREUX)
-- 3. GERVAIS NKATOULOULOU → FAM011 (LES FIDÈLES)
-- 4. LAETITIA MISSATOU → FAM017 (LES VICTORIEUX)

-- Étape 1: Récupérer l'ID de PASTEUR-003
DO $$
DECLARE
    v_pasteur_003_id UUID;
    v_famille_001_id UUID;
    v_famille_005_id UUID;
    v_famille_011_id UUID;
    v_famille_017_id UUID;
    v_familles_liees INTEGER;
BEGIN
    -- Récupérer l'ID du pasteur
    SELECT id INTO v_pasteur_003_id
    FROM profils
    WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
    LIMIT 1;
    
    IF v_pasteur_003_id IS NULL THEN
        RAISE EXCEPTION 'PASTEUR-003 (PS PEGGY NN) non trouvé dans profils';
    END IF;
    
    RAISE NOTICE '✅ PASTEUR-003 trouvé: %', v_pasteur_003_id;
    
    -- Étape 2: Lier toutes les familles des superviseurs de PASTEUR-003
    UPDATE familles_disciples fd
    SET pasteur_id = v_pasteur_003_id,
        updated_at = NOW()
    WHERE fd.superviseur_id IN (
        SELECT p.id
        FROM profils p
        WHERE p.pasteur_id = v_pasteur_003_id
        AND p.role = 'superviseur'
    )
    AND (fd.pasteur_id IS NULL OR fd.pasteur_id != v_pasteur_003_id);
    
    GET DIAGNOSTICS v_familles_liees = ROW_COUNT;
    
    RAISE NOTICE '✅ % famille(s) liée(s) à PASTEUR-003', v_familles_liees;
    
    -- Étape 3: Vérifier chaque famille spécifique
    SELECT id INTO v_famille_001_id FROM familles_disciples WHERE identifiant_famille = 'FAM001';
    SELECT id INTO v_famille_005_id FROM familles_disciples WHERE identifiant_famille = 'FAM005';
    SELECT id INTO v_famille_011_id FROM familles_disciples WHERE identifiant_famille = 'FAM011';
    SELECT id INTO v_famille_017_id FROM familles_disciples WHERE identifiant_famille = 'FAM017';
    
    RAISE NOTICE '';
    RAISE NOTICE '=== VÉRIFICATION DES FAMILLES ===';
    RAISE NOTICE 'FAM001 (LES DÉTERMINÉS - Alain SIL): %', 
        CASE WHEN v_famille_001_id IS NOT NULL THEN '✅ Trouvée' ELSE '❌ Manquante' END;
    RAISE NOTICE 'FAM005 (Les AMOUREUX - CARINE MATONDO): %', 
        CASE WHEN v_famille_005_id IS NOT NULL THEN '✅ Trouvée' ELSE '❌ Manquante' END;
    RAISE NOTICE 'FAM011 (LES FIDÈLES - GERVAIS NKATOULOULOU): %', 
        CASE WHEN v_famille_011_id IS NOT NULL THEN '✅ Trouvée' ELSE '❌ Manquante' END;
    RAISE NOTICE 'FAM017 (LES VICTORIEUX - LAETITIA MISSATOU): %', 
        CASE WHEN v_famille_017_id IS NOT NULL THEN '✅ Trouvée' ELSE '❌ Manquante' END;
    
    -- Étape 4: Vérifier les liaisons pasteur_id
    IF v_famille_001_id IS NOT NULL THEN
        UPDATE familles_disciples 
        SET pasteur_id = v_pasteur_003_id, updated_at = NOW()
        WHERE id = v_famille_001_id AND (pasteur_id IS NULL OR pasteur_id != v_pasteur_003_id);
    END IF;
    
    IF v_famille_005_id IS NOT NULL THEN
        UPDATE familles_disciples 
        SET pasteur_id = v_pasteur_003_id, updated_at = NOW()
        WHERE id = v_famille_005_id AND (pasteur_id IS NULL OR pasteur_id != v_pasteur_003_id);
    END IF;
    
    IF v_famille_011_id IS NOT NULL THEN
        UPDATE familles_disciples 
        SET pasteur_id = v_pasteur_003_id, updated_at = NOW()
        WHERE id = v_famille_011_id AND (pasteur_id IS NULL OR pasteur_id != v_pasteur_003_id);
    END IF;
    
    IF v_famille_017_id IS NOT NULL THEN
        UPDATE familles_disciples 
        SET pasteur_id = v_pasteur_003_id, updated_at = NOW()
        WHERE id = v_famille_017_id AND (pasteur_id IS NULL OR pasteur_id != v_pasteur_003_id);
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Correction terminée';
END $$;

-- Étape 5: Afficher le résultat final
SELECT 
    '=== RÉSULTAT FINAL ===' AS info;

SELECT 
    f.identifiant_famille,
    f.nom AS nom_famille,
    s.first_name || ' ' || s.last_name AS superviseur,
    CASE 
        WHEN f.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1) 
        THEN '✅ LIÉE À PASTEUR-003'
        WHEN f.pasteur_id IS NULL 
        THEN '❌ NON LIÉE'
        ELSE '⚠️  LIÉE À UN AUTRE PASTEUR'
    END AS statut
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE f.superviseur_id IN (
    SELECT p.id
    FROM profils p
    WHERE p.pasteur_id = (
        SELECT id FROM profils 
        WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
        LIMIT 1
    )
    AND p.role = 'superviseur'
)
ORDER BY f.identifiant_famille;

-- Étape 6: Compter les familles liées à PASTEUR-003
SELECT 
    COUNT(*) AS nb_familles_liees,
    (SELECT COUNT(*) FROM profils WHERE pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1) AND role = 'superviseur') AS nb_superviseurs
FROM familles_disciples
WHERE pasteur_id = (
    SELECT id FROM profils 
    WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur'
    LIMIT 1
);
