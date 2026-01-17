-- Migration: Ajouter les nouveaux types d'attendance
-- Ajoute saturday_evening_worship, after_culte et evangelization_outing aux types d'attendance acceptés

-- Étape 1: Supprimer toutes les contraintes CHECK existantes sur attendance_type
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Trouver et supprimer toutes les contraintes CHECK sur attendance_type
    FOR constraint_name_var IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'attendance_tracking'::regclass
        AND contype = 'c'
        AND (
            conname LIKE '%attendance_type%'
            OR conname LIKE '%check%'
        )
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE attendance_tracking DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
            RAISE NOTICE 'Contrainte supprimée: %', constraint_name_var;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erreur lors de la suppression de la contrainte %: %', constraint_name_var, SQLERRM;
        END;
    END LOOP;
END $$;

-- Étape 2: Vérifier les valeurs existantes dans attendance_type (optionnel, pour diagnostic)
-- SELECT DISTINCT attendance_type FROM attendance_tracking;

-- Étape 3: Ajouter la nouvelle contrainte CHECK avec tous les types autorisés
-- Si la contrainte existe déjà, on la supprime d'abord pour éviter les erreurs
ALTER TABLE attendance_tracking 
DROP CONSTRAINT IF EXISTS attendance_tracking_attendance_type_check;

ALTER TABLE attendance_tracking 
ADD CONSTRAINT attendance_tracking_attendance_type_check 
CHECK (attendance_type IN (
    'sunday_worship',
    'sunday_sharing',
    'saturday_prayer',
    'saturday_evening_worship',
    'after_culte',
    'evangelization_outing'
));

-- Commentaire pour documenter les types d'attendance
COMMENT ON COLUMN attendance_tracking.attendance_type IS 
'Type d''attendance: sunday_worship (Culte Dimanche Matin), sunday_sharing (Temps de Partage), saturday_prayer (Temps de Prière), saturday_evening_worship (Culte du Samedi Soir), after_culte (After Culte du Dimanche), evangelization_outing (Sortie d''Évangélisation)';
