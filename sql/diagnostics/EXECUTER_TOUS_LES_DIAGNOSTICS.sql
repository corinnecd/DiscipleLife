-- ============================================
-- SCRIPT COMBINÉ : Tous les diagnostics en un seul fichier
-- Objectif: Exécuter tous les diagnostics dans l'ordre
-- Instructions: Copier-coller ce fichier entier dans Supabase SQL Editor
-- ============================================

-- ============================================
-- PARTIE 1: Diagnostic de la Structure des Données
-- ============================================

-- 1. Vue d'ensemble de la table cercle_personnes
SELECT 
    'PARTIE 1 - Vue d''ensemble cercle_personnes' AS section,
    COUNT(*) AS total_entrees,
    COUNT(DISTINCT user_id) AS nb_user_ids_uniques,
    COUNT(DISTINCT parent_disciple_id) AS nb_parent_disciple_ids_uniques,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) AS avec_user_id,
    COUNT(*) FILTER (WHERE parent_disciple_id IS NOT NULL) AS avec_parent_disciple_id,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL AND parent_disciple_id IS NOT NULL) AS avec_les_deux
FROM cercle_personnes;

-- 2. Analyser les relations user_id (superviseur -> disciple)
SELECT 
    'PARTIE 1 - Relations user_id' AS section,
    cp.user_id AS superviseur_id,
    p.first_name || ' ' || p.last_name AS superviseur_nom,
    COUNT(*) AS nb_disciples
FROM cercle_personnes cp
LEFT JOIN profils p ON p.id = cp.user_id
WHERE cp.user_id IS NOT NULL
GROUP BY cp.user_id, p.first_name, p.last_name
ORDER BY nb_disciples DESC
LIMIT 20;

-- 3. Compter les disciples par pasteur (méthode 1: via user_id)
SELECT 
    'PARTIE 1 - Comptage par pasteur (via user_id)' AS section,
    pasteur.id AS pasteur_id,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    COUNT(DISTINCT s.id) AS nb_superviseurs,
    COUNT(DISTINCT cp.id) AS nb_disciples_cercle_user_id
FROM profils pasteur
LEFT JOIN profils s ON s.pasteur_id = pasteur.id AND s.role = 'superviseur'
LEFT JOIN cercle_personnes cp ON cp.user_id = s.id
WHERE pasteur.role = 'pasteur'
GROUP BY pasteur.id, pasteur.first_name, pasteur.last_name
ORDER BY pasteur.first_name;

-- ============================================
-- PARTIE 2: Vérification de la Consolidation des Données
-- ============================================

-- 1. Vérifier que tous les superviseurs ont une famille_id dans profils
SELECT 
    'PARTIE 2 - Superviseurs sans famille_id' AS section,
    COUNT(*) AS nb_superviseurs_sans_famille
FROM profils
WHERE role = 'superviseur'
  AND famille_id IS NULL;

-- 2. Vérifier que tous les superviseurs ont une entrée dans familles_disciples
SELECT 
    'PARTIE 2 - Superviseurs sans famille dans familles_disciples' AS section,
    p.id AS superviseur_id,
    p.first_name || ' ' || p.last_name AS superviseur_nom,
    p.pasteur_id,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom
FROM profils p
LEFT JOIN profils pasteur ON pasteur.id = p.pasteur_id
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND f.id IS NULL
ORDER BY pasteur.first_name, p.first_name;

-- 3. Compter les disciples par superviseur (méthode 1: via cercle_personnes)
SELECT 
    'PARTIE 2 - Comptage via cercle_personnes' AS section,
    s.id AS superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    COUNT(DISTINCT cp.id) AS nb_disciples_cercle
FROM profils s
LEFT JOIN cercle_personnes cp ON cp.user_id = s.id
WHERE s.role = 'superviseur'
GROUP BY s.id, s.first_name, s.last_name
ORDER BY nb_disciples_cercle DESC;

-- 4. Compter les disciples par superviseur (méthode 2: via profils.famille_id)
SELECT 
    'PARTIE 2 - Comptage via profils.famille_id' AS section,
    s.id AS superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    COUNT(DISTINCT p.id) AS nb_disciples_profils
FROM profils s
LEFT JOIN familles_disciples f ON f.superviseur_id = s.id
LEFT JOIN profils p ON p.famille_id = f.id AND p.role = 'disciple'
WHERE s.role = 'superviseur'
GROUP BY s.id, s.first_name, s.last_name
ORDER BY nb_disciples_profils DESC;

-- 5. Résumé global par pasteur
SELECT 
    'PARTIE 2 - Résumé global par pasteur' AS section,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    COUNT(DISTINCT s.id) AS nb_superviseurs,
    COUNT(DISTINCT f.id) AS nb_familles,
    COUNT(DISTINCT cp.id) AS nb_disciples_cercle,
    COUNT(DISTINCT p.id) FILTER (WHERE p.role = 'disciple') AS nb_disciples_profils
FROM profils pasteur
LEFT JOIN profils s ON s.pasteur_id = pasteur.id AND s.role = 'superviseur'
LEFT JOIN familles_disciples f ON f.superviseur_id = s.id
LEFT JOIN cercle_personnes cp ON cp.user_id = s.id
LEFT JOIN profils p ON p.famille_id = f.id
WHERE pasteur.role = 'pasteur'
GROUP BY pasteur.id, pasteur.first_name, pasteur.last_name
ORDER BY pasteur.first_name;

-- ============================================
-- PARTIE 3: Test de la Promotion Automatique
-- ============================================

-- 1. Identifier les disciples qui ont des disciples mais qui ne sont pas encore mentors
SELECT 
    'PARTIE 3 - Disciples à promouvoir' AS section,
    p.id AS disciple_id,
    p.first_name || ' ' || p.last_name AS disciple_nom,
    p.role AS role_actuel,
    COUNT(DISTINCT cp.id) AS nb_disciples_directs
FROM profils p
LEFT JOIN cercle_personnes cp ON cp.user_id = p.id
WHERE p.role = 'disciple'
  AND p.id NOT IN (SELECT id FROM profils WHERE role IN ('pasteur', 'superviseur'))
GROUP BY p.id, p.first_name, p.last_name, p.role
HAVING COUNT(DISTINCT cp.id) > 0
ORDER BY nb_disciples_directs DESC;

-- 2. Vérifier que le trigger existe et est actif
SELECT 
    'PARTIE 3 - État du trigger' AS section,
    tgname AS trigger_name,
    tgenabled AS enabled,
    CASE 
        WHEN tgenabled = 'O' THEN '✅ Actif'
        WHEN tgenabled = 'D' THEN '⚠️ Désactivé'
        ELSE '❓ Inconnu'
    END AS statut
FROM pg_trigger
WHERE tgname = 'trigger_promote_disciple_to_mentor';

-- 3. Vérifier la fonction du trigger
SELECT 
    'PARTIE 3 - Fonction du trigger' AS section,
    proname AS function_name,
    CASE 
        WHEN proname = 'check_and_promote_disciple_to_mentor' THEN '✅ Existe'
        ELSE '❌ Non trouvée'
    END AS statut
FROM pg_proc
WHERE proname = 'check_and_promote_disciple_to_mentor';

-- ============================================
-- RÉSUMÉ FINAL
-- ============================================

SELECT 
    'RÉSUMÉ FINAL' AS section,
    'Diagnostics terminés' AS message,
    NOW() AS date_execution;
