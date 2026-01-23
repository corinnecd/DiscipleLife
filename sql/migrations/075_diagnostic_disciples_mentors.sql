-- Script de diagnostic: Analyser la structure des disciples et mentors
-- Description: Vérifie comment les disciples sont liés aux mentors dans cercle_personnes
-- Date: 2025-01-XX

-- 1. Vérifier la structure de la table cercle_personnes
SELECT 
    'Structure cercle_personnes' AS info,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'cercle_personnes'
ORDER BY ordinal_position;

-- 2. Compter les entrées dans cercle_personnes avec user_id
SELECT 
    'Disciples liés via user_id' AS type_lien,
    COUNT(*) AS total,
    COUNT(DISTINCT user_id) AS nombre_mentors_uniques
FROM cercle_personnes
WHERE user_id IS NOT NULL;

-- 3. Compter les entrées dans cercle_personnes avec parent_disciple_id
SELECT 
    'Disciples liés via parent_disciple_id' AS type_lien,
    COUNT(*) AS total,
    COUNT(DISTINCT parent_disciple_id) AS nombre_parents_uniques
FROM cercle_personnes
WHERE parent_disciple_id IS NOT NULL;

-- 4. Identifier les profils avec role='disciple' qui ont des disciples via user_id
SELECT 
    'Disciples dans profils avec disciples via user_id' AS categorie,
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    COUNT(cp.id) AS nombre_disciples_via_user_id
FROM profils p
INNER JOIN cercle_personnes cp ON cp.user_id = p.id
WHERE p.role = 'disciple'
  AND p.role NOT IN ('pasteur', 'superviseur', 'admin', 'super_admin')
GROUP BY p.id, p.first_name, p.last_name, p.email, p.role
HAVING COUNT(cp.id) > 0
ORDER BY nombre_disciples_via_user_id DESC;

-- 5. Identifier les profils avec role='disciple' qui ont des disciples via parent_disciple_id
-- (nécessite de trouver les entrées cercle_personnes qui pointent vers des entrées cercle_personnes avec user_id = profils.id)
SELECT 
    'Disciples dans profils avec disciples via parent_disciple_id' AS categorie,
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    COUNT(DISTINCT cp2.id) AS nombre_disciples_via_parent
FROM profils p
INNER JOIN cercle_personnes cp1 ON cp1.user_id = p.id
INNER JOIN cercle_personnes cp2 ON cp2.parent_disciple_id = cp1.id
WHERE p.role = 'disciple'
  AND p.role NOT IN ('pasteur', 'superviseur', 'admin', 'super_admin')
GROUP BY p.id, p.first_name, p.last_name, p.email, p.role
HAVING COUNT(DISTINCT cp2.id) > 0
ORDER BY nombre_disciples_via_parent DESC;

-- 6. Vue combinée : Tous les disciples qui ont des disciples (via user_id OU parent_disciple_id)
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.role AS role_actuel,
    COUNT(DISTINCT cp_user.id) AS disciples_via_user_id,
    COUNT(DISTINCT cp_parent.id) AS disciples_via_parent_id,
    (COUNT(DISTINCT cp_user.id) + COUNT(DISTINCT cp_parent.id)) AS total_disciples
FROM profils p
LEFT JOIN cercle_personnes cp_user ON cp_user.user_id = p.id
LEFT JOIN cercle_personnes cp_inter ON cp_inter.user_id = p.id
LEFT JOIN cercle_personnes cp_parent ON cp_parent.parent_disciple_id = cp_inter.id
WHERE p.role = 'disciple'
  AND p.role NOT IN ('pasteur', 'superviseur', 'admin', 'super_admin')
GROUP BY p.id, p.first_name, p.last_name, p.email, p.role
HAVING (COUNT(DISTINCT cp_user.id) + COUNT(DISTINCT cp_parent.id)) > 0
ORDER BY total_disciples DESC;
