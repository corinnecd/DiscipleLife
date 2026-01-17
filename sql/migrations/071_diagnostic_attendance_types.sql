-- Migration de diagnostic: Identifier les valeurs d'attendance_type existantes
-- Exécutez cette migration AVANT la migration 071_add_new_attendance_types_FIXED.sql
-- pour identifier les valeurs problématiques dans la table attendance_tracking

-- Étape 1: Lister toutes les valeurs distinctes d'attendance_type avec leur nombre d'occurrences
SELECT 
    attendance_type,
    COUNT(*) as nombre_occurrences,
    CASE 
        WHEN attendance_type IN (
            'sunday_worship',
            'sunday_sharing',
            'saturday_prayer',
            'saturday_evening_worship',
            'after_culte',
            'evangelization_outing'
        ) THEN '✓ VALIDE'
        ELSE '✗ INVALIDE - Nécessite correction'
    END as statut
FROM attendance_tracking
GROUP BY attendance_type
ORDER BY 
    CASE 
        WHEN attendance_type IN (
            'sunday_worship',
            'sunday_sharing',
            'saturday_prayer',
            'saturday_evening_worship',
            'after_culte',
            'evangelization_outing'
        ) THEN 1
        ELSE 0
    END,
    attendance_type;

-- Étape 2: Afficher les valeurs invalides (si elles existent)
-- Décommentez la requête ci-dessous si vous voulez voir uniquement les valeurs invalides
/*
SELECT 
    id,
    disciple_id,
    attendance_type,
    attendance_date,
    status,
    created_at
FROM attendance_tracking
WHERE attendance_type NOT IN (
    'sunday_worship',
    'sunday_sharing',
    'saturday_prayer',
    'saturday_evening_worship',
    'after_culte',
    'evangelization_outing'
)
ORDER BY created_at DESC;
*/

-- Étape 3: Afficher un résumé du nombre total de lignes
SELECT 
    COUNT(*) as total_lignes,
    COUNT(DISTINCT attendance_type) as nombre_types_distincts,
    SUM(CASE 
        WHEN attendance_type IN (
            'sunday_worship',
            'sunday_sharing',
            'saturday_prayer',
            'saturday_evening_worship',
            'after_culte',
            'evangelization_outing'
        ) THEN 1
        ELSE 0
    END) as lignes_valides,
    SUM(CASE 
        WHEN attendance_type NOT IN (
            'sunday_worship',
            'sunday_sharing',
            'saturday_prayer',
            'saturday_evening_worship',
            'after_culte',
            'evangelization_outing'
        ) THEN 1
        ELSE 0
    END) as lignes_invalides
FROM attendance_tracking;

-- Types d'attendance autorisés:
-- - sunday_worship (Culte Dimanche Matin)
-- - sunday_sharing (Temps de Partage)
-- - saturday_prayer (Temps de Prière)
-- - saturday_evening_worship (Culte du Samedi Soir) - NOUVEAU
-- - after_culte (After Culte du Dimanche) - NOUVEAU
-- - evangelization_outing (Sortie d'Évangélisation) - NOUVEAU
