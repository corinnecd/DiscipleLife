-- Migration de nettoyage: Supprimer ou corriger les valeurs d'attendance_type invalides
-- ⚠️ ATTENTION: Cette migration supprime les données avec des valeurs invalides
-- Exécutez d'abord 071_diagnostic_attendance_types.sql pour voir ce qui sera supprimé
-- Utilisez cette migration UNIQUEMENT si vous êtes sûr de vouloir supprimer ces données

-- OPTION 1: Supprimer les lignes avec des valeurs invalides (DÉCONMENTEZ POUR UTILISER)
/*
DELETE FROM attendance_tracking 
WHERE attendance_type NOT IN (
    'sunday_worship',
    'sunday_sharing',
    'saturday_prayer',
    'saturday_evening_worship',
    'after_culte',
    'evangelization_outing'
);
*/

-- OPTION 2: Mettre à jour les valeurs invalides vers une valeur par défaut (DÉCONMENTEZ POUR UTILISER)
-- Remplacez 'sunday_worship' par le type que vous souhaitez utiliser par défaut
/*
UPDATE attendance_tracking 
SET attendance_type = 'sunday_worship'  -- Valeur par défaut
WHERE attendance_type NOT IN (
    'sunday_worship',
    'sunday_sharing',
    'saturday_prayer',
    'saturday_evening_worship',
    'after_culte',
    'evangelization_outing'
);
*/

-- OPTION 3: Corriger des valeurs spécifiques (exemples)
-- Si vous avez des valeurs avec des typos ou des variantes, corrigez-les ici
-- Exemples possibles:
-- UPDATE attendance_tracking SET attendance_type = 'saturday_evening_worship' WHERE attendance_type = 'saturday_evening';
-- UPDATE attendance_tracking SET attendance_type = 'after_culte' WHERE attendance_type = 'after_culte_dimanche';

-- Après avoir nettoyé les données, exécutez 071_add_new_attendance_types_FIXED.sql
