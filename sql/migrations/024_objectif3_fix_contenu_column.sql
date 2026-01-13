-- ============================================
-- OBJECTIF 3: Correction - Ajout de la colonne contenu si manquante
-- ============================================

-- Vérifier et ajouter la colonne contenu si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'modules_parcours' AND column_name = 'contenu'
  ) THEN
    ALTER TABLE modules_parcours ADD COLUMN contenu TEXT;
    RAISE NOTICE 'Colonne contenu ajoutée à modules_parcours';
  ELSE
    RAISE NOTICE 'Colonne contenu existe déjà dans modules_parcours';
  END IF;
END $$;



