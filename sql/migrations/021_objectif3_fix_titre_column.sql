-- ============================================
-- OBJECTIF 3: Correction de la colonne titre/nom
-- Vérifie et corrige les colonnes titre et nom
-- ============================================

-- Vérifier si la colonne titre existe et la renommer en nom si nécessaire
DO $$
BEGIN
  -- Si titre existe mais pas nom, renommer titre en nom
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'titre'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'nom'
  ) THEN
    ALTER TABLE parcours_transformation RENAME COLUMN titre TO nom;
    RAISE NOTICE '✅ Colonne titre renommée en nom';
  END IF;
  
  -- Si les deux colonnes existent, supprimer titre et garder nom
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'titre'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'nom'
  ) THEN
    -- Copier les valeurs de titre vers nom si nom est NULL
    UPDATE parcours_transformation SET nom = titre WHERE nom IS NULL OR nom = '';
    -- Supprimer la colonne titre
    ALTER TABLE parcours_transformation DROP COLUMN titre;
    RAISE NOTICE '✅ Colonne titre supprimée (valeurs copiées vers nom)';
  END IF;
  
  -- Si seule la colonne nom existe, tout est bon
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'nom'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'titre'
  ) THEN
    RAISE NOTICE '✅ Structure correcte : colonne nom existe';
  END IF;
END $$;

-- S'assurer que la colonne nom existe et est NOT NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'nom'
  ) THEN
    ALTER TABLE parcours_transformation
    ADD COLUMN nom TEXT NOT NULL DEFAULT 'Parcours sans nom';
    
    -- Mettre à jour les enregistrements existants
    UPDATE parcours_transformation SET nom = 'Parcours sans nom' WHERE nom IS NULL;
    
    RAISE NOTICE '✅ Colonne nom ajoutée';
  ELSE
    -- S'assurer que nom est NOT NULL
    ALTER TABLE parcours_transformation
    ALTER COLUMN nom SET NOT NULL;
    
    -- Mettre à jour les valeurs NULL
    UPDATE parcours_transformation SET nom = 'Parcours sans nom' WHERE nom IS NULL;
    
    RAISE NOTICE '✅ Colonne nom vérifiée et corrigée';
  END IF;
END $$;

-- Vérification finale
DO $$
DECLARE
  has_nom BOOLEAN;
  has_titre BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'nom'
  ) INTO has_nom;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'titre'
  ) INTO has_titre;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CORRECTION COLONNE TITRE/NOM';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Colonne nom existe: %', has_nom;
  RAISE NOTICE 'Colonne titre existe: %', has_titre;
  RAISE NOTICE '========================================';
END $$;



