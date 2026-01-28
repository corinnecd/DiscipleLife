-- ============================================
-- Migration 075 – Vérification et backfill optionnel
-- À exécuter APRÈS sql/migrations/075_modele_cible_sync_cercle_vers_profils.sql
-- ============================================

-- ----- 1. Vérifications -----

-- 1.1 La colonne profil_id existe sur cercle_personnes
SELECT 'Colonne profil_id' AS verification,
       column_name,
       data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'cercle_personnes'
  AND column_name = 'profil_id';

-- 1.2 Le trigger existe
SELECT 'Trigger sync' AS verification,
       trigger_name,
       event_manipulation,
       action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'cercle_personnes'
  AND trigger_name = 'sync_cercle_vers_profils_trigger';

-- 1.3 Comptages : lignes cercle_personnes sans profil_id
SELECT 'Lignes sans profil_id' AS indicateur,
       COUNT(*) AS nombre
FROM cercle_personnes
WHERE profil_id IS NULL;

-- 1.4 Comptages : lignes cercle_personnes avec profil_id
SELECT 'Lignes avec profil_id' AS indicateur,
       COUNT(*) AS nombre
FROM cercle_personnes
WHERE profil_id IS NOT NULL;

-- ----- 2. Correction trigger (si le backfill échoue) -----
-- Si le backfill laisse encore 72 (ou N) lignes sans profil_id, exécuter d’abord :
--   sql/migrations/075b_fix_trigger_mentor_optionnel.sql
-- Puis relancer le backfill ci-dessous.

-- ----- 3. Backfill (optionnel) -----
-- Déclencher le trigger sur chaque ligne sans profil_id pour créer le profil et remplir profil_id.
-- À exécuter une seule fois après la migration 075 (et 075b en cas d’échec).

-- Décommenter les 4 lignes ci-dessous pour lancer le backfill :

/*
UPDATE cercle_personnes
SET last_name = last_name
WHERE profil_id IS NULL;
*/

-- Après le backfill, revérifier :
-- SELECT COUNT(*) AS sans_profil_id FROM cercle_personnes WHERE profil_id IS NULL;
-- Le résultat attendu est 0.

-- ----- 4. Backfill ligne par ligne (diagnostic) -----
-- Si le backfill en bloc échoue ou ne réduit pas le count, exécuter ce bloc
-- pour voir quelle ligne pose problème (message dans les NOTICE).
-- Décommenter tout le bloc DO $$ ... $$ ;

/*
DO $$
DECLARE
  r RECORD;
  n_ok INT := 0;
  n_ko INT := 0;
BEGIN
  FOR r IN (SELECT id FROM cercle_personnes WHERE profil_id IS NULL)
  LOOP
    BEGIN
      UPDATE cercle_personnes SET last_name = last_name WHERE id = r.id;
      n_ok := n_ok + 1;
    EXCEPTION WHEN OTHERS THEN
      n_ko := n_ko + 1;
      RAISE NOTICE 'Erreur pour cercle_personnes.id=% : %', r.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'Backfill terminé : % OK, % en erreur', n_ok, n_ko;
END;
$$;
*/

-- ----- 5. Vérification de cohérence (après backfill) -----
-- Décommenter et exécuter après backfill pour contrôler que chaque profil_id pointe vers un profil existant.

/*
SELECT cp.id AS cercle_id,
       cp.profil_id,
       p.id AS profils_id,
       cp.first_name AS cp_first_name,
       p.first_name AS p_first_name
FROM cercle_personnes cp
LEFT JOIN profils p ON p.id = cp.profil_id
WHERE cp.profil_id IS NOT NULL
  AND p.id IS NULL;
*/
-- Aucune ligne ne doit être retournée (aucun profil_id orphelin).
