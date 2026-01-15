-- ============================================
-- Identifier et corriger le superviseur non lié
-- Objectif: Trouver le superviseur qui n'est pas lié à un pasteur et le corriger
-- ============================================

-- Étape 1: Identifier le(s) superviseur(s) non lié(s)
SELECT 
    '=== SUPERVISEUR(S) NON LIÉ(S) ===' AS info;

SELECT 
    p.id AS superviseur_id,
    p.first_name || ' ' || p.last_name AS nom_complet,
    p.email,
    p.role,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id = p.id) AS nb_familles_associees,
    (SELECT identifiant_famille FROM familles_disciples WHERE superviseur_id = p.id LIMIT 1) AS premiere_famille
FROM profils p
WHERE p.role = 'superviseur'
AND p.pasteur_id IS NULL
ORDER BY p.first_name, p.last_name;

-- Étape 2: Vérifier les 26 superviseurs attendus et identifier lequel manque
SELECT 
    '=== VÉRIFICATION DES 26 SUPERVISEURS ATTENDUS ===' AS info;

-- PASTEUR-001 (DR MODE) - 12 superviseurs attendus
SELECT 
    'PASTEUR-001 (DR MODE)' AS pasteur,
    p.first_name || ' ' || p.last_name AS superviseur,
    p.email,
    CASE WHEN p.pasteur_id IS NOT NULL THEN '✅ LIÉ' ELSE '❌ NON LIÉ' END AS statut
FROM profils p
WHERE p.role = 'superviseur'
AND LOWER(TRIM(CONCAT(p.first_name, ' ', p.last_name))) IN (
    'betsaleel badila',
    'coco okandzi',
    'elisabeth amecy',
    'ephrem mba',
    'hélène lamago',
    'karine william',
    'kevin thea',
    'laetitia obame',
    'manicia thea',
    'nasdene kodia',
    'rochelle passi ben',
    'yvan dessande'
)
ORDER BY p.pasteur_id NULLS LAST, p.first_name, p.last_name;

-- PASTEUR-002 (PS JULIANA) - 5 superviseurs attendus
SELECT 
    'PASTEUR-002 (PS JULIANA)' AS pasteur,
    p.first_name || ' ' || p.last_name AS superviseur,
    p.email,
    CASE WHEN p.pasteur_id IS NOT NULL THEN '✅ LIÉ' ELSE '❌ NON LIÉ' END AS statut
FROM profils p
WHERE p.role = 'superviseur'
AND LOWER(TRIM(CONCAT(p.first_name, ' ', p.last_name))) IN (
    'beraca kazongo',
    'cynthia alloh',
    'jocelyne fortune',
    'patrick batsiaka',
    'snella moussio'
)
ORDER BY p.pasteur_id NULLS LAST, p.first_name, p.last_name;

-- PASTEUR-003 (PS PEGGY NN) - 4 superviseurs attendus
SELECT 
    'PASTEUR-003 (PS PEGGY NN)' AS pasteur,
    p.first_name || ' ' || p.last_name AS superviseur,
    p.email,
    CASE WHEN p.pasteur_id IS NOT NULL THEN '✅ LIÉ' ELSE '❌ NON LIÉ' END AS statut
FROM profils p
WHERE p.role = 'superviseur'
AND LOWER(TRIM(CONCAT(p.first_name, ' ', p.last_name))) IN (
    'alain sil',
    'carine matondo',
    'gervais nkatouloulou',
    'laetitia missatou'
)
ORDER BY p.pasteur_id NULLS LAST, p.first_name, p.last_name;

-- PASTEUR-004 (PS JESSY) - 5 superviseurs attendus
SELECT 
    'PASTEUR-004 (PS JESSY)' AS pasteur,
    p.first_name || ' ' || p.last_name AS superviseur,
    p.email,
    CASE WHEN p.pasteur_id IS NOT NULL THEN '✅ LIÉ' ELSE '❌ NON LIÉ' END AS statut
FROM profils p
WHERE p.role = 'superviseur'
AND LOWER(TRIM(CONCAT(p.first_name, ' ', p.last_name))) IN (
    'andréa ernest',
    'david serva',
    'nancy nzi',
    'prosper leba',
    'serge amany'
)
ORDER BY p.pasteur_id NULLS LAST, p.first_name, p.last_name;

