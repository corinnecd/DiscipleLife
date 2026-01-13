-- ============================================
-- OBJECTIF 3: Correction des colonnes manquantes
-- Migration idempotente pour ajouter les colonnes manquantes
-- ============================================

-- Vérifier et ajouter la colonne ordre_affichage si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'ordre_affichage'
  ) THEN
    ALTER TABLE parcours_transformation
    ADD COLUMN ordre_affichage INTEGER DEFAULT 0;
    
    RAISE NOTICE '✅ Colonne ordre_affichage ajoutée à parcours_transformation';
  ELSE
    RAISE NOTICE '✅ Colonne ordre_affichage existe déjà';
  END IF;
END $$;

-- Vérifier et ajouter la colonne categorie si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'categorie'
  ) THEN
    ALTER TABLE parcours_transformation
    ADD COLUMN categorie TEXT CHECK (categorie IN (
      'identite_christ',
      'fondements_royaume',
      'restauration_ame',
      'deploiement',
      'finances',
      'vie_famille',
      'marcher_esprit',
      'discipolat'
    ));
    
    RAISE NOTICE '✅ Colonne categorie ajoutée à parcours_transformation';
  ELSE
    RAISE NOTICE '✅ Colonne categorie existe déjà';
  END IF;
END $$;

-- Vérifier et ajouter la colonne nom si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'nom'
  ) THEN
    ALTER TABLE parcours_transformation
    ADD COLUMN nom TEXT NOT NULL DEFAULT 'Parcours sans nom';
    
    -- Mettre à jour les enregistrements existants si nécessaire
    UPDATE parcours_transformation SET nom = 'Parcours sans nom' WHERE nom IS NULL;
    
    RAISE NOTICE '✅ Colonne nom ajoutée à parcours_transformation';
  ELSE
    RAISE NOTICE '✅ Colonne nom existe déjà';
  END IF;
END $$;

-- Vérifier et ajouter la colonne description si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'description'
  ) THEN
    ALTER TABLE parcours_transformation
    ADD COLUMN description TEXT;
    
    RAISE NOTICE '✅ Colonne description ajoutée à parcours_transformation';
  ELSE
    RAISE NOTICE '✅ Colonne description existe déjà';
  END IF;
END $$;

-- Vérifier et ajouter la colonne thematique si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'thematique'
  ) THEN
    ALTER TABLE parcours_transformation
    ADD COLUMN thematique TEXT NOT NULL DEFAULT 'Transformation';
    
    UPDATE parcours_transformation SET thematique = 'Transformation' WHERE thematique IS NULL;
    
    RAISE NOTICE '✅ Colonne thematique ajoutée à parcours_transformation';
  ELSE
    RAISE NOTICE '✅ Colonne thematique existe déjà';
  END IF;
END $$;

-- Vérifier et ajouter la colonne duree_jours si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'duree_jours'
  ) THEN
    ALTER TABLE parcours_transformation
    ADD COLUMN duree_jours INTEGER DEFAULT 30;
    
    RAISE NOTICE '✅ Colonne duree_jours ajoutée à parcours_transformation';
  ELSE
    RAISE NOTICE '✅ Colonne duree_jours existe déjà';
  END IF;
END $$;

-- Vérifier et ajouter la colonne niveau si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'niveau'
  ) THEN
    ALTER TABLE parcours_transformation
    ADD COLUMN niveau TEXT CHECK (niveau IN ('debutant', 'intermediaire', 'avance')) DEFAULT 'debutant';
    
    RAISE NOTICE '✅ Colonne niveau ajoutée à parcours_transformation';
  ELSE
    RAISE NOTICE '✅ Colonne niveau existe déjà';
  END IF;
END $$;

-- Vérifier et ajouter la colonne objectifs si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'objectifs'
  ) THEN
    ALTER TABLE parcours_transformation
    ADD COLUMN objectifs JSONB DEFAULT '[]'::jsonb;
    
    RAISE NOTICE '✅ Colonne objectifs ajoutée à parcours_transformation';
  ELSE
    RAISE NOTICE '✅ Colonne objectifs existe déjà';
  END IF;
END $$;

-- Vérifier et ajouter la colonne statut si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'parcours_transformation' AND column_name = 'statut'
  ) THEN
    ALTER TABLE parcours_transformation
    ADD COLUMN statut TEXT CHECK (statut IN ('actif', 'inactif', 'brouillon')) DEFAULT 'actif';
    
    RAISE NOTICE '✅ Colonne statut ajoutée à parcours_transformation';
  ELSE
    RAISE NOTICE '✅ Colonne statut existe déjà';
  END IF;
END $$;

-- Créer les index manquants
CREATE INDEX IF NOT EXISTS idx_parcours_ordre ON parcours_transformation(ordre_affichage);
CREATE INDEX IF NOT EXISTS idx_parcours_categorie ON parcours_transformation(categorie);

-- Vérification finale
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'parcours_transformation'
  AND column_name IN ('nom', 'description', 'thematique', 'duree_jours', 'niveau', 'objectifs', 'statut', 'ordre_affichage', 'categorie');
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ CORRECTION DES COLONNES TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Colonnes vérifiées: %', col_count;
  RAISE NOTICE '========================================';
END $$;



