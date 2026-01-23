-- Migration: Ajouter la colonne "Formations PCNC réalisées" à la table profils
-- Description: Ajoute une colonne pour stocker les formations PCNC réalisées par le mentor
-- Date: 2025-01-XX

-- ⚠️ IMPORTANT: Créer un backup avant d'exécuter ce script

-- 1. Vérifier l'état actuel
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profils'
  AND column_name = 'formations_pcnc_realisees'
ORDER BY column_name;

-- 2. Créer un type ENUM pour les formations PCNC (optionnel, pour une seule formation)
-- Si vous voulez stocker plusieurs formations, utilisez text avec CHECK constraint
CREATE TYPE formation_pcnc_type AS ENUM ('001', '101', '201', 'RTT', 'IEBI', 'PILLIERS');

-- 3. Ajouter la colonne formations_pcnc_realisees avec contrainte CHECK
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'formations_pcnc_realisees'
    ) THEN
        -- Utiliser un type text avec contrainte CHECK pour permettre plusieurs formations
        -- Format: "001, 101, 201" (liste séparée par des virgules)
        ALTER TABLE profils 
        ADD COLUMN formations_pcnc_realisees text NULL
        CONSTRAINT check_formations_pcnc 
        CHECK (
            formations_pcnc_realisees IS NULL OR
            formations_pcnc_realisees ~ '^([ ]*)(001|101|201|RTT|IEBI|PILLIERS)([ ]*)(,([ ]*)(001|101|201|RTT|IEBI|PILLIERS)([ ]*))*$'
        );
        
        COMMENT ON COLUMN profils.formations_pcnc_realisees IS 'Formations PCNC réalisées (liste séparée par des virgules: 001, 101, 201, RTT, IEBI, PILLIERS)';
        
        RAISE NOTICE 'Colonne formations_pcnc_realisees ajoutée avec succès (type: text avec contrainte CHECK)';
    ELSE
        RAISE NOTICE 'Colonne formations_pcnc_realisees existe déjà';
    END IF;
END $$;

-- 3. Alternative: Si vous préférez utiliser un array PostgreSQL
-- Décommentez cette section et commentez la section 2 si vous voulez utiliser un array
/*
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'formations_pcnc_realisees'
    ) THEN
        -- Option 2: Utiliser un array de text
        -- Exemple: ARRAY['OO1', '101', '201', 'RTT', 'IEBI', 'PILLIERS']
        ALTER TABLE profils 
        ADD COLUMN formations_pcnc_realisees text[] NULL;
        
        COMMENT ON COLUMN profils.formations_pcnc_realisees IS 'Formations PCNC réalisées (array: OO1, 101, 201, RTT, IEBI, PILLIERS)';
        
        RAISE NOTICE 'Colonne formations_pcnc_realisees ajoutée avec succès (type: text[])';
    ELSE
        RAISE NOTICE 'Colonne formations_pcnc_realisees existe déjà';
    END IF;
END $$;
*/

-- 4. Vérification après migration
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    col_description('profils'::regclass, ordinal_position) AS description
FROM information_schema.columns
WHERE table_name = 'profils'
  AND column_name = 'formations_pcnc_realisees';

-- 5. Statistiques
SELECT 
    COUNT(*) AS total_profils,
    COUNT(*) FILTER (WHERE formations_pcnc_realisees IS NOT NULL AND formations_pcnc_realisees != '') AS avec_formations
FROM profils;

-- 6. Exemples de valeurs possibles
-- Les formations PCNC disponibles sont :
-- - OO1 (Orientation 1)
-- - 101 (Formation 101)
-- - 201 (Formation 201)
-- - RTT (RTT)
-- - IEBI (IEBI)
-- - PILLIERS (Pilliers)

-- Exemple de format pour la colonne text :
-- 'OO1, 101, 201' (liste séparée par des virgules)
-- 'RTT, IEBI, PILLIERS'
-- 'OO1, 101, 201, RTT, IEBI, PILLIERS'

-- Si vous utilisez un array (text[]), le format serait :
-- ARRAY['OO1', '101', '201']
-- ARRAY['RTT', 'IEBI', 'PILLIERS']
