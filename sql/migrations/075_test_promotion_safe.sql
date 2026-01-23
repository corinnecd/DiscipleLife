-- Script de test SÉCURISÉ: Vérifier les disciples à promouvoir SANS modification
-- Description: Affiche uniquement les informations, ne modifie RIEN
-- Date: 2025-01-XX

-- Vue complète : Tous les disciples qui ont des disciples (via user_id OU parent_disciple_id)
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.role AS role_actuel,
    COUNT(DISTINCT cp_user.id) AS disciples_via_user_id,
    COUNT(DISTINCT cp_parent.id) AS disciples_via_parent_id,
    (COUNT(DISTINCT cp_user.id) + COUNT(DISTINCT cp_parent.id)) AS total_disciples,
    CASE 
        WHEN p.role = 'disciple' THEN 'À PROMOUVOIR'
        ELSE 'Déjà mentor'
    END AS statut
FROM profils p
LEFT JOIN cercle_personnes cp_user ON cp_user.user_id = p.id
LEFT JOIN cercle_personnes cp_inter ON cp_inter.user_id = p.id
LEFT JOIN cercle_personnes cp_parent ON cp_parent.parent_disciple_id = cp_inter.id
WHERE p.role IN ('disciple', 'mentor')
  AND p.role NOT IN ('pasteur', 'superviseur', 'admin', 'super_admin')
GROUP BY p.id, p.first_name, p.last_name, p.email, p.role
HAVING (COUNT(DISTINCT cp_user.id) + COUNT(DISTINCT cp_parent.id)) > 0
ORDER BY total_disciples DESC, p.role, p.last_name, p.first_name;

-- Résumé
SELECT 
    COUNT(*) FILTER (WHERE p.role = 'disciple') AS disciples_a_promouvoir,
    COUNT(*) FILTER (WHERE p.role = 'mentor') AS deja_mentors,
    COUNT(*) AS total_avec_disciples
FROM (
    SELECT DISTINCT
        p.id,
        p.role,
        COUNT(DISTINCT cp_user.id) + COUNT(DISTINCT cp_parent.id) AS total_disciples
    FROM profils p
    LEFT JOIN cercle_personnes cp_user ON cp_user.user_id = p.id
    LEFT JOIN cercle_personnes cp_inter ON cp_inter.user_id = p.id
    LEFT JOIN cercle_personnes cp_parent ON cp_parent.parent_disciple_id = cp_inter.id
    WHERE p.role IN ('disciple', 'mentor')
      AND p.role NOT IN ('pasteur', 'superviseur', 'admin', 'super_admin')
    GROUP BY p.id, p.role
    HAVING (COUNT(DISTINCT cp_user.id) + COUNT(DISTINCT cp_parent.id)) > 0
) AS p;
