-- ============================================
-- OBJECTIF 3: Ajout des catégories aux parcours
-- Migration idempotente - peut être exécutée même si la colonne existe déjà
-- ============================================

-- Ajouter la colonne categorie à parcours_transformation si elle n'existe pas
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
    
    -- Créer l'index si la colonne vient d'être ajoutée
    CREATE INDEX IF NOT EXISTS idx_parcours_categorie ON parcours_transformation(categorie);
    
    RAISE NOTICE '✅ Colonne categorie ajoutée à parcours_transformation';
  ELSE
    RAISE NOTICE '✅ Colonne categorie existe déjà';
  END IF;
END $$;

-- Mettre à jour les parcours existants avec leurs catégories
UPDATE parcours_transformation
SET categorie = CASE
  WHEN thematique LIKE '%guérit%' OR thematique LIKE '%cœur%' OR thematique LIKE '%brisé%' 
    THEN 'restauration_ame'
  WHEN thematique LIKE '%finances%' OR thematique LIKE '%prospère%' OR thematique LIKE '%restaure%'
    THEN 'finances'
  WHEN thematique LIKE '%forteresses%' OR thematique LIKE '%crucifier%' OR thematique LIKE '%chair%'
    THEN 'marcher_esprit'
  WHEN thematique LIKE '%suivre Jésus%' OR thematique LIKE '%disciple%' OR thematique LIKE '%Royaume%' OR thematique LIKE '%aimer Dieu%'
    THEN 'discipolat'
  ELSE 'fondements_royaume'
END
WHERE categorie IS NULL;

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_parcours_categorie ON parcours_transformation(categorie);

-- Commentaire
COMMENT ON COLUMN parcours_transformation.categorie IS 'Catégorie du parcours: identite_christ, fondements_royaume, restauration_ame, deploiement, finances, vie_famille, marcher_esprit, discipolat';