-- Étape 3: Script de correction automatique
DO $$
DECLARE
    v_superviseur_record RECORD;
    v_pasteur_001_id UUID;
    v_pasteur_002_id UUID;
    v_pasteur_003_id UUID;
    v_pasteur_004_id UUID;
    v_corrige_count INTEGER := 0;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CORRECTION DES SUPERVISEURS NON LIÉS';
    RAISE NOTICE '========================================';
    
    -- Récupérer les IDs des pasteurs
    SELECT id INTO v_pasteur_001_id FROM profils WHERE identifiant_unique = 'PASTEUR-001' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_002_id FROM profils WHERE identifiant_unique = 'PASTEUR-002' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_003_id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1;
    SELECT id INTO v_pasteur_004_id FROM profils WHERE identifiant_unique = 'PASTEUR-004' AND role = 'pasteur' LIMIT 1;
    
    -- Pour chaque superviseur non lié, essayer de le lier selon son nom
    FOR v_superviseur_record IN
        SELECT id, first_name, last_name, email, LOWER(TRIM(CONCAT(first_name, ' ', last_name))) AS nom_complet_lower
        FROM profils
        WHERE role = 'superviseur'
        AND pasteur_id IS NULL
    LOOP
        RAISE NOTICE 'Superviseur non lié trouvé: % % (email: %)', 
            v_superviseur_record.first_name, 
            v_superviseur_record.last_name,
            v_superviseur_record.email;
        
        -- PASTEUR-001 (DR MODE) - 12 superviseurs
        IF v_superviseur_record.nom_complet_lower IN (
            'betsaleel badila', 'coco okandzi', 'elisabeth amecy', 'ephrem mba',
            'hélène lamago', 'karine william', 'kevin thea', 'laetitia obame',
            'manicia thea', 'nasdene kodia', 'rochelle passi ben', 'yvan dessande'
        ) THEN
            UPDATE profils
            SET pasteur_id = v_pasteur_001_id, updated_at = NOW()
            WHERE id = v_superviseur_record.id;
            RAISE NOTICE '  ✅ Lié à PASTEUR-001 (DR MODE)';
            v_corrige_count := v_corrige_count + 1;
        
        -- PASTEUR-002 (PS JULIANA) - 5 superviseurs
        ELSIF v_superviseur_record.nom_complet_lower IN (
            'beraca kazongo', 'cynthia alloh', 'jocelyne fortune', 
            'patrick batsiaka', 'snella moussio'
        ) THEN
            UPDATE profils
            SET pasteur_id = v_pasteur_002_id, updated_at = NOW()
            WHERE id = v_superviseur_record.id;
            RAISE NOTICE '  ✅ Lié à PASTEUR-002 (PS JULIANA)';
            v_corrige_count := v_corrige_count + 1;
        
        -- PASTEUR-003 (PS PEGGY NN) - 4 superviseurs
        ELSIF v_superviseur_record.nom_complet_lower IN (
            'alain sil', 'carine matondo', 'gervais nkatouloulou', 'laetitia missatou'
        ) THEN
            UPDATE profils
            SET pasteur_id = v_pasteur_003_id, updated_at = NOW()
            WHERE id = v_superviseur_record.id;
            RAISE NOTICE '  ✅ Lié à PASTEUR-003 (PS PEGGY NN)';
            v_corrige_count := v_corrige_count + 1;
        
        -- PASTEUR-004 (PS JESSY) - 5 superviseurs
        ELSIF v_superviseur_record.nom_complet_lower IN (
            'andréa ernest', 'david serva', 'nancy nzi', 'prosper leba', 'serge amany'
        ) THEN
            UPDATE profils
            SET pasteur_id = v_pasteur_004_id, updated_at = NOW()
            WHERE id = v_superviseur_record.id;
            RAISE NOTICE '  ✅ Lié à PASTEUR-004 (PS JESSY)';
            v_corrige_count := v_corrige_count + 1;
        
        ELSE
            RAISE NOTICE '  ⚠️  NE PEUT PAS ÊTRE LIÉ - Nom non reconnu dans la liste attendue';
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RÉSUMÉ: % superviseur(s) corrigé(s)', v_corrige_count;
    RAISE NOTICE '========================================';
END $$;

-- Étape 4: Vérification finale
SELECT 
    '=== VÉRIFICATION FINALE ===' AS info;

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

-- Afficher les superviseurs toujours non liés (s'il y en a)
SELECT 
    '=== SUPERVISEURS ENCORE NON LIÉS (si applicable) ===' AS info;

SELECT 
    p.id AS superviseur_id,
    p.first_name || ' ' || p.last_name AS nom_complet,
    p.email,
    (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id = p.id) AS nb_familles
FROM profils p
WHERE p.role = 'superviseur'
AND p.pasteur_id IS NULL
ORDER BY p.first_name, p.last_name;
