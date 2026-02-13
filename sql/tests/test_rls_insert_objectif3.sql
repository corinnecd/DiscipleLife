-- ============================================
-- Tests RLS INSERT pour Objectif 3
-- Vérifie que les politiques WITH CHECK empêchent les insertions non autorisées
-- Exécuter dans le SQL Editor Supabase en tant qu'utilisateur authentifié
-- ============================================

-- ----------------------------------------
-- PRÉPARATION : Créer des utilisateurs de test (si nécessaire)
-- ----------------------------------------
-- Note : Ces utilisateurs doivent exister dans auth.users et profils
-- Pour les tests, vous pouvez utiliser des comptes existants ou en créer via l'interface

-- ----------------------------------------
-- TEST 1 : journal_transformation
-- ----------------------------------------
-- Objectif : Vérifier que user_id = auth.uid() est imposé

-- Test 1a : Insertion valide (user_id = auth.uid())
-- Devrait réussir
INSERT INTO journal_transformation (user_id, titre, contenu, thematique)
VALUES (auth.uid(), 'Test journal valide', 'Contenu de test', 'priere')
RETURNING id, user_id, titre;
-- Attendu : 1 ligne insérée avec user_id = auth.uid()

-- Test 1b : Insertion invalide (user_id différent)
-- Devrait échouer avec erreur RLS
-- Remplacer 'UUID_AUTRE_USER' par un UUID valide d'un autre utilisateur
DO $$
DECLARE
  autre_user_id UUID;
BEGIN
  -- Récupérer un autre utilisateur (pas auth.uid())
  SELECT id INTO autre_user_id FROM profils WHERE id != auth.uid() LIMIT 1;
  
  IF autre_user_id IS NULL THEN
    RAISE NOTICE 'Aucun autre utilisateur trouvé pour le test';
  ELSE
    BEGIN
      INSERT INTO journal_transformation (user_id, titre, contenu, thematique)
      VALUES (autre_user_id, 'Test journal invalide', 'Devrait échouer', 'priere');
      RAISE EXCEPTION 'ERREUR : Insertion non autorisée a réussi !';
    EXCEPTION
      WHEN insufficient_privilege OR check_violation THEN
        RAISE NOTICE 'OK : Insertion non autorisée bloquée par RLS';
    END;
  END IF;
END $$;

-- ----------------------------------------
-- TEST 2 : user_parcours_progression
-- ----------------------------------------
-- Test 2a : Insertion valide
INSERT INTO user_parcours_progression (user_id, parcours_id, progression_pourcentage, statut)
SELECT auth.uid(), id, 0, 'en_cours'
FROM parcours_transformation
LIMIT 1
RETURNING id, user_id;
-- Attendu : 1 ligne insérée

-- Test 2b : Insertion invalide
DO $$
DECLARE
  autre_user_id UUID;
  parcours_test_id UUID;
BEGIN
  SELECT id INTO autre_user_id FROM profils WHERE id != auth.uid() LIMIT 1;
  SELECT id INTO parcours_test_id FROM parcours_transformation LIMIT 1;
  
  IF autre_user_id IS NULL OR parcours_test_id IS NULL THEN
    RAISE NOTICE 'Données de test manquantes';
  ELSE
    BEGIN
      INSERT INTO user_parcours_progression (user_id, parcours_id, progression_pourcentage, statut)
      VALUES (autre_user_id, parcours_test_id, 0, 'en_cours');
      RAISE EXCEPTION 'ERREUR : Insertion non autorisée a réussi !';
    EXCEPTION
      WHEN insufficient_privilege OR check_violation THEN
        RAISE NOTICE 'OK : Insertion non autorisée bloquée par RLS';
    END;
  END IF;
END $$;

-- ----------------------------------------
-- TEST 3 : evaluations_croissance
-- ----------------------------------------
-- Test 3a : Insertion valide
-- Note : La colonne peut s'appeler 'domaine' ou 'domaine_evalue' selon la version du schéma
DO $$
BEGIN
  -- Vérifier si la colonne 'domaine' existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'evaluations_croissance' 
    AND column_name = 'domaine'
  ) THEN
    -- Utiliser 'domaine' (schéma modifié)
    INSERT INTO evaluations_croissance (user_id, domaine, type_evaluation, score)
    VALUES (auth.uid(), 'priere', 'mensuelle', 7);
  ELSE
    -- Utiliser 'domaine_evalue' (schéma original)
    INSERT INTO evaluations_croissance (user_id, type_evaluation, domaine_evalue, score)
    VALUES (auth.uid(), 'mensuelle', 'priere', 7);
  END IF;
  
  RAISE NOTICE 'OK : Insertion valide réussie pour evaluations_croissance';
END $$;

-- Test 3b : Insertion invalide
DO $$
DECLARE
  autre_user_id UUID;
  has_domaine BOOLEAN;
