-- Script de vérification: Identifier les disciples qui ont des disciples
-- Description: Liste tous les disciples (hors pasteurs et superviseurs) qui ont des disciples
--              et qui seront promus au statut de mentor
-- Date: 2025-01-XX

-- Identifier les disciples qui ont des disciples
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.role AS role_actuel,
    COUNT(cp.id) AS nombre_disciples,
    STRING_AGG(cp.name, ', ' ORDER BY cp.name) AS noms_disciples
FROM profils p
INNER JOIN cercle_personnes cp ON cp.user_id = p.id
WHERE p.role = 'disciple'
  AND p.role NOT IN ('pasteur', 'superviseur', 'admin', 'super_admin')
GROUP BY p.id, p.first_name, p.last_name, p.email, p.role
HAVING COUNT(cp.id) > 0
ORDER BY nombre_disciples DESC, p.last_name, p.first_name;

-- Compteur total
SELECT 
    COUNT(DISTINCT p.id) AS total_disciples_a_promouvoir,
    SUM(COUNT(cp.id)) OVER () AS total_disciples_geres
FROM profils p
INNER JOIN cercle_personnes cp ON cp.user_id = p.id
WHERE p.role = 'disciple'
  AND p.role NOT IN ('pasteur', 'superviseur', 'admin', 'super_admin')
GROUP BY p.id
HAVING COUNT(cp.id) > 0;
