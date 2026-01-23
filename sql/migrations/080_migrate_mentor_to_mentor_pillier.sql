-- Migration: Modifier "mentor" en "Mentor_pillier"
-- Description: Remplace toutes les occurrences de role='mentor' par role='Mentor_pillier' dans la table profils
-- Date: 2025-01-XX

-- ⚠️ IMPORTANT: Créer un backup avant d'exécuter ce script

-- 1. Vérifier les occurrences actuelles
SELECT 
    COUNT(*) AS total_mentors,
    COUNT(*) FILTER (WHERE role = 'mentor') AS mentors_actuels,
    COUNT(*) FILTER (WHERE role = 'Mentor_pillier') AS mentors_pilliers_actuels
FROM profils
WHERE role IN ('mentor', 'Mentor_pillier');

-- 2. Afficher les profils concernés (avant migration)
SELECT 
    id,
    first_name,
    last_name,
    email,
    role,
    is_approved_as_disciple_maker,
    created_at
FROM profils
WHERE role = 'mentor'
ORDER BY created_at;

-- 3. Migration: Remplacer 'mentor' par 'Mentor_pillier'
DO $$ 
DECLARE
    updated_count INTEGER := 0;
BEGIN
    RAISE NOTICE 'Début de la migration mentor → Mentor_pillier...';
    
    UPDATE profils
    SET role = 'Mentor_pillier',
        updated_at = NOW()
    WHERE role = 'mentor';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Migration terminée: % profil(s) mis à jour', updated_count;
END $$;

-- 4. Vérification après migration
SELECT 
    COUNT(*) AS total_mentors_pilliers,
    COUNT(*) FILTER (WHERE role = 'Mentor_pillier') AS mentors_pilliers,
    COUNT(*) FILTER (WHERE role = 'mentor') AS mentors_restants
FROM profils
WHERE role IN ('mentor', 'Mentor_pillier');

-- 5. Afficher les profils mis à jour
SELECT 
    id,
    first_name,
    last_name,
    email,
    role,
    is_approved_as_disciple_maker,
    updated_at
FROM profils
WHERE role = 'Mentor_pillier'
ORDER BY updated_at DESC;

-- 6. Statistiques finales
SELECT 
    role,
    COUNT(*) AS nombre
FROM profils
WHERE role IN ('mentor', 'Mentor_pillier')
GROUP BY role
ORDER BY role;
