-- Migration pour s'assurer que toutes les colonnes de journal_transformation existent
-- Cette migration est idempotente et peut être exécutée plusieurs fois

-- Vérifier et ajouter les colonnes manquantes si nécessaire

-- Colonne date_entree
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'date_entree'
  ) THEN
    ALTER TABLE journal_transformation 
    ADD COLUMN date_entree DATE DEFAULT CURRENT_DATE;
    
    UPDATE journal_transformation 
    SET date_entree = created_at::DATE 
    WHERE created_at IS NOT NULL;
    
    RAISE NOTICE '✅ Colonne date_entree ajoutée';
  END IF;
END $$;

-- Colonne actions_prises
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'actions_prises'
  ) THEN
    ALTER TABLE journal_transformation 
    ADD COLUMN actions_prises TEXT;
    
    RAISE NOTICE '✅ Colonne actions_prises ajoutée';
  END IF;
END $$;

-- Colonne revelations
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'revelations'
  ) THEN
    ALTER TABLE journal_transformation 
    ADD COLUMN revelations TEXT;
    
    RAISE NOTICE '✅ Colonne revelations ajoutée';
  END IF;
END $$;

-- Colonne gratitude
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'gratitude'
  ) THEN
    ALTER TABLE journal_transformation 
    ADD COLUMN gratitude TEXT;
    
    RAISE NOTICE '✅ Colonne gratitude ajoutée';
  END IF;
END $$;

-- Colonne prieres
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'prieres'
  ) THEN
    ALTER TABLE journal_transformation 
    ADD COLUMN prieres TEXT;
    
    RAISE NOTICE '✅ Colonne prieres ajoutée';
  END IF;
END $$;

-- Colonne emotions
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'emotions'
  ) THEN
    ALTER TABLE journal_transformation 
    ADD COLUMN emotions JSONB DEFAULT '[]'::jsonb;
    
    RAISE NOTICE '✅ Colonne emotions ajoutée';
  END IF;
END $$;

-- Colonne tags
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE journal_transformation 
    ADD COLUMN tags TEXT[] DEFAULT '{}';
    
    RAISE NOTICE '✅ Colonne tags ajoutée';
  END IF;
END $$;

-- Message final
DO $$
BEGIN
  RAISE NOTICE '✅ Migration terminée - Toutes les colonnes de journal_transformation sont présentes';
END $$;

