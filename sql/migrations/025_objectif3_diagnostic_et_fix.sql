-- ============================================
-- OBJECTIF 3: Diagnostic et correction des problèmes
-- ============================================

-- 1. Vérifier l'existence de la table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parcours_transformation') THEN
    RAISE EXCEPTION 'La table parcours_transformation n''existe pas. Exécutez d''abord la migration 016_objectif3_transformation_tables.sql';
  END IF;
  RAISE NOTICE '✅ Table parcours_transformation existe';
END $$;

-- 2. Vérifier les colonnes essentielles
DO $$
BEGIN
  -- Vérifier nom
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parcours_transformation' AND column_name = 'nom') THEN
    RAISE NOTICE '⚠️ Colonne nom manquante';
  ELSE
    RAISE NOTICE '✅ Colonne nom existe';
  END IF;
  
  -- Vérifier statut
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parcours_transformation' AND column_name = 'statut') THEN
    RAISE NOTICE '⚠️ Colonne statut manquante';
  ELSE
    RAISE NOTICE '✅ Colonne statut existe';
  END IF;
  
  -- Vérifier categorie
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'parcours_transformation' AND column_name = 'categorie') THEN
    RAISE NOTICE '⚠️ Colonne categorie manquante';
  ELSE
    RAISE NOTICE '✅ Colonne categorie existe';
  END IF;
END $$;

-- 3. Vérifier et corriger les RLS policies
DO $$
BEGIN
  -- Vérifier si RLS est activé
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'parcours_transformation' 
    AND rowsecurity = false
  ) THEN
    RAISE NOTICE '⚠️ RLS n''est pas activé sur parcours_transformation';
    ALTER TABLE parcours_transformation ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS activé';
  ELSE
    RAISE NOTICE '✅ RLS est déjà activé';
  END IF;
END $$;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "Les parcours sont visibles par tous les utilisateurs authentifiés" ON parcours_transformation;
DROP POLICY IF EXISTS "parcours_transformation_select_policy" ON parcours_transformation;
DROP POLICY IF EXISTS "parcours_transformation_public_read" ON parcours_transformation;

-- Créer une policy simple pour permettre la lecture à tous les utilisateurs authentifiés
CREATE POLICY "parcours_transformation_public_read" ON parcours_transformation
  FOR SELECT
  USING (true);

-- 4. Vérifier les données existantes
DO $$
DECLARE
  total_count INTEGER;
  actif_count INTEGER;
  avec_nom_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM parcours_transformation;
  SELECT COUNT(*) INTO actif_count FROM parcours_transformation WHERE statut = 'actif';
  SELECT COUNT(*) INTO avec_nom_count FROM parcours_transformation WHERE nom IS NOT NULL AND nom != '';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '📊 STATISTIQUES DES PARCOURS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total de parcours: %', total_count;
  RAISE NOTICE 'Parcours avec statut "actif": %', actif_count;
  RAISE NOTICE 'Parcours avec nom valide: %', avec_nom_count;
  RAISE NOTICE '========================================';
  
  IF total_count = 0 THEN
    RAISE NOTICE '⚠️ Aucun parcours trouvé dans la base de données';
    RAISE NOTICE '💡 Exécutez les migrations suivantes dans l''ordre:';
    RAISE NOTICE '   1. 020_objectif3_reorganisation_parcours.sql';
    RAISE NOTICE '   2. 023_objectif3_parcours_categories_manquantes.sql';
  END IF;
  
  IF actif_count = 0 AND total_count > 0 THEN
    RAISE NOTICE '⚠️ Aucun parcours avec statut "actif"';
    RAISE NOTICE '💡 Mise à jour de tous les parcours au statut "actif"...';
    UPDATE parcours_transformation SET statut = 'actif' WHERE statut IS NULL OR statut = '';
    RAISE NOTICE '✅ Parcours mis à jour';
  END IF;
END $$;

-- 5. Afficher un échantillon des parcours
DO $$
DECLARE
  parcour RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '📋 ÉCHANTILLON DES PARCOURS (5 premiers)';
  RAISE NOTICE '========================================';
  FOR parcour IN 
    SELECT id, nom, thematique, statut, categorie, ordre_affichage 
    FROM parcours_transformation 
    ORDER BY ordre_affichage 
    LIMIT 5
  LOOP
    RAISE NOTICE 'ID: % | Nom: % | Statut: % | Catégorie: %', 
      parcour.id, 
      COALESCE(parcour.nom, 'NULL'), 
      COALESCE(parcour.statut, 'NULL'),
      COALESCE(parcour.categorie, 'NULL');
  END LOOP;
  RAISE NOTICE '========================================';
END $$;

-- 6. Vérifier les modules
DO $$
DECLARE
  modules_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO modules_count FROM modules_parcours;
  RAISE NOTICE '📚 Nombre de modules: %', modules_count;
END $$;

-- 7. Vérifier les RLS sur modules_parcours
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'modules_parcours' 
    AND rowsecurity = false
  ) THEN
    ALTER TABLE modules_parcours ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS activé sur modules_parcours';
  END IF;
END $$;

-- Supprimer les anciennes policies sur modules_parcours
DROP POLICY IF EXISTS "modules_parcours_public_read" ON modules_parcours;
DROP POLICY IF EXISTS "Les modules sont visibles par tous les utilisateurs authentifiés" ON modules_parcours;

-- Créer une policy simple pour modules_parcours
CREATE POLICY "modules_parcours_public_read" ON modules_parcours
  FOR SELECT
  USING (true);

RAISE NOTICE '✅ Diagnostic terminé';



