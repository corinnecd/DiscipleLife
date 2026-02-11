-- ============================================
-- Vérification des migrations 092, 093, 075
-- Exécuter dans le SQL Editor Supabase.
-- Chaque bloc renvoie un résultat : vérifier que tout est OK.
-- ============================================

-- ----------------------------------------
-- 1. Migration 092 : date_entree_famille sur profils
-- ----------------------------------------
-- Attendu : une ligne avec column_name = 'date_entree_famille', data_type = 'date'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profils'
  AND column_name = 'date_entree_famille';
-- Si vide → migration 092 pas appliquée.
-- Si une ligne → OK.

-- Index 092 (optionnel)
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'profils'
  AND indexname = 'idx_profils_date_entree_famille';
-- Une ligne = index présent.

-- ----------------------------------------
-- 2. Migration 093 : phone et ville_residence sur profils
-- ----------------------------------------
-- Attendu : deux lignes (phone, ville_residence), data_type = 'text'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profils'
  AND column_name IN ('phone', 'ville_residence')
ORDER BY column_name;
-- Si 0 ou 1 ligne → migration 093 incomplète ou pas appliquée.
-- Si 2 lignes → OK.

-- Index 093 (optionnel)
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'profils'
  AND indexname IN ('idx_profils_phone', 'idx_profils_ville_residence')
ORDER BY indexname;
-- Deux lignes = les deux index présents.

-- ----------------------------------------
-- 3. Migration 075 : profil_id + trigger sur cercle_personnes
-- ----------------------------------------
-- 3a. Colonne profil_id sur cercle_personnes
-- Attendu : une ligne, data_type = 'uuid'
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cercle_personnes'
  AND column_name = 'profil_id';
-- Si vide → migration 075 pas appliquée (ou table cercle_personnes absente).
-- Si une ligne → OK.

-- 3b. Index sur profil_id
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'cercle_personnes'
  AND indexname = 'idx_cercle_personnes_profil_id';
-- Une ligne = index présent.

-- 3c. Fonction trigger existante
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'sync_cercle_personnes_vers_profils';
-- Une ligne = fonction créée.

-- 3d. Trigger sur cercle_personnes
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'cercle_personnes'
  AND trigger_name = 'sync_cercle_vers_profils_trigger';
-- Une ligne, event_manipulation IN ('INSERT','UPDATE'), action_timing = 'BEFORE' = OK.
