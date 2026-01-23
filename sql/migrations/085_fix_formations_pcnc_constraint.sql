-- Migration: Corriger ou supprimer la contrainte CHECK sur formations_pcnc_realisees
-- Description: Supprime la contrainte CHECK trop stricte qui pourrait bloquer les mises à jour
-- Date: 2025-01-XX

-- ⚠️ IMPORTANT: Créer un backup avant d'exécuter ce script

-- 1. Vérifier si la contrainte existe
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'profils'::regclass
  AND conname = 'check_formations_pcnc';

-- 2. Supprimer la contrainte CHECK si elle existe
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'profils'::regclass 
        AND conname = 'check_formations_pcnc'
    ) THEN
        ALTER TABLE profils DROP CONSTRAINT check_formations_pcnc;
        RAISE NOTICE 'Contrainte check_formations_pcnc supprimée';
    ELSE
        RAISE NOTICE 'Contrainte check_formations_pcnc n''existe pas';
    END IF;
END $$;

-- 3. Optionnel: Recréer une contrainte CHECK plus flexible (décommentez si nécessaire)
/*
DO $$ 
BEGIN
    ALTER TABLE profils 
    ADD CONSTRAINT check_formations_pcnc 
    CHECK (
        formations_pcnc_realisees IS NULL OR
        formations_pcnc_realisees ~ '^([ ]*)(001|101|201|RTT|IEBI|PILLIERS)([ ]*)(,([ ]*)(001|101|201|RTT|IEBI|PILLIERS)([ ]*))*$'
    );
    RAISE NOTICE 'Contrainte check_formations_pcnc recréée';
END $$;
*/

-- 4. Vérification après migration
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profils'
  AND column_name = 'formations_pcnc_realisees';

-- 5. Test: Vérifier qu'on peut insérer des valeurs
-- Décommentez pour tester
/*
UPDATE profils 
SET formations_pcnc_realisees = '101, PILLIERS'
WHERE id = (SELECT id FROM profils LIMIT 1)
RETURNING id, formations_pcnc_realisees;
*/
