-- ============================================
-- Migration: Promouvoir les disciples qui ont des disciples
-- Description: Identifie et promeut automatiquement tous les disciples
--              qui ont des disciples mais qui sont encore au statut "disciple"
-- Date: 2025-01-XX
-- ============================================

-- ⚠️ IMPORTANT: Créer un backup avant d'exécuter ce script

-- 1. Identifier les disciples à promouvoir
SELECT 
    'AVANT - Disciples à promouvoir' AS section,
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

-- 2. Promouvoir les disciples qui ont des disciples
DO $$
DECLARE
    disciple_record RECORD;
    promoted_count INTEGER := 0;
    total_disciples INTEGER := 0;
BEGIN
    RAISE NOTICE 'Début de la promotion des disciples en mentors...';
    
    -- Pour chaque disciple qui a des disciples
    FOR disciple_record IN
        SELECT 
            p.id,
            p.first_name || ' ' || p.last_name AS nom,
            COUNT(DISTINCT cp.id) AS nb_disciples
        FROM profils p
        LEFT JOIN cercle_personnes cp ON cp.user_id = p.id
        WHERE p.role = 'disciple'
          AND p.id NOT IN (SELECT id FROM profils WHERE role IN ('pasteur', 'superviseur'))
        GROUP BY p.id, p.first_name, p.last_name
        HAVING COUNT(DISTINCT cp.id) > 0
    LOOP
        -- Promouvoir le disciple en mentor
        UPDATE profils
        SET role = 'mentor',
            updated_at = NOW()
        WHERE id = disciple_record.id
          AND role = 'disciple';
        
        -- Vérifier si la mise à jour a réussi
        IF FOUND THEN
            promoted_count := promoted_count + 1;
            total_disciples := total_disciples + disciple_record.nb_disciples;
            RAISE NOTICE '✅ Disciple promu: % (ID: %) - % disciple(s)', 
                disciple_record.nom, 
                disciple_record.id,
                disciple_record.nb_disciples;
        ELSE
            RAISE NOTICE '⚠️ Échec promotion: % (ID: %) - Rôle déjà modifié ou non trouvé', 
                disciple_record.nom, 
                disciple_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Promotion terminée:';
    RAISE NOTICE '  - Disciples promus: %', promoted_count;
    RAISE NOTICE '  - Total disciples sous leur responsabilité: %', total_disciples;
    RAISE NOTICE '========================================';
END $$;

-- 3. Vérifier les promotions effectuées
SELECT 
    'APRÈS - Disciples promus' AS section,
    p.id AS mentor_id,
    p.first_name || ' ' || p.last_name AS mentor_nom,
    p.role AS nouveau_role,
    p.updated_at AS date_promotion,
    COUNT(DISTINCT cp.id) AS nb_disciples
FROM profils p
LEFT JOIN cercle_personnes cp ON cp.user_id = p.id
WHERE p.role = 'mentor'
  AND p.updated_at > NOW() - INTERVAL '1 hour'
GROUP BY p.id, p.first_name, p.last_name, p.role, p.updated_at
ORDER BY p.updated_at DESC;

-- 4. Vérifier qu'il ne reste plus de disciples avec des disciples
SELECT 
    'VÉRIFICATION - Disciples restants avec des disciples' AS section,
    COUNT(*) AS nb_disciples_a_promouvoir
FROM (
    SELECT 
        p.id,
        COUNT(DISTINCT cp.id) AS nb_disciples
    FROM profils p
    LEFT JOIN cercle_personnes cp ON cp.user_id = p.id
    WHERE p.role = 'disciple'
      AND p.id NOT IN (SELECT id FROM profils WHERE role IN ('pasteur', 'superviseur'))
    GROUP BY p.id
    HAVING COUNT(DISTINCT cp.id) > 0
) AS disciples_a_promouvoir;

-- 5. Statistiques finales
SELECT 
    'STATISTIQUES FINALES' AS section,
    COUNT(*) FILTER (WHERE role = 'disciple') AS total_disciples,
    COUNT(*) FILTER (WHERE role = 'mentor') AS total_mentors,
    COUNT(*) FILTER (WHERE role = 'superviseur') AS total_superviseurs,
    COUNT(*) FILTER (WHERE role = 'pasteur') AS total_pasteurs
FROM profils
WHERE role IN ('disciple', 'mentor', 'superviseur', 'pasteur');
