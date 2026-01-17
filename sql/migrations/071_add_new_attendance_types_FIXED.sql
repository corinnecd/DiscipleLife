-- Migration: Ajouter les nouveaux types d'attendance (VERSION CORRIGÉE)
-- Ajoute saturday_evening_worship, after_culte et evangelization_outing aux types d'attendance acceptés

-- Étape 1: Supprimer explicitement toutes les contraintes CHECK existantes
-- Méthode 1: Suppression directe par nom connu
ALTER TABLE attendance_tracking 
DROP CONSTRAINT IF EXISTS attendance_tracking_attendance_type_check;

-- Méthode 2: Suppression dynamique de toutes les contraintes CHECK sur attendance_type
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Trouver toutes les contraintes CHECK qui concernent attendance_type
    FOR constraint_record IN
        SELECT 
            con.conname AS constraint_name
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'attendance_tracking'
        AND con.contype = 'c'  -- CHECK constraint
        AND con.conrelid = 'attendance_tracking'::regclass
    LOOP
        -- Vérifier si la contrainte concerne attendance_type
        IF EXISTS (
            SELECT 1 
            FROM pg_constraint c
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
            WHERE c.conname = constraint_record.constraint_name
            AND a.attname = 'attendance_type'
        ) THEN
            BEGIN
                EXECUTE format('ALTER TABLE attendance_tracking DROP CONSTRAINT IF EXISTS %I', constraint_record.constraint_name);
                RAISE NOTICE 'Contrainte supprimée: %', constraint_record.constraint_name;
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'Note: %', SQLERRM;
            END;
        END IF;
    END LOOP;
END $$;

-- Étape 2: Vérifier les valeurs existantes (décommenter pour diagnostic)
-- SELECT DISTINCT attendance_type, COUNT(*) as count 
-- FROM attendance_tracking 
-- GROUP BY attendance_type
-- ORDER BY attendance_type;

-- Étape 3: Nettoyer les données invalides si nécessaire (optionnel)
-- Si vous avez des valeurs d'attendance_type qui ne correspondent pas aux types autorisés,
-- vous pouvez les mettre à jour ou les supprimer ici. Par exemple:
-- DELETE FROM attendance_tracking 
-- WHERE attendance_type NOT IN ('sunday_worship', 'sunday_sharing', 'saturday_prayer', 'saturday_evening_worship', 'after_culte', 'evangelization_outing');

-- Étape 4: Ajouter la nouvelle contrainte CHECK avec tous les types autorisés
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
