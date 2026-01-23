-- Migration: Ajouter les colonnes de piliers_mentors à la table profils
-- Description: Ajoute 6 colonnes de statistiques et métadonnées à la table profils
-- Date: 2025-01-XX

-- ⚠️ IMPORTANT: Créer un backup avant d'exécuter ce script

-- 1. Vérifier l'état actuel des colonnes
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'profils'
  AND column_name IN (
    'eglise',
    'nombre_disciples',
    'avancement_pourcentage',
    'nombre_disciples_presents',
    'taux_participation_semaine',
    'observations'
  )
ORDER BY column_name;

-- 2. Ajouter la colonne eglise
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'eglise'
    ) THEN
        ALTER TABLE profils 
        ADD COLUMN eglise text NULL;
        
        COMMENT ON COLUMN profils.eglise IS 'Église du mentor';
        
        RAISE NOTICE 'Colonne eglise ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne eglise existe déjà';
    END IF;
END $$;

-- 3. Ajouter la colonne nombre_disciples
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'nombre_disciples'
    ) THEN
        ALTER TABLE profils 
        ADD COLUMN nombre_disciples integer NULL DEFAULT 0;
        
        COMMENT ON COLUMN profils.nombre_disciples IS 'Nombre total de disciples. Formation PCNC déjà réalisées : (, OO1, 101, 201, RTT, IEBI, PILLIERS)';
        
        RAISE NOTICE 'Colonne nombre_disciples ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne nombre_disciples existe déjà';
    END IF;
END $$;

-- 4. Ajouter la colonne avancement_pourcentage
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'avancement_pourcentage'
    ) THEN
        ALTER TABLE profils 
        ADD COLUMN avancement_pourcentage numeric(5, 2) NULL DEFAULT 0;
        
        COMMENT ON COLUMN profils.avancement_pourcentage IS 'Pourcentage d''avancement (0-100)';
        
        RAISE NOTICE 'Colonne avancement_pourcentage ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne avancement_pourcentage existe déjà';
    END IF;
END $$;

-- 5. Ajouter la colonne nombre_disciples_presents
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'nombre_disciples_presents'
    ) THEN
        ALTER TABLE profils 
        ADD COLUMN nombre_disciples_presents integer NULL DEFAULT 0;
        
        COMMENT ON COLUMN profils.nombre_disciples_presents IS 'Nombre de disciples présents';
        
        RAISE NOTICE 'Colonne nombre_disciples_presents ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne nombre_disciples_presents existe déjà';
    END IF;
END $$;

-- 6. Ajouter la colonne taux_participation_semaine
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'taux_participation_semaine'
    ) THEN
        ALTER TABLE profils 
        ADD COLUMN taux_participation_semaine numeric(5, 2) NULL DEFAULT 0;
        
        COMMENT ON COLUMN profils.taux_participation_semaine IS 'Taux de participation hebdomadaire (%)';
        
        RAISE NOTICE 'Colonne taux_participation_semaine ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne taux_participation_semaine existe déjà';
    END IF;
END $$;

-- 7. Ajouter la colonne observations
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'observations'
    ) THEN
        ALTER TABLE profils 
        ADD COLUMN observations text NULL;
        
        COMMENT ON COLUMN profils.observations IS 'Observations/notes';
        
        RAISE NOTICE 'Colonne observations ajoutée avec succès';
    ELSE
        RAISE NOTICE 'Colonne observations existe déjà';
    END IF;
END $$;

-- 8. Vérification après migration
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    col_description('profils'::regclass, ordinal_position) AS description
FROM information_schema.columns
WHERE table_name = 'profils'
  AND column_name IN (
    'eglise',
    'nombre_disciples',
    'avancement_pourcentage',
    'nombre_disciples_presents',
    'taux_participation_semaine',
    'observations'
  )
ORDER BY column_name;

-- 9. Statistiques
SELECT 
    COUNT(*) AS total_profils,
    COUNT(eglise) AS avec_eglise,
    COUNT(nombre_disciples) AS avec_nombre_disciples,
    COUNT(avancement_pourcentage) AS avec_avancement,
    COUNT(observations) AS avec_observations
FROM profils;
