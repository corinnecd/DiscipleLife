-- ============================================
-- Diagnostic: Vérifier la correspondance entre user_id dans cercle_personnes et les superviseurs
-- Objectif: Identifier pourquoi la requête ne trouve pas les disciples
-- ============================================

-- 1. Lister tous les user_id distincts dans cercle_personnes
SELECT 
    '=== USER_ID DISTINCTS DANS CERCLES_PERSONNES ===' AS info;

SELECT 
    DISTINCT user_id,
    COUNT(*) AS nb_entrees
FROM cercle_personnes
WHERE user_id IS NOT NULL
GROUP BY user_id
ORDER BY nb_entrees DESC
LIMIT 20;

-- 2. Lister les superviseurs de PS PEGGY NN avec leurs IDs
SELECT 
    '=== SUPERVISEURS DE PS PEGGY NN ===' AS info;

SELECT 
    s.id AS superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    s.email AS superviseur_email,
    f.id AS famille_id,
    f.nom AS famille_nom
FROM profils s
LEFT JOIN familles_disciples f ON f.superviseur_id = s.id
WHERE s.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
  AND s.role = 'superviseur'
ORDER BY s.first_name, s.last_name;

-- 3. Vérifier si les superviseurs de PS PEGGY NN ont des entrées dans cercle_personnes
SELECT 
    '=== SUPERVISEURS AVEC ENTREES DANS CERCLES_PERSONNES (PS PEGGY NN) ===' AS info;

SELECT 
    s.id AS superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    COUNT(cp.id) AS nb_entrees_cercle,
    COUNT(DISTINCT cp.id) AS nb_disciples_directs
FROM profils s
LEFT JOIN cercle_personnes cp ON cp.user_id = s.id
WHERE s.pasteur_id = (SELECT id FROM profils WHERE identifiant_unique = 'PASTEUR-003' AND role = 'pasteur' LIMIT 1)
  AND s.role = 'superviseur'
GROUP BY s.id, s.first_name, s.last_name
ORDER BY nb_disciples_directs DESC, s.first_name, s.last_name;

-- 4. Vérifier spécifiquement Alain SIL (superviseur de "LES DÉTERMINÉS")
SELECT 
    '=== ALAIN SIL ET SES DISCIPLES ===' AS info;

SELECT 
    s.id AS superviseur_id,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    f.nom AS famille_nom,
    COUNT(cp.id) AS nb_disciples_cercle
FROM profils s
LEFT JOIN familles_disciples f ON f.superviseur_id = s.id
LEFT JOIN cercle_personnes cp ON cp.user_id = s.id
WHERE s.first_name ILIKE '%alain%'
  AND s.last_name ILIKE '%sil%'
  AND s.role = 'superviseur'
GROUP BY s.id, s.first_name, s.last_name, f.nom;

-- 5. Lister les premiers disciples d'Alain SIL dans cercle_personnes
SELECT 
    '=== DISCIPLES D''ALAIN SIL DANS CERCLES_PERSONNES ===' AS info;

SELECT 
    cp.id,
    cp.first_name || ' ' || cp.last_name AS nom_complet,
    cp.user_id,
    cp.circle_type,
    cp.created_at
FROM cercle_personnes cp
WHERE cp.user_id = (
    SELECT id 
    FROM profils 
    WHERE first_name ILIKE '%alain%' 
      AND last_name ILIKE '%sil%' 
      AND role = 'superviseur' 
    LIMIT 1
)
ORDER BY cp.created_at DESC
LIMIT 10;

-- 6. Comparer les user_id dans cercle_personnes avec tous les superviseurs
SELECT 
    '=== COMPARAISON USER_ID CERCLES_PERSONNES VS SUPERVISEURS ===' AS info;

SELECT 
    cp.user_id,
    COUNT(cp.id) AS nb_disciples,
    CASE 
        WHEN s.id IS NOT NULL THEN '✅ Superviseur trouvé'
        ELSE '❌ Superviseur NON trouvé'
    END AS statut,
    s.first_name || ' ' || s.last_name AS superviseur_nom,
    s.role AS superviseur_role
FROM cercle_personnes cp
LEFT JOIN profils s ON s.id = cp.user_id AND s.role = 'superviseur'
WHERE cp.user_id IS NOT NULL
GROUP BY cp.user_id, s.id, s.first_name, s.last_name, s.role
ORDER BY nb_disciples DESC
LIMIT 20;
