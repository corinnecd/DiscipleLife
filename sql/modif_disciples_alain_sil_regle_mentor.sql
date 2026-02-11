-- ============================================
-- Modifications des disciples d'Alain SIL (Les Déterminés)
--
-- RÈGLE OBLIGATOIRE : Un mentor doit avoir au moins 1 disciple.
-- Sinon il est considéré comme simple disciple (role = 'disciple').
--
-- Actions :
-- 1) Supprimer 2 disciples chez Kevin LOPEZ
-- 2) Supprimer 3 disciples chez Steve SANCHEZ
-- 3) Supprimer le mentor Kevin LOPEZ en doublon
-- 4) Supprimer 2 disciples chez Julie DUBOIS
-- 5) Supprimer 2 disciples chez Patricia MARTINEZ
-- 6) Supprimer 1 disciple + 2 mentors chez Julie DUBOIS
-- 7) Supprimer 2 disciples + 2 mentors chez Louis RENAUD
-- 8) Supprimer 1 disciple + 1 mentor chez Julie DUBOIS
-- 9) Supprimer 2 disciples + le mentor FRANCK GIRARD chez Melissa HENRY
-- 10) Supprimer 3 disciples chez Boris ANDRE
-- 11) Supprimer 2 mentors + 2 disciples chez Christine LEFEVRE
-- 12) Supprimer les mentors de Julien BOUCHER qui n'ont aucun disciple
-- 13) Supprimer 2 mentors chez Gabriel LEFEVRE, puis affecter 1 disciple à chaque mentor restant sous Gabriel
-- 14) Passer en role='disciple' tout mentor n'ayant plus aucun disciple
--
-- Ordre de suppression (FK) : cercle_personnes (parent_disciple_id puis profil_id) → auth.identities → profils → auth.users
-- Avant chaque DELETE profils, nettoyer cercle_personnes pour éviter le trigger sync_cercle_vers_profils (INSERT profils → FK users).
-- ============================================

DO $$
DECLARE
  v_famille_id UUID;
  v_kevin_id UUID;
  v_kevin_doublon_id UUID;
  v_steve_id UUID;
  v_julie_id UUID;
  v_patricia_id UUID;
  v_louis_id UUID;
  v_melissa_id UUID;
  v_boris_id UUID;
  v_christine_id UUID;
  v_julien_id UUID;
  v_gabriel_id UUID;
  v_franck_girard_id UUID;
  ids_suppr UUID[] := ARRAY[]::UUID[];
  r RECORD;
  i INT;
  n_identities INT;
  n_profils INT;
  n_users INT;
  mentor_id_gabriel UUID;