BEGIN
  SELECT id INTO autre_user_id FROM profils WHERE id != auth.uid() LIMIT 1;
  
  IF autre_user_id IS NULL THEN
    RAISE NOTICE 'Aucun autre utilisateur trouvé';
  ELSE
    -- Vérifier quelle colonne existe
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'evaluations_croissance' 
      AND column_name = 'domaine'
    ) INTO has_domaine;
    
    BEGIN
      IF has_domaine THEN
        -- Schéma modifié : domaine, type_evaluation
        INSERT INTO evaluations_croissance (user_id, domaine, type_evaluation, score)
        VALUES (autre_user_id, 'priere', 'mensuelle', 7);
      ELSE
        -- Schéma original : type_evaluation, domaine_evalue
        INSERT INTO evaluations_croissance (user_id, type_evaluation, domaine_evalue, score)
        VALUES (autre_user_id, 'mensuelle', 'priere', 7);
      END IF;
      RAISE EXCEPTION 'ERREUR : Insertion non autorisée a réussi !';
    EXCEPTION
      WHEN insufficient_privilege OR check_violation THEN
        RAISE NOTICE 'OK : Insertion non autorisée bloquée par RLS';
    END;
  END IF;
END $$;

-- ----------------------------------------
-- TEST 4 : suivi_post_crise
-- ----------------------------------------
-- Test 4a : Insertion valide
INSERT INTO suivi_post_crise (user_id, type_crise, description, gravite, statut)
VALUES (auth.uid(), 'maladie', 'Test suivi post-crise', 5, 'actif')
RETURNING id, user_id, type_crise;
-- Attendu : 1 ligne insérée

-- Test 4b : Insertion invalide
DO $$
DECLARE
  autre_user_id UUID;
BEGIN
  SELECT id INTO autre_user_id FROM profils WHERE id != auth.uid() LIMIT 1;
  
  IF autre_user_id IS NULL THEN
    RAISE NOTICE 'Aucun autre utilisateur trouvé';
  ELSE
    BEGIN
      INSERT INTO suivi_post_crise (user_id, type_crise, description, gravite, statut)
      VALUES (autre_user_id, 'maladie', 'Test invalide', 5, 'actif');
      RAISE EXCEPTION 'ERREUR : Insertion non autorisée a réussi !';
    EXCEPTION
      WHEN insufficient_privilege OR check_violation THEN
        RAISE NOTICE 'OK : Insertion non autorisée bloquée par RLS';
    END;
  END IF;
END $$;

-- ----------------------------------------
-- TEST 5 : historique_guerison
-- ----------------------------------------
-- Test 5a : Insertion valide (pour un suivi appartenant à l'utilisateur)
DO $$
DECLARE
  mon_suivi_id UUID;
BEGIN
  -- Récupérer un suivi appartenant à l'utilisateur
  SELECT id INTO mon_suivi_id FROM suivi_post_crise WHERE user_id = auth.uid() LIMIT 1;
  
  IF mon_suivi_id IS NULL THEN
    RAISE NOTICE 'Aucun suivi trouvé pour l''utilisateur. Créez-en un d''abord.';
  ELSE
    INSERT INTO historique_guerison (suivi_id, etat_mental, etat_spirituel, etat_physique, progres_observes)
    VALUES (mon_suivi_id, 7, 8, 6, 'Test progression valide')
    RETURNING id, suivi_id;
    RAISE NOTICE 'OK : Insertion valide réussie';
  END IF;
END $$;

-- Test 5b : Insertion invalide (pour un suivi d'un autre utilisateur)
DO $$
DECLARE
  autre_suivi_id UUID;
BEGIN
  -- Récupérer un suivi d'un autre utilisateur
  SELECT id INTO autre_suivi_id FROM suivi_post_crise WHERE user_id != auth.uid() LIMIT 1;
  
  IF autre_suivi_id IS NULL THEN
    RAISE NOTICE 'Aucun suivi d''autre utilisateur trouvé';
  ELSE
    BEGIN
      INSERT INTO historique_guerison (suivi_id, etat_mental, etat_spirituel, etat_physique, progres_observes)
      VALUES (autre_suivi_id, 7, 8, 6, 'Test invalide');
      RAISE EXCEPTION 'ERREUR : Insertion non autorisée a réussi !';
    EXCEPTION
      WHEN insufficient_privilege OR check_violation THEN
        RAISE NOTICE 'OK : Insertion non autorisée bloquée par RLS';
    END;
  END IF;
END $$;

-- ----------------------------------------
-- NETTOYAGE : Supprimer les données de test
-- ----------------------------------------
-- Décommenter pour nettoyer après les tests
/*
DELETE FROM historique_guerison WHERE progres_observes LIKE 'Test%';
DELETE FROM suivi_post_crise WHERE description LIKE 'Test%';
-- Nettoyage compatible avec les deux versions du schéma
DELETE FROM evaluations_croissance 
WHERE (domaine_evalue = 'priere' OR domaine = 'priere') 
AND score = 7 
AND (type_evaluation = 'mensuelle' OR type_evaluation = 'auto_evaluation');
DELETE FROM user_parcours_progression WHERE statut = 'en_cours' AND progression_pourcentage = 0;
DELETE FROM journal_transformation WHERE titre LIKE 'Test%';
*/

-- ----------------------------------------
-- RÉSUMÉ DES TESTS
-- ----------------------------------------
-- Si tous les tests affichent "OK", les RLS INSERT fonctionnent correctement.
-- Si un test affiche "ERREUR", vérifiez les politiques RLS correspondantes.
