-- ============================================
-- OBJECTIF 3: Fix - Colonnes manquantes sur modules_parcours
-- ============================================
-- But: corriger les bases où modules_parcours a été créée sans certaines colonnes
-- (contenu, duree_estimee, type_contenu, ordre, statut, description).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modules_parcours' AND column_name = 'description'
  ) THEN
    ALTER TABLE modules_parcours ADD COLUMN description TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modules_parcours' AND column_name = 'contenu'
  ) THEN
    ALTER TABLE modules_parcours ADD COLUMN contenu TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modules_parcours' AND column_name = 'type_contenu'
  ) THEN
    ALTER TABLE modules_parcours ADD COLUMN type_contenu TEXT DEFAULT 'texte';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modules_parcours' AND column_name = 'duree_estimee'
  ) THEN
    ALTER TABLE modules_parcours ADD COLUMN duree_estimee INTEGER DEFAULT 15;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modules_parcours' AND column_name = 'ordre'
  ) THEN
    ALTER TABLE modules_parcours ADD COLUMN ordre INTEGER DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'modules_parcours' AND column_name = 'statut'
  ) THEN
    ALTER TABLE modules_parcours ADD COLUMN statut TEXT DEFAULT 'actif';
  END IF;
END $$;




