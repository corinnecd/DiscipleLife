-- ============================================
-- Diagnostic: Où sont stockés les disciples ?
-- Objectif: Identifier où sont réellement les disciples dans la base de données
-- ============================================

-- 1. Compter les disciples dans profils avec famille_id
SELECT 
    '=== DISCIPLES DANS PROFILS AVEC FAMILLE_ID ===' AS info;

SELECT 
    COUNT(*) AS total_disciples_profils,
    COUNT(DISTINCT famille_id) AS nb_familles_avec_disciples
FROM profils
WHERE role = 'disciple'
  AND famille_id IS NOT NULL;

-- 2. Lister quelques exemples de disciples dans profils
SELECT 
    '=== EXEMPLES DE DISCIPLES DANS PROFILS ===' AS info;

SELECT 
    p.id,
    p.first_name || ' ' || p.last_name AS nom_complet,
    p.role,
    p.famille_id,
    f.nom AS famille_nom,
    s.first_name || ' ' || s.last_name AS superviseur_nom
FROM profils p
LEFT JOIN familles_disciples f ON f.id = p.famille_id
LEFT JOIN profils s ON s.id = f.superviseur_id
WHERE p.role = 'disciple'
  AND p.famille_id IS NOT NULL
LIMIT 10;

-- 3. Compter les disciples dans cercle_personnes
SELECT 
    '=== DISCIPLES DANS CERCLES_PERSONNES ===' AS info;

SELECT 
    COUNT(*) AS total_disciples_cercle,
    COUNT(DISTINCT user_id) AS nb_mentors_superviseurs
FROM cercle_personnes
WHERE user_id IS NOT NULL;

-- 4. Lister quelques exemples de disciples dans cercle_personnes
SELECT 
    '=== EXEMPLES DE DISCIPLES DANS CERCLES_PERSONNES ===' AS info;

SELECT 
    cp.id,
    cp.first_name || ' ' || cp.last_name AS nom_complet,
    cp.user_id AS mentor_user_id,
    p.first_name || ' ' || p.last_name AS mentor_nom,
    p.role AS mentor_role,
    cp.parent_disciple_id,
    cp.circle_type
FROM cercle_personnes cp
LEFT JOIN profils p ON p.id = cp.user_id
WHERE cp.user_id IS NOT NULL
LIMIT 10;

-- 5. Vérifier la famille "LES DÉTERMINÉS" (Alain SIL)
SELECT 
    '=== FAMILLE "LES DÉTERMINÉS" (ALAIN SIL) ===' AS info;

SELECT 
    f.id AS famille_id,
    f.nom AS famille_nom,
    s.id AS superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    COUNT(DISTINCT CASE WHEN p.role = 'disciple' THEN p.id END) AS nb_disciples_profils,
    COUNT(DISTINCT cp.id) AS nb_disciples_cercle
FROM familles_disciples f
LEFT JOIN profils s ON s.id = f.superviseur_id
LEFT JOIN profils p ON p.famille_id = f.id AND p.role = 'disciple'
LEFT JOIN cercle_personnes cp ON cp.user_id = s.id
WHERE f.nom = 'LES DÉTERMINÉS'
GROUP BY f.id, f.nom, s.id, s.first_name, s.last_name;

-- 6. Détail des membres de la famille "LES DÉTERMINÉS"
SELECT 
    '=== DÉTAIL MEMBRES FAMILLE "LES DÉTERMINÉS" ===' AS info;

-- Membres dans profils
SELECT 
    'profils' AS source,
    p.id,
    p.first_name || ' ' || p.last_name AS nom_complet,
    p.role,
    p.famille_id
FROM profils p
WHERE p.famille_id = (SELECT id FROM familles_disciples WHERE nom = 'LES DÉTERMINÉS' LIMIT 1)
UNION ALL
-- Disciples dans cercle_personnes liés au superviseur
SELECT 
    'cercle_personnes' AS source,
    cp.id,
    cp.first_name || ' ' || cp.last_name AS nom_complet,
    'disciple' AS role,
    NULL AS famille_id
FROM cercle_personnes cp
WHERE cp.user_id = (
    SELECT superviseur_id 
    FROM familles_disciples 
    WHERE nom = 'LES DÉTERMINÉS' 
    LIMIT 1
)
ORDER BY source, nom_complet;

-- 7. Compter tous les membres par pasteur (méthode alternative)
SELECT 
    '=== COMPTAGE ALTERNATIF PAR PASTEUR ===' AS info;

SELECT 
    pasteur.id AS pasteur_id,
    pasteur.first_name || ' ' || pasteur.last_name AS pasteur_nom,
    COUNT(DISTINCT f.id) AS nb_familles,
    COUNT(DISTINCT s.id) AS nb_superviseurs,
    COUNT(DISTINCT CASE WHEN p.role = 'disciple' THEN p.id END) AS nb_disciples_profils,
    COUNT(DISTINCT cp.id) AS nb_disciples_cercle,
    COUNT(DISTINCT CASE WHEN p.role = 'disciple' THEN p.id END) + 
    COUNT(DISTINCT cp.id) + 
    COUNT(DISTINCT s.id) AS total_membres_estime
FROM profils pasteur
LEFT JOIN profils s ON s.pasteur_id = pasteur.id AND s.role = 'superviseur'
LEFT JOIN familles_disciples f ON f.superviseur_id = s.id
LEFT JOIN profils p ON p.famille_id = f.id AND p.role = 'disciple'
LEFT JOIN cercle_personnes cp ON cp.user_id = s.id
WHERE pasteur.role = 'pasteur'
GROUP BY pasteur.id, pasteur.first_name, pasteur.last_name
ORDER BY pasteur.first_name, pasteur.last_name;