BEGIN
  -- Famille Les Déterminés
  SELECT f.id INTO v_famille_id
  FROM familles_disciples f
  WHERE (UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES') OR f.identifiant_famille = 'FAM001')
  LIMIT 1;

  IF v_famille_id IS NULL THEN
    RAISE EXCEPTION 'Famille Les Déterminés introuvable.';
  END IF;

  -- Résolution des profils (disciples directs d'Alain = mentor_id = superviseur ou dans la famille)
  SELECT id INTO v_kevin_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'KEVIN' AND UPPER(TRIM(last_name)) = 'LOPEZ' ORDER BY id LIMIT 1 OFFSET 0;
  SELECT id INTO v_kevin_doublon_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'KEVIN' AND UPPER(TRIM(last_name)) = 'LOPEZ' ORDER BY id LIMIT 1 OFFSET 1;
  SELECT id INTO v_steve_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'STEVE' AND UPPER(TRIM(last_name)) = 'SANCHEZ' ORDER BY id LIMIT 1;
  SELECT id INTO v_julie_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'JULIE' AND UPPER(TRIM(last_name)) = 'DUBOIS' LIMIT 1;
  SELECT id INTO v_patricia_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'PATRICIA' AND UPPER(TRIM(last_name)) = 'MARTINEZ' LIMIT 1;
  SELECT id INTO v_louis_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'LOUIS' AND UPPER(TRIM(last_name)) = 'RENAUD' LIMIT 1;
  SELECT id INTO v_melissa_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'MELISSA' AND UPPER(TRIM(last_name)) = 'HENRY' LIMIT 1;
  SELECT id INTO v_boris_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'BORIS' AND UPPER(TRIM(last_name)) = 'ANDRE' LIMIT 1;
  SELECT id INTO v_christine_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'CHRISTINE' AND UPPER(TRIM(last_name)) = 'LEFEVRE' LIMIT 1;
  SELECT id INTO v_julien_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'JULIEN' AND UPPER(TRIM(last_name)) = 'BOUCHER' LIMIT 1;
  SELECT id INTO v_gabriel_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'GABRIEL' AND UPPER(TRIM(last_name)) = 'LEFEVRE' LIMIT 1;
  IF v_gabriel_id IS NULL THEN
    SELECT id INTO v_gabriel_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'GABRIEL' AND UPPER(TRIM(last_name)) = 'FOURNIER' LIMIT 1;
  END IF;
  SELECT id INTO v_franck_girard_id FROM profils WHERE famille_id = v_famille_id AND mentor_id = v_melissa_id AND UPPER(TRIM(first_name)) = 'FRANCK' AND UPPER(TRIM(last_name)) = 'GIRARD' LIMIT 1;

  -- Helper : ajouter des ids à supprimer (disciples d'un mentor, ou mentors spécifiques)
  -- 1) 2 disciples de Kevin LOPEZ
  IF v_kevin_id IS NOT NULL THEN
    SELECT array_agg(id) INTO ids_suppr FROM (SELECT id FROM profils WHERE mentor_id = v_kevin_id LIMIT 2) t;
    IF ids_suppr IS NOT NULL THEN
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
      DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
      DELETE FROM auth.identities WHERE user_id = ANY(ids_suppr);
      DELETE FROM public.profils WHERE id = ANY(ids_suppr);
      DELETE FROM auth.users WHERE id = ANY(ids_suppr);
    END IF;
  END IF;

  -- 2) 3 disciples de Steve SANCHEZ
  IF v_steve_id IS NOT NULL THEN
    ids_suppr := NULL;
    SELECT array_agg(id) INTO ids_suppr FROM (SELECT id FROM profils WHERE mentor_id = v_steve_id LIMIT 3) t;
    IF ids_suppr IS NOT NULL THEN
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
      DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
      DELETE FROM auth.identities WHERE user_id = ANY(ids_suppr);
      DELETE FROM public.profils WHERE id = ANY(ids_suppr);
      DELETE FROM auth.users WHERE id = ANY(ids_suppr);
    END IF;
  END IF;

  -- 3) Kevin LOPEZ en doublon (supprimer le 2e, garder le 1er)
  IF v_kevin_doublon_id IS NOT NULL THEN
    ids_suppr := ARRAY[v_kevin_doublon_id];
    UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
    DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
    DELETE FROM auth.identities WHERE user_id = v_kevin_doublon_id;
    DELETE FROM public.profils WHERE id = v_kevin_doublon_id;
    DELETE FROM auth.users WHERE id = v_kevin_doublon_id;
  END IF;

  -- 4) 2 disciples de Julie DUBOIS
  IF v_julie_id IS NOT NULL THEN
    ids_suppr := NULL;
    SELECT array_agg(id) INTO ids_suppr FROM (SELECT id FROM profils WHERE mentor_id = v_julie_id LIMIT 2) t;
    IF ids_suppr IS NOT NULL THEN
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
      DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
      DELETE FROM auth.identities WHERE user_id = ANY(ids_suppr);
      DELETE FROM public.profils WHERE id = ANY(ids_suppr);
      DELETE FROM auth.users WHERE id = ANY(ids_suppr);
    END IF;
  END IF;

  -- 5) 2 disciples de Patricia MARTINEZ
  IF v_patricia_id IS NOT NULL THEN
    ids_suppr := NULL;
    SELECT array_agg(id) INTO ids_suppr FROM (SELECT id FROM profils WHERE mentor_id = v_patricia_id LIMIT 2) t;
    IF ids_suppr IS NOT NULL THEN
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
      DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
      DELETE FROM auth.identities WHERE user_id = ANY(ids_suppr);
      DELETE FROM public.profils WHERE id = ANY(ids_suppr);
      DELETE FROM auth.users WHERE id = ANY(ids_suppr);
    END IF;
  END IF;

  -- 6) 1 disciple + 2 mentors chez Julie DUBOIS (3 personnes : priorité aux mentors)
  IF v_julie_id IS NOT NULL THEN
    ids_suppr := NULL;
    SELECT array_agg(id) INTO ids_suppr FROM (
      SELECT id FROM profils
      WHERE mentor_id = v_julie_id
      ORDER BY (SELECT COUNT(*) FROM profils q WHERE q.mentor_id = profils.id) DESC NULLS LAST, id
      LIMIT 3
    ) t;
    IF ids_suppr IS NOT NULL THEN
      FOR r IN (SELECT id FROM profils WHERE mentor_id = ANY(ids_suppr)) LOOP
        UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = r.id);
        DELETE FROM public.cercle_personnes WHERE profil_id = r.id;
        DELETE FROM auth.identities WHERE user_id = r.id;
        DELETE FROM public.profils WHERE id = r.id;
        DELETE FROM auth.users WHERE id = r.id;
      END LOOP;
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
      DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
      DELETE FROM auth.identities WHERE user_id = ANY(ids_suppr);
      DELETE FROM public.profils WHERE id = ANY(ids_suppr);
      DELETE FROM auth.users WHERE id = ANY(ids_suppr);
    END IF;
  END IF;

  -- 7) 2 disciples + 2 mentors chez Louis RENAUD (4 personnes)
  IF v_louis_id IS NOT NULL THEN
    ids_suppr := NULL;
    SELECT array_agg(id) INTO ids_suppr FROM (
      SELECT id FROM profils
      WHERE mentor_id = v_louis_id
      ORDER BY (SELECT COUNT(*) FROM profils q WHERE q.mentor_id = profils.id) DESC NULLS LAST, id
      LIMIT 4
    ) t;
    IF ids_suppr IS NOT NULL THEN
      FOR r IN (SELECT id FROM profils WHERE mentor_id = ANY(ids_suppr)) LOOP
        UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = r.id);
        DELETE FROM public.cercle_personnes WHERE profil_id = r.id;
        DELETE FROM auth.identities WHERE user_id = r.id;
        DELETE FROM public.profils WHERE id = r.id;
        DELETE FROM auth.users WHERE id = r.id;
      END LOOP;
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
      DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
      DELETE FROM auth.identities WHERE user_id = ANY(ids_suppr);
      DELETE FROM public.profils WHERE id = ANY(ids_suppr);
      DELETE FROM auth.users WHERE id = ANY(ids_suppr);
    END IF;
  END IF;

  -- 8) 1 disciple + 1 mentor chez Julie DUBOIS (2 personnes)
  IF v_julie_id IS NOT NULL THEN
    ids_suppr := NULL;
    SELECT array_agg(id) INTO ids_suppr FROM (
      SELECT id FROM profils
      WHERE mentor_id = v_julie_id
      ORDER BY (SELECT COUNT(*) FROM profils q WHERE q.mentor_id = profils.id) DESC NULLS LAST, id
      LIMIT 2
    ) t;
    IF ids_suppr IS NOT NULL THEN
      FOR r IN (SELECT id FROM profils WHERE mentor_id = ANY(ids_suppr)) LOOP
        UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = r.id);
        DELETE FROM public.cercle_personnes WHERE profil_id = r.id;
        DELETE FROM auth.identities WHERE user_id = r.id;
        DELETE FROM public.profils WHERE id = r.id;
        DELETE FROM auth.users WHERE id = r.id;
      END LOOP;
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
      DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
      DELETE FROM auth.identities WHERE user_id = ANY(ids_suppr);
      DELETE FROM public.profils WHERE id = ANY(ids_suppr);
      DELETE FROM auth.users WHERE id = ANY(ids_suppr);
    END IF;
  END IF;

  -- 9) 2 disciples + mentor FRANCK GIRARD chez Melissa HENRY
  IF v_melissa_id IS NOT NULL THEN
    ids_suppr := NULL;
    SELECT array_agg(id) INTO ids_suppr FROM (SELECT id FROM profils WHERE mentor_id = v_melissa_id LIMIT 2) t;
    IF ids_suppr IS NOT NULL THEN
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
      DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
      DELETE FROM auth.identities WHERE user_id = ANY(ids_suppr);
      DELETE FROM public.profils WHERE id = ANY(ids_suppr);
      DELETE FROM auth.users WHERE id = ANY(ids_suppr);
    END IF;
    IF v_franck_girard_id IS NOT NULL THEN
      ids_suppr := ARRAY[v_franck_girard_id];
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
      DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
      DELETE FROM auth.identities WHERE user_id = v_franck_girard_id;
      DELETE FROM public.profils WHERE id = v_franck_girard_id;
      DELETE FROM auth.users WHERE id = v_franck_girard_id;
    END IF;
  END IF;

  -- 10) 3 disciples de Boris ANDRE
  IF v_boris_id IS NOT NULL THEN
    ids_suppr := NULL;
    SELECT array_agg(id) INTO ids_suppr FROM (SELECT id FROM profils WHERE mentor_id = v_boris_id LIMIT 3) t;
    IF ids_suppr IS NOT NULL THEN
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
      DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
      DELETE FROM auth.identities WHERE user_id = ANY(ids_suppr);
      DELETE FROM public.profils WHERE id = ANY(ids_suppr);
      DELETE FROM auth.users WHERE id = ANY(ids_suppr);
    END IF;
  END IF;

  -- 11) 2 mentors + 2 disciples chez Christine LEFEVRE (4 personnes distinctes)
  IF v_christine_id IS NOT NULL THEN
    ids_suppr := NULL;
    SELECT array_agg(id) INTO ids_suppr FROM (
      SELECT id FROM profils
      WHERE mentor_id = v_christine_id
      ORDER BY (SELECT COUNT(*) FROM profils q WHERE q.mentor_id = profils.id) DESC NULLS LAST, id
      LIMIT 4
    ) t;
    IF ids_suppr IS NOT NULL THEN
      FOR r IN (SELECT id FROM profils WHERE mentor_id = ANY(ids_suppr)) LOOP
        UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = r.id);
        DELETE FROM public.cercle_personnes WHERE profil_id = r.id;
        DELETE FROM auth.identities WHERE user_id = r.id;
        DELETE FROM public.profils WHERE id = r.id;
        DELETE FROM auth.users WHERE id = r.id;
      END LOOP;
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
      DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
      DELETE FROM auth.identities WHERE user_id = ANY(ids_suppr);
      DELETE FROM public.profils WHERE id = ANY(ids_suppr);
      DELETE FROM auth.users WHERE id = ANY(ids_suppr);
    END IF;
  END IF;

  -- 12) Mentors de Julien BOUCHER qui n'ont aucun disciple → supprimer
  IF v_julien_id IS NOT NULL THEN
    FOR r IN (
      SELECT p.id FROM profils p
      WHERE p.mentor_id = v_julien_id
        AND (SELECT COUNT(*) FROM profils q WHERE q.mentor_id = p.id) = 0
    ) LOOP
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = r.id);
      DELETE FROM public.cercle_personnes WHERE profil_id = r.id;
      DELETE FROM auth.identities WHERE user_id = r.id;
      DELETE FROM public.profils WHERE id = r.id;
      DELETE FROM auth.users WHERE id = r.id;
    END LOOP;
  END IF;

  -- 13) Gabriel LEFEVRE : supprimer 2 mentors, puis 1 disciple par mentor restant sous Gabriel
  IF v_gabriel_id IS NOT NULL THEN
    ids_suppr := NULL;
    SELECT array_agg(id ORDER BY id) INTO ids_suppr FROM (SELECT id FROM profils WHERE mentor_id = v_gabriel_id LIMIT 2) t;
    IF ids_suppr IS NOT NULL THEN
      UPDATE public.cercle_personnes SET parent_disciple_id = NULL WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
      DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
      DELETE FROM auth.identities WHERE user_id = ANY(ids_suppr);
      DELETE FROM public.profils WHERE id = ANY(ids_suppr);
      DELETE FROM auth.users WHERE id = ANY(ids_suppr);
    END IF;
    -- Affecter 1 disciple à chaque mentor restant sous Gabriel (via fonction si disponible, sinon simple note)
    FOR mentor_id_gabriel IN (SELECT id FROM profils WHERE mentor_id = v_gabriel_id)
    LOOP
      IF (SELECT COUNT(*) FROM profils WHERE mentor_id = mentor_id_gabriel) = 0 THEN
        IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'create_profil_seed_2gen') THEN
          PERFORM create_profil_seed_2gen(
            'modif.gabriel.mentor.' || mentor_id_gabriel::text || '@test.icc.ga',
            'Disciple',
            'G' || substr(mentor_id_gabriel::text, 1, 4),
            v_famille_id,
            mentor_id_gabriel
          );
        ELSE
          -- Sans fonction : on ne peut pas créer de compte auth ici ; on passe le mentor en disciple plus bas si 0 disciple
          NULL;
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 14) Règle : tout mentor sans aucun disciple → role = 'disciple'
  UPDATE profils p
  SET role = 'disciple'
  WHERE p.role IN ('mentor', 'pilier')
    AND (SELECT COUNT(*) FROM profils q WHERE q.mentor_id = p.id) = 0;

  RAISE NOTICE 'Modifications disciples Alain SIL terminées.';
END;
$$;

-- Resynchroniser nb_disciples
UPDATE profils p
SET nb_disciples = COALESCE(
  (SELECT COUNT(*)::INTEGER FROM profils q WHERE q.mentor_id = p.id),
  0
)
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'profils' AND c.column_name = 'nb_disciples'
);

-- Alain SIL : nb_disciples = total famille
UPDATE profils p
SET nb_disciples = (SELECT COUNT(*)::INTEGER FROM profils q WHERE q.famille_id = f.id)
FROM familles_disciples f
WHERE f.superviseur_id = p.id
  AND (UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES') OR f.identifiant_famille = 'FAM001')
  AND UPPER(TRIM(p.last_name)) = 'SIL' AND UPPER(TRIM(p.first_name)) = 'ALAIN';

UPDATE familles_disciples f
SET nombre_disciples_actuels = (SELECT COUNT(*)::INTEGER FROM profils p WHERE p.famille_id = f.id)
WHERE UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES') OR f.identifiant_famille = 'FAM001';
