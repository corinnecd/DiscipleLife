-- ============================================
-- Test de la promotion automatique des disciples
-- Objectif: Vérifier que le trigger fonctionne correctement
-- ============================================

-- 1. Identifier les disciples qui ont des disciples mais qui ne sont pas encore mentors
SELECT 
    'Disciples à promouvoir' AS section,
    p.id AS disciple_id,
    p.first_name || ' ' || p.last_name AS disciple_nom,
    p.role AS role_actuel,
    COUNT(DISTINCT cp.id) AS nb_disciples_directs,
    COUNT(DISTINCT cp2.id) AS nb_disciples_indirects
FROM profils p
LEFT JOIN cercle_personnes cp ON cp.user_id = p.id
LEFT JOIN cercle_personnes cp_inter ON cp_inter.user_id = p.id
LEFT JOIN cercle_personnes cp2 ON cp2.parent_disciple_id = cp_inter.id
WHERE p.role = 'disciple'
  AND p.id NOT IN (SELECT id FROM profils WHERE role IN ('pasteur', 'superviseur'))
GROUP BY p.id, p.first_name, p.last_name, p.role
HAVING COUNT(DISTINCT cp.id) > 0 OR COUNT(DISTINCT cp2.id) > 0
ORDER BY nb_disciples_directs DESC, nb_disciples_indirects DESC;

-- 2. Vérifier que le trigger existe et est actif
SELECT 
    'État du trigger' AS section,
    tgname AS trigger_name,
    tgenabled AS enabled,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgname = 'trigger_promote_disciple_to_mentor';

-- 3. Vérifier la fonction du trigger
SELECT 
    'Fonction du trigger' AS section,
    proname AS function_name,
    pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'check_and_promote_disciple_to_mentor';

-- 4. Simuler une insertion pour tester le trigger (sans réellement insérer)
-- Note: Cette requête ne fait que montrer ce qui se passerait
SELECT 
    'Simulation promotion' AS section,
    p.id AS disciple_id,
    p.first_name || ' ' || p.last_name AS disciple_nom,
    p.role AS role_actuel,
    COUNT(DISTINCT cp.id) AS nb_disciples,
    CASE 
        WHEN COUNT(DISTINCT cp.id) > 0 AND p.role = 'disciple' THEN '✅ SERAIT PROMU'
        WHEN COUNT(DISTINCT cp.id) > 0 AND p.role = 'mentor' THEN '✅ DÉJÀ MENTOR'
        ELSE '❌ PAS DE PROMOTION'
    END AS action_trigger
FROM profils p
LEFT JOIN cercle_personnes cp ON cp.user_id = p.id
WHERE p.role = 'disciple'
  AND p.id NOT IN (SELECT id FROM profils WHERE role IN ('pasteur', 'superviseur'))
GROUP BY p.id, p.first_name, p.last_name, p.role
HAVING COUNT(DISTINCT cp.id) > 0
ORDER BY nb_disciples DESC;

-- 5. Vérifier les promotions récentes (si le trigger a fonctionné)
SELECT 
    'Promotions récentes' AS section,
    p.id,
    p.first_name || ' ' || p.last_name AS nom,
    p.role,
    p.updated_at AS derniere_mise_a_jour,
    COUNT(DISTINCT cp.id) AS nb_disciples
FROM profils p
LEFT JOIN cercle_personnes cp ON cp.user_id = p.id
WHERE p.role = 'mentor'
  AND p.updated_at > NOW() - INTERVAL '7 days'
GROUP BY p.id, p.first_name, p.last_name, p.role, p.updated_at
ORDER BY p.updated_at DESC;

-- 6. Test manuel: Créer un test de promotion (à exécuter avec précaution)
-- DÉCOMMENTEZ UNIQUEMENT POUR TESTER
/*
DO $$
DECLARE
    test_disciple_id UUID;
    test_mentor_id UUID;
BEGIN
    -- Trouver un disciple qui n'a pas encore de disciples
    SELECT id INTO test_disciple_id
    FROM profils
    WHERE role = 'disciple'
      AND id NOT IN (SELECT DISTINCT user_id FROM cercle_personnes WHERE user_id IS NOT NULL)
    LIMIT 1;
    
    IF test_disciple_id IS NULL THEN
        RAISE NOTICE 'Aucun disciple disponible pour le test';
        RETURN;
    END IF;
    
    -- Trouver un mentor existant pour créer une relation de test
    SELECT id INTO test_mentor_id
    FROM profils
    WHERE role IN ('mentor', 'superviseur')
    LIMIT 1;
    
    IF test_mentor_id IS NULL THEN
        RAISE NOTICE 'Aucun mentor disponible pour le test';
        RETURN;
    END IF;
    
    -- Créer une entrée dans cercle_personnes pour le disciple de test
    -- Cela devrait déclencher le trigger si le disciple a déjà des disciples
    RAISE NOTICE 'Test: Création d''une entrée cercle_personnes pour disciple %', test_disciple_id;
    
    -- Note: Ne pas réellement insérer, juste montrer ce qui se passerait
    RAISE NOTICE 'Si on insérait: INSERT INTO cercle_personnes (user_id, name, circle_type) VALUES (%, ''Test Disciple'', ''Disciple'')', test_disciple_id;
END $$;
*/
