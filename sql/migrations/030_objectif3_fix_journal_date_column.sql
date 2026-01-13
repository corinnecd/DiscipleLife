-- Migration pour corriger la colonne date_entree dans journal_transformation
-- Le code utilise date_entree mais la table pourrait avoir été créée sans cette colonne

-- Étape 1: Ajouter la colonne date_entree si elle n'existe pas
DO $$ 
BEGIN
  -- Vérifier si la colonne date_entree existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'date_entree'
  ) THEN
    -- Ajouter la colonne date_entree
    ALTER TABLE journal_transformation 
    ADD COLUMN date_entree DATE DEFAULT CURRENT_DATE;
    
    -- Mettre à jour les lignes existantes pour utiliser created_at si disponible
    UPDATE journal_transformation 
    SET date_entree = created_at::DATE 
    WHERE created_at IS NOT NULL;
    
    RAISE NOTICE '✅ Colonne date_entree ajoutée à journal_transformation';
  ELSE
    RAISE NOTICE '✅ Colonne date_entree existe déjà';
  END IF;
END $$;

-- Vérification finale
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'date_entree'
  ) THEN
    RAISE NOTICE '✅ Colonne date_entree confirmée dans journal_transformation';
  ELSE
    RAISE WARNING '⚠️ Colonne date_entree toujours absente après migration';
  END IF;
END $$;
