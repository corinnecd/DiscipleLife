-- Migration complète pour créer ou compléter la table journal_transformation
-- Cette migration vérifie si la table existe et crée les colonnes manquantes

-- Étape 1: Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS journal_transformation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) ON DELETE CASCADE NOT NULL,
  date_entree DATE NOT NULL DEFAULT CURRENT_DATE,
  titre TEXT,
  contenu TEXT NOT NULL,
  thematique TEXT,
  parcours_id UUID REFERENCES parcours_transformation(id) ON DELETE SET NULL,
  module_id UUID REFERENCES modules_parcours(id) ON DELETE SET NULL,
  emotions JSONB DEFAULT '[]'::jsonb,
  revelations TEXT,
  actions_prises TEXT,
  gratitude TEXT,
  prieres TEXT,
  tags TEXT[],
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Étape 2: Ajouter les colonnes manquantes si la table existe déjà
DO $$ 
BEGIN
  -- Colonne date_entree
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'date_entree'
  ) THEN
    ALTER TABLE journal_transformation ADD COLUMN date_entree DATE DEFAULT CURRENT_DATE;
    UPDATE journal_transformation SET date_entree = created_at::DATE WHERE created_at IS NOT NULL;
  END IF;

  -- Colonne contenu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'contenu'
  ) THEN
    ALTER TABLE journal_transformation ADD COLUMN contenu TEXT NOT NULL DEFAULT '';
  END IF;

  -- Colonne titre
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'titre'
  ) THEN
    ALTER TABLE journal_transformation ADD COLUMN titre TEXT;
  END IF;

  -- Colonne thematique
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'thematique'
  ) THEN
    ALTER TABLE journal_transformation ADD COLUMN thematique TEXT;
  END IF;

  -- Colonne actions_prises
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'actions_prises'
  ) THEN
    ALTER TABLE journal_transformation ADD COLUMN actions_prises TEXT;
  END IF;

  -- Colonne revelations
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'revelations'
  ) THEN
    ALTER TABLE journal_transformation ADD COLUMN revelations TEXT;
  END IF;

  -- Colonne gratitude
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'gratitude'
  ) THEN
    ALTER TABLE journal_transformation ADD COLUMN gratitude TEXT;
  END IF;

  -- Colonne prieres
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'prieres'
  ) THEN
    ALTER TABLE journal_transformation ADD COLUMN prieres TEXT;
  END IF;

  -- Colonne emotions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'emotions'
  ) THEN
    ALTER TABLE journal_transformation ADD COLUMN emotions JSONB DEFAULT '[]'::jsonb;
  END IF;

  -- Colonne tags
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE journal_transformation ADD COLUMN tags TEXT[];
  END IF;

  -- Colonne is_private
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journal_transformation' 
    AND column_name = 'is_private'
  ) THEN
    ALTER TABLE journal_transformation ADD COLUMN is_private BOOLEAN DEFAULT true;
  END IF;

  RAISE NOTICE '✅ Toutes les colonnes de journal_transformation ont été vérifiées/ajoutées';
END $$;

-- Étape 3: Créer les index si nécessaire
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_transformation(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_transformation(date_entree);
CREATE INDEX IF NOT EXISTS idx_journal_thematique ON journal_transformation(thematique);
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_transformation(user_id, date_entree DESC);

-- Étape 4: Activer RLS si nécessaire
ALTER TABLE journal_transformation ENABLE ROW LEVEL SECURITY;

-- Étape 5: Créer les politiques RLS si elles n'existent pas
DO $$
BEGIN
  -- Politique de lecture
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'journal_transformation' 
    AND policyname = 'Users can view their own journal'
  ) THEN
    CREATE POLICY "Users can view their own journal" ON journal_transformation
      FOR SELECT USING (user_id = auth.uid());
  END IF;

  -- Politique d'insertion
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'journal_transformation' 
    AND policyname = 'Users can create their own journal'
  ) THEN
    CREATE POLICY "Users can create their own journal" ON journal_transformation
      FOR INSERT WITH CHECK (user_id = auth.uid());
  END IF;

  -- Politique de mise à jour
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'journal_transformation' 
    AND policyname = 'Users can update their own journal'
  ) THEN
    CREATE POLICY "Users can update their own journal" ON journal_transformation
      FOR UPDATE USING (user_id = auth.uid());
  END IF;

  -- Politique de suppression
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'journal_transformation' 
    AND policyname = 'Users can delete their own journal'
  ) THEN
    CREATE POLICY "Users can delete their own journal" ON journal_transformation
      FOR DELETE USING (user_id = auth.uid());
  END IF;
END $$;

-- Message final
DO $$
BEGIN
  RAISE NOTICE '✅ Migration complète terminée - Table journal_transformation prête';
END $$;


