-- ============================================
-- Rollback migration 104 : supprimer les profils créés par 104_seed_arbre_repartition_disciples
--
-- Supprime tous les profils (et auth.users + auth.identities) dont l'email
-- correspond au pattern de la seed 104 : disciple.arbre....@seed.disciple.local
-- Puis resynchronise nb_disciples sur les profils restants.
-- ============================================

DO $$
DECLARE
  ids_to_remove UUID[];
  n_profils INT;
  n_identities INT;
  n_users INT;
BEGIN
  SELECT ARRAY_AGG(id) INTO ids_to_remove
  FROM profils
  WHERE email LIKE 'disciple.arbre.%@seed.disciple.local';

  IF ids_to_remove IS NULL OR array_length(ids_to_remove, 1) IS NULL THEN
    RAISE NOTICE '104_rollback : Aucun profil disciple.arbre...@seed.disciple.local trouvé.';
    RETURN;
  END IF;

  -- 1. Supprimer auth.identities (référence auth.users)
  DELETE FROM auth.identities WHERE user_id = ANY(ids_to_remove);
  GET DIAGNOSTICS n_identities = ROW_COUNT;

  -- 2. Supprimer profils (référence auth.users)
  DELETE FROM public.profils WHERE id = ANY(ids_to_remove);
  GET DIAGNOSTICS n_profils = ROW_COUNT;

  -- 3. Supprimer auth.users
  DELETE FROM auth.users WHERE id = ANY(ids_to_remove);
  GET DIAGNOSTICS n_users = ROW_COUNT;

  RAISE NOTICE '104_rollback : % profils, % identities, % users supprimés.', n_profils, n_identities, n_users;
END;
$$;

-- Resynchroniser nb_disciples sur tous les profils restants
UPDATE profils p
SET nb_disciples = COALESCE(
  (SELECT COUNT(*)::INTEGER FROM profils q WHERE q.mentor_id = p.id),
  0
)
WHERE EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = 'profils' AND c.column_name = 'nb_disciples');
