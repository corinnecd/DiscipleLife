-- Migration: Renommer la colonne pilier_id en mentor_id
-- Description: Remplace pilier_id par mentor_id dans la table piliers_mentors
-- Date: 2025-01-XX

-- ⚠️ IMPORTANT: Créer un backup avant d'exécuter ce script

-- 1. Vérifier l'état actuel
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'piliers_mentors'
  AND column_name IN ('pilier_id', 'mentor_id')
ORDER BY column_name;

-- 2. Vérifier les contraintes existantes
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'piliers_mentors'::regclass
  AND (pg_get_constraintdef(oid) LIKE '%pilier_id%' OR pg_get_constraintdef(oid) LIKE '%mentor_id%');

-- 3. Vérifier les index existants
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'piliers_mentors'
  AND (indexdef LIKE '%pilier_id%' OR indexdef LIKE '%mentor_id%');

-- 4. Renommer la colonne
ALTER TABLE piliers_mentors 
RENAME COLUMN pilier_id TO mentor_id;

-- 5. Renommer la contrainte de clé étrangère
ALTER TABLE piliers_mentors
RENAME CONSTRAINT piliers_mentors_pilier_id_fkey TO piliers_mentors_mentor_id_fkey;

-- 6. Renommer l'index
DROP INDEX IF EXISTS idx_piliers_mentors_pilier_id;
CREATE INDEX IF NOT EXISTS idx_piliers_mentors_mentor_id 
ON piliers_mentors USING btree (mentor_id) TABLESPACE pg_default;

-- 7. Vérification après migration
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'piliers_mentors'
  AND column_name IN ('pilier_id', 'mentor_id')
ORDER BY column_name;

-- 8. Vérifier les contraintes après migration
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'piliers_mentors'::regclass
  AND (pg_get_constraintdef(oid) LIKE '%mentor_id%');

-- 9. Vérifier les index après migration
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'piliers_mentors'
  AND (indexdef LIKE '%mentor_id%');

-- 10. Statistiques
SELECT 
    COUNT(*) AS total_entrees,
    COUNT(DISTINCT mentor_id) AS mentors_uniques,
    COUNT(DISTINCT famille_id) AS familles_uniques
FROM piliers_mentors;
