-- ============================================
-- Vérification des tables Objectif 3 (migrations 016 et 073)
-- Exécuter dans le SQL Editor Supabase.
-- Chaque bloc renvoie un résultat : vérifier que les tables et colonnes existent.
-- ============================================

-- ----------------------------------------
-- 1. Migration 016 – Tables transformation (parcours, journal, évaluations)
-- ----------------------------------------

-- 1a. parcours_transformation
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'parcours_transformation'
ORDER BY ordinal_position;
-- Attendu : id, nom, description, thematique, duree_jours, niveau, objectifs, image_url, statut, ordre_affichage, categorie, created_at, updated_at

-- 1b. modules_parcours
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'modules_parcours'
ORDER BY ordinal_position;
-- Attendu : id, parcours_id, titre, description, contenu, type_contenu, duree_estimee, ordre, ressources, exercices, statut, created_at, updated_at

-- 1c. user_parcours_progression
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_parcours_progression'
ORDER BY ordinal_position;
-- Attendu : id, user_id, parcours_id, date_inscription, progression_pourcentage, modules_completes, statut, etc.

-- 1d. journal_transformation
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'journal_transformation'
ORDER BY ordinal_position;
-- Attendu : id, user_id, date_entree, titre, contenu, thematique, created_at, updated_at, etc.

-- 1e. evaluations_croissance
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'evaluations_croissance'
ORDER BY ordinal_position;
-- Attendu : id, user_id, date_evaluation, type_evaluation, domaine_evalue, score, etc.

-- ----------------------------------------
-- 2. Migration 073 – Suivi post-crise
-- ----------------------------------------

-- 2a. suivi_post_crise
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'suivi_post_crise'
ORDER BY ordinal_position;
-- Attendu : id, user_id, date_debut, type_crise, description, gravite, statut, mentor_id, created_at, updated_at, etc.

-- 2b. historique_guerison
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'historique_guerison'
ORDER BY ordinal_position;
-- Attendu : id, suivi_id, date_suivi, etat_mental, etat_spirituel, etat_physique, created_at, updated_at, etc.

-- ----------------------------------------
-- 3. Résumé : existence des tables
-- ----------------------------------------
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'parcours_transformation',
    'modules_parcours',
    'user_parcours_progression',
    'journal_transformation',
    'evaluations_croissance',
    'suivi_post_crise',
    'historique_guerison'
  )
ORDER BY table_name;
-- Attendu : 7 lignes (une par table). Si moins, les migrations 016 ou 073 ne sont pas toutes appliquées.

-- ----------------------------------------
-- 4. RLS – Vérifier si les politiques existent (optionnel)
-- ----------------------------------------
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'parcours_transformation',
    'modules_parcours',
    'user_parcours_progression',
    'journal_transformation',
    'evaluations_croissance',
    'suivi_post_crise',
    'historique_guerison'
  )
ORDER BY tablename, policyname;
-- Si vide : pas de RLS ou politiques à créer. Pour Objectif 3, chaque table liée à user_id doit autoriser l'utilisateur à lire/écrire ses propres lignes (ex. user_id = auth.uid() ou via profils).
-- Pour les INSERT : les politiques doivent avoir WITH CHECK (user_id = auth.uid()) ou condition équivalente. Si qual est NULL sur une politique INSERT, exécuter les migrations 108 et 109.
