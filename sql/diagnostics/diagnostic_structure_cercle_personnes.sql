-- ============================================
-- Diagnostic: Structure des données dans cercle_personnes
-- Objectif: Comprendre comment les disciples sont liés aux superviseurs
-- ============================================

-- 1. Vue d'ensemble de la table cercle_personnes
SELECT 
    'Vue d''ensemble cercle_personnes' AS section,
    COUNT(*) AS total_entrees,
    COUNT(DISTINCT user_id) AS nb_user_ids_uniques,
    COUNT(DISTINCT parent_disciple_id) AS nb_parent_disciple_ids_uniques,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL) AS avec_user_id,
    COUNT(*) FILTER (WHERE parent_disciple_id IS NOT NULL) AS avec_parent_disciple_id,
    COUNT(*) FILTER (WHERE user_id IS NOT NULL AND parent_disciple_id IS NOT NULL) AS avec_les_deux
FROM cercle_personnes;

-- 2. Analyser les relations user_id (superviseur -> disciple)
SELECT 
    'Relations user_id' AS section,
    cp.user_id AS superviseur_id,
    p.first_name || ' ' || p.last_name AS superviseur_nom,
    COUNT(*) AS nb_disciples
FROM cercle_personnes cp
LEFT JOIN profils p ON p.id = cp.user_id
WHERE cp.user_id IS NOT NULL
GROUP BY cp.user_id, p.first_name, p.last_name
ORDER BY nb_disciples DESC
LIMIT 20;

-- 3. Analyser les relations parent_disciple_id (disciple -> disciple)
SELECT 
    'Relations parent_disciple_id' AS section,
    cp.parent_disciple_id AS parent_id,
    p_parent.name AS parent_nom,
    COUNT(*) AS nb_enfants
FROM cercle_personnes cp
LEFT JOIN cercle_personnes p_parent ON p_parent.id = cp.parent_disciple_id
WHERE cp.parent_disciple_id IS NOT NULL
GROUP BY cp.parent_disciple_id, p_parent.name
ORDER BY nb_enfants DESC
LIMIT 20;

-- 4. Vérifier les superviseurs et leurs disciples
SELECT 
    'Superviseurs et leurs disciples' AS section,
    s.id AS superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    s.pasteur_id,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    COUNT(DISTINCT cp.id) AS nb_disciples_cercle_user_id,
    COUNT(DISTINCT cp2.id) AS nb_disciples_cercle_parent_id
FROM profils s
LEFT JOIN profils pasteur ON pasteur.id = s.pasteur_id
LEFT JOIN cercle_personnes cp ON cp.user_id = s.id
LEFT JOIN cercle_personnes cp2 ON cp2.parent_disciple_id IN (
    SELECT id FROM cercle_personnes WHERE user_id = s.id
)
WHERE s.role = 'superviseur'
GROUP BY s.id, s.first_name, s.last_name, s.pasteur_id, pasteur.first_name, pasteur.last_name
ORDER BY nb_disciples_cercle_user_id DESC, nb_disciples_cercle_parent_id DESC
LIMIT 20;

-- 5. Compter les disciples par pasteur (méthode 1: via user_id)
SELECT 
    'Comptage par pasteur (via user_id)' AS section,
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

-- 6. Compter les disciples par pasteur (méthode 2: via familles_disciples)
SELECT 
    'Comptage par pasteur (via familles)' AS section,
    pasteur.id AS pasteur_id,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    COUNT(DISTINCT f.id) AS nb_familles,
    COUNT(DISTINCT p.id) FILTER (WHERE p.role = 'disciple' AND p.famille_id IS NOT NULL) AS nb_disciples_profils
FROM profils pasteur
LEFT JOIN profils s ON s.pasteur_id = pasteur.id AND s.role = 'superviseur'
LEFT JOIN familles_disciples f ON f.superviseur_id = s.id
LEFT JOIN profils p ON p.famille_id = f.id
WHERE pasteur.role = 'pasteur'
GROUP BY pasteur.id, pasteur.first_name, pasteur.last_name
ORDER BY pasteur.first_name;

-- 7. Comparaison des deux méthodes
WITH stats_user_id AS (
    SELECT 
        pasteur.id AS pasteur_id,
        pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
        COUNT(DISTINCT s.id) AS nb_superviseurs,
        COUNT(DISTINCT cp.id) AS nb_disciples_cercle
    FROM profils pasteur
    LEFT JOIN profils s ON s.pasteur_id = pasteur.id AND s.role = 'superviseur'
    LEFT JOIN cercle_personnes cp ON cp.user_id = s.id
    WHERE pasteur.role = 'pasteur'
    GROUP BY pasteur.id, pasteur.first_name, pasteur.last_name
),
stats_familles AS (
    SELECT 
        pasteur.id AS pasteur_id,
        COUNT(DISTINCT f.id) AS nb_familles,
        COUNT(DISTINCT p.id) FILTER (WHERE p.role = 'disciple' AND p.famille_id IS NOT NULL) AS nb_disciples_profils
    FROM profils pasteur
    LEFT JOIN profils s ON s.pasteur_id = pasteur.id AND s.role = 'superviseur'
    LEFT JOIN familles_disciples f ON f.superviseur_id = s.id
    LEFT JOIN profils p ON p.famille_id = f.id
    WHERE pasteur.role = 'pasteur'
    GROUP BY pasteur.id
)
SELECT 
    'Comparaison méthodes' AS section,
    u.pasteur_nom,
    u.nb_superviseurs,
    u.nb_disciples_cercle AS method1_cercle_user_id,
    f.nb_familles,
    f.nb_disciples_profils AS method2_profils_famille,
    ABS(u.nb_disciples_cercle - COALESCE(f.nb_disciples_profils, 0)) AS difference
FROM stats_user_id u
LEFT JOIN stats_familles f ON f.pasteur_id = u.pasteur_id
ORDER BY u.pasteur_nom;

-- 8. Exemple détaillé pour un pasteur spécifique (DR MODE)
SELECT 
    'Exemple détaillé DR MODE' AS section,
    s.id AS superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    f.nom AS famille_nom,
    COUNT(DISTINCT cp.id) AS nb_disciples_cercle,
    COUNT(DISTINCT p.id) FILTER (WHERE p.role = 'disciple') AS nb_disciples_profils
FROM profils pasteur
JOIN profils s ON s.pasteur_id = pasteur.id AND s.role = 'superviseur'
LEFT JOIN familles_disciples f ON f.superviseur_id = s.id
LEFT JOIN cercle_personnes cp ON cp.user_id = s.id
LEFT JOIN profils p ON p.famille_id = f.id
WHERE pasteur.role = 'pasteur' 
  AND (pasteur.first_name ILIKE '%MODE%' OR pasteur.last_name ILIKE '%MODE%')
GROUP BY s.id, s.first_name, s.last_name, f.nom
ORDER BY s.first_name, f.nom;
