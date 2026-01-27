-- ============================================
-- Vérification complète du trigger de promotion automatique
-- Objectif: Vérifier que le trigger fonctionne et tester son comportement
-- ============================================

-- 1. Vérifier que le trigger existe
SELECT 
    '1. État du trigger' AS section,
    tgname AS trigger_name,
    tgrelid::regclass AS table_name,
    tgenabled AS enabled,
    CASE 
        WHEN tgenabled = 'O' THEN '✅ Actif'
        WHEN tgenabled = 'D' THEN '⚠️ Désactivé'
        WHEN tgenabled = 'R' THEN '⚠️ Réplique uniquement'
        ELSE '❓ Inconnu'
    END AS statut,
    pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgname = 'trigger_promote_disciple_to_mentor';

-- 2. Vérifier que la fonction existe
SELECT 
    '2. Fonction du trigger' AS section,
    proname AS function_name,
    pg_get_function_arguments(oid) AS arguments,
    pg_get_function_result(oid) AS return_type,
    CASE 
        WHEN proname = 'check_and_promote_disciple_to_mentor' THEN '✅ Existe'
        ELSE '❌ Non trouvée'
    END AS statut
FROM pg_proc
WHERE proname = 'check_and_promote_disciple_to_mentor';

-- 3. Vérifier les permissions sur la fonction
SELECT 
    '3. Permissions de la fonction' AS section,
    p.proname AS function_name,
    r.rolname AS role_name,
    CASE 
        WHEN has_function_privilege(r.rolname, p.oid, 'EXECUTE') THEN '✅ Peut exécuter'
        ELSE '❌ Ne peut pas exécuter'
    END AS permission
FROM pg_proc p
CROSS JOIN pg_roles r
WHERE p.proname = 'check_and_promote_disciple_to_mentor'
  AND r.rolname IN ('authenticated', 'anon', 'service_role')
ORDER BY r.rolname;

-- 4. Identifier les disciples qui devraient être promus (test du trigger)
SELECT 
    '4. Disciples qui devraient être promus' AS section,
    p.id AS disciple_id,
    p.first_name || ' ' || p.last_name AS disciple_nom,
    p.role AS role_actuel,
    COUNT(DISTINCT cp.id) AS nb_disciples_directs,
    CASE 
        WHEN COUNT(DISTINCT cp.id) > 0 AND p.role = 'disciple' THEN '⚠️ DEVRAIT ÊTRE PROMU'
        WHEN COUNT(DISTINCT cp.id) > 0 AND p.role = 'mentor' THEN '✅ DÉJÀ MENTOR'
        ELSE '✅ OK (pas de disciples)'
    END AS statut
FROM profils p
LEFT JOIN cercle_personnes cp ON cp.user_id = p.id
WHERE p.role = 'disciple'
  AND p.id NOT IN (SELECT id FROM profils WHERE role IN ('pasteur', 'superviseur'))
GROUP BY p.id, p.first_name, p.last_name, p.role
HAVING COUNT(DISTINCT cp.id) > 0
ORDER BY nb_disciples_directs DESC;

-- 5. Vérifier les promotions récentes (si le trigger a fonctionné)
SELECT 
    '5. Promotions récentes (dernières 24h)' AS section,
    p.id,
    p.first_name || ' ' || p.last_name AS nom,
    p.role,
    p.updated_at AS date_promotion,
    COUNT(DISTINCT cp.id) AS nb_disciples,
    CASE 
        WHEN p.updated_at > NOW() - INTERVAL '1 hour' THEN '🆕 Très récent'
        WHEN p.updated_at > NOW() - INTERVAL '24 hours' THEN '🆕 Récent'
        ELSE '📅 Ancien'
    END AS anciennete
FROM profils p
LEFT JOIN cercle_personnes cp ON cp.user_id = p.id
WHERE p.role = 'mentor'
  AND p.updated_at > NOW() - INTERVAL '24 hours'
GROUP BY p.id, p.first_name, p.last_name, p.role, p.updated_at
ORDER BY p.updated_at DESC;

-- 6. Test de simulation: Vérifier ce qui se passerait si on insérait une nouvelle relation
-- (Sans réellement insérer)
SELECT 
    '6. Simulation - Disciples qui seraient promus' AS section,
    p.id AS disciple_id,
    p.first_name || ' ' || p.last_name AS disciple_nom,
    p.role AS role_actuel,
    COUNT(DISTINCT cp.id) AS nb_disciples_actuels,
    CASE 
        WHEN COUNT(DISTINCT cp.id) = 0 THEN '✅ Serait promu au prochain disciple'
        WHEN COUNT(DISTINCT cp.id) > 0 AND p.role = 'disciple' THEN '⚠️ Devrait déjà être promu'
        ELSE '✅ Déjà mentor'
    END AS action_trigger
FROM profils p
LEFT JOIN cercle_personnes cp ON cp.user_id = p.id
WHERE p.role = 'disciple'
  AND p.id NOT IN (SELECT id FROM profils WHERE role IN ('pasteur', 'superviseur'))
GROUP BY p.id, p.first_name, p.last_name, p.role
ORDER BY nb_disciples_actuels DESC;

-- 7. Vérifier la logique du trigger (compter comme le trigger le ferait)
SELECT 
    '7. Test de la logique du trigger' AS section,
    p.id AS user_id,
    p.first_name || ' ' || p.last_name AS nom,
    p.role AS role_actuel,
    (SELECT COUNT(*) FROM cercle_personnes WHERE user_id = p.id) AS count_via_user_id,
    CASE 
        WHEN (SELECT COUNT(*) FROM cercle_personnes WHERE user_id = p.id) > 0 
             AND p.role = 'disciple' 
        THEN '⚠️ SERAIT PROMU PAR LE TRIGGER'
        ELSE '✅ OK'
    END AS resultat_trigger
FROM profils p
WHERE p.role = 'disciple'
  AND p.id NOT IN (SELECT id FROM profils WHERE role IN ('pasteur', 'superviseur'))
  AND (SELECT COUNT(*) FROM cercle_personnes WHERE user_id = p.id) > 0
LIMIT 10;

-- 8. Résumé de l'état du système de promotion
SELECT 
    '8. Résumé du système de promotion' AS section,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_promote_disciple_to_mentor' AND tgenabled = 'O') 
        THEN '✅ Trigger actif'
        ELSE '❌ Trigger inactif ou inexistant'
    END AS trigger_statut,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_and_promote_disciple_to_mentor') 
        THEN '✅ Fonction existe'
        ELSE '❌ Fonction inexistante'
    END AS function_statut,
    (SELECT COUNT(*) FROM profils 
     WHERE role = 'disciple' 
       AND id NOT IN (SELECT id FROM profils WHERE role IN ('pasteur', 'superviseur'))
       AND (SELECT COUNT(*) FROM cercle_personnes WHERE user_id = profils.id) > 0) AS nb_disciples_a_promouvoir;
