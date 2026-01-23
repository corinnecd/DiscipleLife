-- Migration: Promouvoir les disciples qui ont des disciples au statut de mentor
-- Description: Identifie tous les disciples (hors pasteurs et superviseurs) qui ont des disciples
--              et met à jour leur rôle de 'disciple' à 'mentor'
-- Date: 2025-01-XX

DO $$ 
DECLARE
    updated_count INTEGER := 0;
    disciple_record RECORD;
BEGIN
    -- Identifier et mettre à jour les disciples qui ont des disciples
    -- Exclure les pasteurs, superviseurs, admins et super_admins
    -- Un disciple a des disciples si :
    -- 1. Il y a des entrées dans cercle_personnes avec user_id = profils.id (disciples directs)
    -- 2. OU il y a des entrées cercle_personnes avec parent_disciple_id pointant vers une entrée cercle_personnes avec user_id = profils.id
    
    FOR disciple_record IN
        SELECT DISTINCT 
            p.id, 
            p.first_name, 
            p.last_name, 
            p.email,
            COALESCE(COUNT(DISTINCT cp_user.id), 0) + COALESCE(COUNT(DISTINCT cp_parent.id), 0) AS nombre_disciples
        FROM profils p
        LEFT JOIN cercle_personnes cp_user ON cp_user.user_id = p.id
        LEFT JOIN cercle_personnes cp_inter ON cp_inter.user_id = p.id
        LEFT JOIN cercle_personnes cp_parent ON cp_parent.parent_disciple_id = cp_inter.id
        WHERE p.role = 'disciple'
          AND p.role NOT IN ('pasteur', 'superviseur', 'admin', 'super_admin')
        GROUP BY p.id, p.first_name, p.last_name, p.email
        HAVING (COALESCE(COUNT(DISTINCT cp_user.id), 0) + COALESCE(COUNT(DISTINCT cp_parent.id), 0)) > 0
    LOOP
        -- Mettre à jour le rôle de 'disciple' à 'mentor'
        -- Vérifier à nouveau le rôle pour éviter les mises à jour inutiles
        UPDATE profils
        SET role = 'mentor',
            updated_at = COALESCE(updated_at, NOW())
        WHERE id = disciple_record.id
          AND role = 'disciple';
        
        -- Compter seulement si une ligne a été mise à jour
        IF FOUND THEN
            updated_count := updated_count + 1;
            
            RAISE NOTICE 'Disciple promu au statut de mentor: % % (ID: %, % disciple(s))', 
                disciple_record.first_name, 
                disciple_record.last_name, 
                disciple_record.id,
                disciple_record.nombre_disciples;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration terminée: % disciple(s) promu(s) au statut de mentor', updated_count;
END $$;

-- Vérification: Afficher les résultats
SELECT 
    p.id,
    p.first_name,
    p.last_name,
    p.email,
    p.role,
    COUNT(cp.id) AS nombre_disciples
FROM profils p
INNER JOIN cercle_personnes cp ON cp.user_id = p.id
WHERE p.role = 'mentor'
  AND p.role NOT IN ('pasteur', 'superviseur', 'admin', 'super_admin')
GROUP BY p.id, p.first_name, p.last_name, p.email, p.role
ORDER BY nombre_disciples DESC;
