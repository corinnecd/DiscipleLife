-- Migration SÉCURISÉE: Ajouter les nouveaux types d'attendance
-- Cette version nettoie d'abord les données avant d'ajouter la contrainte

-- Étape 1: Supprimer la contrainte CHECK existante (si elle existe)
ALTER TABLE attendance_tracking 
DROP CONSTRAINT IF EXISTS attendance_tracking_attendance_type_check;

-- Étape 2: Identifier et nettoyer les données invalides AVANT d'ajouter la nouvelle contrainte
-- Supprimer les lignes avec des valeurs d'attendance_type qui ne sont pas dans la liste autorisée
-- ATTENTION: Cette commande supprime des données. Vérifiez d'abord avec la migration de diagnostic.
DELETE FROM attendance_tracking 
WHERE attendance_type IS NOT NULL
AND attendance_type NOT IN (
    'sunday_worship',
    'sunday_sharing',
    'saturday_prayer',
    'saturday_evening_worship',
    'after_culte',
    'evangelization_outing'
);

-- Étape 3: Vérifier qu'il n'y a plus de valeurs invalides (optionnel, pour diagnostic)
-- Décommentez cette ligne pour vérifier qu'il n'y a plus de valeurs problématiques
-- SELECT DISTINCT attendance_type FROM attendance_tracking;

-- Étape 4: Ajouter la nouvelle contrainte CHECK avec tous les types autorisés
-- Maintenant que les données sont propres, on peut ajouter la contrainte sans erreur
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

-- ✅ Migration terminée: Les nouveaux types d'attendance sont maintenant acceptés
