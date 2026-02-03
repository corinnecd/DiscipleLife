-- ============================================
-- Migration 105 : Famille LES DÉTERMINÉS — 55 membres (1 superviseur + 12 niveau 2 + 42 niveau 3)
--
-- 1) Supprimer 34 profils de la famille pour atteindre 55 membres.
-- 2) Réorganiser les 54 disciples restants :
--    - Niveau 2 : 12 disciples directs d'Alain SIL (mentor_id = NULL)
--    - Niveau 3 : 42 disciples répartis sous ces 12 (3 ou 4 par mentor, mentor_id = un des 12)
--
-- Règles : 1 superviseur (Alain), 12 directs, 42 sous les 12. Total = 55.
-- Répartition : 6 mentors avec 4 disciples chacun, 6 mentors avec 3 disciples chacun.
-- ============================================

DO $$
DECLARE
  v_famille_id UUID;
  v_superviseur_id UUID;
  ids_tous UUID[];
  ids_garder UUID[];
  ids_supprimer UUID[];
  ids_12_mentors UUID[];
  i INT;
  j INT;
  idx_mentor INT;
  n_avant INT;
  n_suppr INT;
  n_profils INT;
  n_identities INT;
  n_users INT;
BEGIN
  -- 1. Identifier la famille LES DÉTERMINÉS et le superviseur (Alain SIL)
  SELECT f.id, f.superviseur_id INTO v_famille_id, v_superviseur_id
  FROM familles_disciples f
  WHERE UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES')
     OR f.nom ILIKE '%déterminé%'
     OR f.identifiant_famille = 'FAM001'
  LIMIT 1;

  IF v_famille_id IS NULL THEN
    RAISE EXCEPTION 'Migration 105 : Famille LES DÉTERMINÉS introuvable.';
  END IF;

  IF v_superviseur_id IS NULL THEN
    RAISE EXCEPTION 'Migration 105 : Superviseur (Alain SIL) introuvable pour la famille LES DÉTERMINÉS.';
  END IF;

  -- 2. Tous les profils de la famille (hors superviseur), ordonnés par id
  SELECT ARRAY_AGG(id ORDER BY id) INTO ids_tous
  FROM profils
  WHERE famille_id = v_famille_id AND id != v_superviseur_id;

  IF ids_tous IS NULL OR array_length(ids_tous, 1) IS NULL THEN
    RAISE NOTICE 'Migration 105 : Aucun disciple dans la famille (hors superviseur).';
    RETURN;
  END IF;

  n_avant := array_length(ids_tous, 1);

  IF n_avant < 55 THEN
    RAISE NOTICE 'Migration 105 : Moins de 55 membres hors superviseur (%). Aucune suppression.', n_avant;
    -- On peut quand même réorganiser les mentor_id si on a au moins 54
    IF n_avant < 54 THEN
      RETURN;
    END IF;
  END IF;

  -- 3. Garder les 54 premiers (par id) ; les autres seront supprimés
  ids_garder := ids_tous[1:LEAST(54, n_avant)];
  IF n_avant > 54 THEN
    ids_supprimer := ids_tous[55:n_avant];
  ELSE
    ids_supprimer := ARRAY[]::UUID[];
  END IF;

  -- 4. Les 12 premiers des 54 = niveau 2 (disciples directs d'Alain, mentor_id = NULL)
  ids_12_mentors := ids_garder[1:LEAST(12, array_length(ids_garder, 1))];

  -- 5. Mettre à jour mentor_id pour les 54 gardés
  --    12 premiers : mentor_id = NULL
  FOR i IN 1..LEAST(12, array_length(ids_garder, 1)) LOOP
    UPDATE profils SET mentor_id = NULL WHERE id = ids_garder[i];
  END LOOP;

  --    42 suivants : mentor_id = un des 12 (6×4 + 6×3)
  FOR i IN 13..LEAST(54, array_length(ids_garder, 1)) LOOP
    j := i - 12;  -- 1..42
    IF j <= 24 THEN
      idx_mentor := ((j - 1) / 4) + 1;  -- disciples 1-24 → mentors 1..6 (4 chacun)
    ELSE
      idx_mentor := 7 + ((j - 25) / 3);  -- disciples 25-42 → mentors 7..12 (3 chacun)
    END IF;
    IF idx_mentor >= 1 AND idx_mentor <= array_length(ids_12_mentors, 1) THEN
      UPDATE profils SET mentor_id = ids_12_mentors[idx_mentor] WHERE id = ids_garder[i];
    END IF;
  END LOOP;

  -- 6. Supprimer les 34 (ou moins) profils en trop : auth.identities → profils → auth.users
  IF array_length(ids_supprimer, 1) > 0 THEN
    DELETE FROM auth.identities WHERE user_id = ANY(ids_supprimer);
    GET DIAGNOSTICS n_identities = ROW_COUNT;
    DELETE FROM public.profils WHERE id = ANY(ids_supprimer);
    GET DIAGNOSTICS n_profils = ROW_COUNT;
    DELETE FROM auth.users WHERE id = ANY(ids_supprimer);
    GET DIAGNOSTICS n_users = ROW_COUNT;
    n_suppr := array_length(ids_supprimer, 1);
    RAISE NOTICE 'Migration 105 : % profils supprimés (identities=%, users=%).', n_suppr, n_identities, n_users;
  END IF;

  RAISE NOTICE 'Migration 105 : Famille LES DÉTERMINÉS réorganisée. Gardés=%, 12 mentors, 42 sous eux.', array_length(ids_garder, 1);
END;
$$;

-- Resynchroniser nb_disciples sur tous les profils
UPDATE profils p
SET nb_disciples = COALESCE(
  (SELECT COUNT(*)::INTEGER FROM profils q WHERE q.mentor_id = p.id),
  0
)
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'profils' AND c.column_name = 'nb_disciples'
);

-- Mettre à jour nombre_disciples_actuels pour la famille LES DÉTERMINÉS
UPDATE familles_disciples f
SET nombre_disciples_actuels = (SELECT COUNT(*)::INTEGER FROM profils p WHERE p.famille_id = f.id)
WHERE UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES')
   OR f.nom ILIKE '%déterminé%'
   OR f.identifiant_famille = 'FAM001';

-- Vérification : afficher le total (attendu : 55)
SELECT
  f.identifiant_famille,
  f.nom,
  f.superviseur_id,
  f.nombre_disciples_actuels AS total_membres,
  (SELECT COUNT(*)::INT FROM profils p WHERE p.famille_id = f.id AND p.mentor_id IS NULL AND p.id != f.superviseur_id) AS nb_directs_sans_mentor,
  (SELECT COUNT(*)::INT FROM profils p WHERE p.famille_id = f.id AND p.mentor_id IS NOT NULL) AS nb_avec_mentor
FROM familles_disciples f
WHERE UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES')
   OR f.identifiant_famille = 'FAM001';
