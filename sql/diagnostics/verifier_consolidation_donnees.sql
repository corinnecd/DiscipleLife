-- ============================================
-- Vérification de la consolidation des données
-- Objectif: Vérifier la cohérence entre cercle_personnes, familles_disciples et profils
-- ============================================

-- 1. Vérifier que tous les superviseurs ont une famille_id dans profils
SELECT 
    'Superviseurs sans famille_id' AS section,
    COUNT(*) AS nb_superviseurs_sans_famille
FROM profils
WHERE role = 'superviseur'
  AND famille_id IS NULL;

-- 2. Vérifier que tous les superviseurs ont une entrée dans familles_disciples
SELECT 
    'Superviseurs sans famille dans familles_disciples' AS section,
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

-- 3. Vérifier que tous les disciples ont une entrée dans cercle_personnes
SELECT 
    'Disciples sans entrée dans cercle_personnes' AS section,
    p.id AS disciple_id,
    p.first_name || ' ' || p.last_name AS disciple_nom,
    p.famille_id,
    f.nom AS famille_nom,
    s.first_name || ' ' || s.last_name AS superviseur_nom
FROM profils p
LEFT JOIN familles_disciples f ON f.id = p.famille_id
LEFT JOIN profils s ON s.id = f.superviseur_id
LEFT JOIN cercle_personnes cp ON cp.user_id = s.id 
    AND (
        (cp.first_name = p.first_name AND cp.last_name = p.last_name)
        OR cp.email = p.email
    )
WHERE p.role = 'disciple'
  AND p.famille_id IS NOT NULL
  AND cp.id IS NULL
LIMIT 50;

-- 4. Compter les disciples par superviseur (méthode 1: via cercle_personnes)
SELECT 
    'Comptage via cercle_personnes' AS section,
    s.id AS superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    COUNT(DISTINCT cp.id) AS nb_disciples_cercle
FROM profils s
LEFT JOIN cercle_personnes cp ON cp.user_id = s.id
WHERE s.role = 'superviseur'
GROUP BY s.id, s.first_name, s.last_name
ORDER BY nb_disciples_cercle DESC;

-- 5. Compter les disciples par superviseur (méthode 2: via profils.famille_id)
SELECT 
    'Comptage via profils.famille_id' AS section,
    s.id AS superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    COUNT(DISTINCT p.id) AS nb_disciples_profils
FROM profils s
LEFT JOIN familles_disciples f ON f.superviseur_id = s.id
LEFT JOIN profils p ON p.famille_id = f.id AND p.role = 'disciple'
WHERE s.role = 'superviseur'
GROUP BY s.id, s.first_name, s.last_name
ORDER BY nb_disciples_profils DESC;

-- 6. Comparaison des deux méthodes par superviseur
WITH stats_cercle AS (
    SELECT 
        s.id AS superviseur_id,
        s.first_name || ' ' || s.last_name AS superviseur_nom,
        COUNT(DISTINCT cp.id) AS nb_disciples_cercle
    FROM profils s
    LEFT JOIN cercle_personnes cp ON cp.user_id = s.id
    WHERE s.role = 'superviseur'
    GROUP BY s.id, s.first_name, s.last_name
),
stats_profils AS (
    SELECT 
        s.id AS superviseur_id,
        COUNT(DISTINCT p.id) AS nb_disciples_profils
    FROM profils s
    LEFT JOIN familles_disciples f ON f.superviseur_id = s.id
    LEFT JOIN profils p ON p.famille_id = f.id AND p.role = 'disciple'
    WHERE s.role = 'superviseur'
    GROUP BY s.id
)
SELECT 
    'Comparaison par superviseur' AS section,
    c.superviseur_nom,
    c.nb_disciples_cercle,
    COALESCE(p.nb_disciples_profils, 0) AS nb_disciples_profils,
    ABS(c.nb_disciples_cercle - COALESCE(p.nb_disciples_profils, 0)) AS difference,
    CASE 
        WHEN c.nb_disciples_cercle = COALESCE(p.nb_disciples_profils, 0) THEN '✅ OK'
        WHEN c.nb_disciples_cercle > COALESCE(p.nb_disciples_profils, 0) THEN '⚠️ Plus dans cercle'
        ELSE '⚠️ Plus dans profils'
    END AS statut
FROM stats_cercle c
LEFT JOIN stats_profils p ON p.superviseur_id = c.superviseur_id
ORDER BY difference DESC, c.superviseur_nom;

-- 7. Résumé global par pasteur
SELECT 
    'Résumé global par pasteur' AS section,
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

-- 8. Identifier les incohérences à corriger
SELECT 
    'Incohérences à corriger' AS section,
    'Disciples dans profils sans entrée cercle_personnes' AS type_incoherence,
    COUNT(*) AS nb_cas
FROM profils p
LEFT JOIN familles_disciples f ON f.id = p.famille_id
LEFT JOIN profils s ON s.id = f.superviseur_id
LEFT JOIN cercle_personnes cp ON cp.user_id = s.id 
    AND (
        (cp.first_name = p.first_name AND cp.last_name = p.last_name)
        OR cp.email = p.email
    )
WHERE p.role = 'disciple'
  AND p.famille_id IS NOT NULL
  AND cp.id IS NULL

UNION ALL

SELECT 
    'Incohérences à corriger' AS section,
    'Superviseurs sans famille_id' AS type_incoherence,
    COUNT(*) AS nb_cas
FROM profils
WHERE role = 'superviseur'
  AND famille_id IS NULL

UNION ALL

SELECT 
    'Incohérences à corriger' AS section,
    'Superviseurs sans famille dans familles_disciples' AS type_incoherence,
    COUNT(*) AS nb_cas
FROM profils p
LEFT JOIN familles_disciples f ON f.superviseur_id = p.id
WHERE p.role = 'superviseur'
  AND f.id IS NULL;
