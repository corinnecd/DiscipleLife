-- Migration: Synchroniser les données de piliers_mentors vers profils
-- Description: Copie les données de piliers_mentors vers les nouvelles colonnes de profils
-- Date: 2025-01-XX

-- ⚠️ IMPORTANT: Créer un backup avant d'exécuter ce script

-- 1. Vérifier les données dans piliers_mentors
SELECT 
    COUNT(*) AS total_entrees,
    COUNT(DISTINCT mentor_id) AS mentors_uniques,
    COUNT(*) FILTER (WHERE eglise IS NOT NULL) AS avec_eglise,
    COUNT(*) FILTER (WHERE nombre_disciples > 0) AS avec_nombre_disciples,
    COUNT(*) FILTER (WHERE avancement_pourcentage > 0) AS avec_avancement,
    COUNT(*) FILTER (WHERE observations IS NOT NULL) AS avec_observations
FROM piliers_mentors;

-- 2. Afficher les données à synchroniser
SELECT 
    pm.mentor_id,
    p.first_name,
    p.last_name,
    pm.eglise,
    pm.nombre_disciples,
    pm.avancement_pourcentage,
    pm.nombre_disciples_presents,
    pm.taux_participation_semaine,
    pm.observations
FROM piliers_mentors pm
INNER JOIN profils p ON p.id = pm.mentor_id
ORDER BY pm.mentor_id;

-- 3. Synchroniser les données
DO $$ 
DECLARE
    updated_count INTEGER := 0;
    mentor_record RECORD;
BEGIN
    RAISE NOTICE 'Début de la synchronisation piliers_mentors → profils...';
    
    -- Pour chaque entrée dans piliers_mentors
    FOR mentor_record IN
        SELECT 
            pm.mentor_id,
            pm.eglise,
            pm.nombre_disciples,
            pm.avancement_pourcentage,
            pm.nombre_disciples_presents,
            pm.taux_participation_semaine,
            pm.observations
        FROM piliers_mentors pm
        WHERE pm.mentor_id IS NOT NULL
    LOOP
        -- Vérifier si le profil existe
        IF EXISTS (SELECT 1 FROM profils WHERE id = mentor_record.mentor_id) THEN
            -- Mettre à jour le profil avec les données de piliers_mentors
            UPDATE profils
            SET 
                eglise = COALESCE(mentor_record.eglise, profils.eglise),
                nombre_disciples = COALESCE(mentor_record.nombre_disciples, profils.nombre_disciples, 0),
                avancement_pourcentage = COALESCE(mentor_record.avancement_pourcentage, profils.avancement_pourcentage, 0),
                nombre_disciples_presents = COALESCE(mentor_record.nombre_disciples_presents, profils.nombre_disciples_presents, 0),
                taux_participation_semaine = COALESCE(mentor_record.taux_participation_semaine, profils.taux_participation_semaine, 0),
                observations = COALESCE(mentor_record.observations, profils.observations),
                updated_at = NOW()
            WHERE id = mentor_record.mentor_id;
            
            IF FOUND THEN
                updated_count := updated_count + 1;
                RAISE NOTICE 'Profil % mis à jour', mentor_record.mentor_id;
            END IF;
        ELSE
            RAISE NOTICE 'Profil % non trouvé, ignoré', mentor_record.mentor_id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Synchronisation terminée: % profil(s) mis à jour', updated_count;
END $$;

-- 4. Vérification après synchronisation
SELECT 
    COUNT(*) AS total_profils,
    COUNT(*) FILTER (WHERE eglise IS NOT NULL AND eglise != '') AS avec_eglise,
    COUNT(*) FILTER (WHERE nombre_disciples > 0) AS avec_nombre_disciples,
    COUNT(*) FILTER (WHERE avancement_pourcentage > 0) AS avec_avancement,
    COUNT(*) FILTER (WHERE nombre_disciples_presents > 0) AS avec_nombre_disciples_presents,
    COUNT(*) FILTER (WHERE taux_participation_semaine > 0) AS avec_taux_participation,
    COUNT(*) FILTER (WHERE observations IS NOT NULL AND observations != '') AS avec_observations
FROM profils;

-- 5. Comparaison piliers_mentors vs profils (pour vérifier la cohérence)
SELECT 
    pm.mentor_id,
    p.first_name,
    p.last_name,
    pm.eglise AS eglise_piliers,
    p.eglise AS eglise_profils,
    pm.nombre_disciples AS nombre_piliers,
    p.nombre_disciples AS nombre_profils,
    pm.avancement_pourcentage AS avancement_piliers,
    p.avancement_pourcentage AS avancement_profils,
    CASE 
        WHEN pm.eglise = p.eglise 
         AND pm.nombre_disciples = p.nombre_disciples 
         AND pm.avancement_pourcentage = p.avancement_pourcentage 
        THEN '✅ Synchronisé'
        ELSE '⚠️ Différences'
    END AS statut
FROM piliers_mentors pm
INNER JOIN profils p ON p.id = pm.mentor_id
ORDER BY pm.mentor_id;

-- 6. Statistiques détaillées
SELECT 
    'piliers_mentors' AS source,
    COUNT(*) AS total_entrees,
    COUNT(DISTINCT mentor_id) AS mentors_uniques,
    SUM(nombre_disciples) AS total_disciples,
    AVG(avancement_pourcentage) AS avancement_moyen
FROM piliers_mentors
UNION ALL
SELECT 
    'profils' AS source,
    COUNT(*) AS total_entrees,
    COUNT(DISTINCT id) AS mentors_uniques,
    SUM(nombre_disciples) AS total_disciples,
    AVG(avancement_pourcentage) AS avancement_moyen
FROM profils
WHERE nombre_disciples > 0 OR avancement_pourcentage > 0;
