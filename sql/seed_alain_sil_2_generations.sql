-- ============================================
-- Seed : 2 générations de disciples pour Alain SIL (Les Déterminés)
--
-- Cible (liste sous Alain) :
--   Christine LEFEVRE 5 (dont 2 ont chacun 2 disciples)
--   Boris ANDRE 4
--   Léa FOURNIER 4 (dont 1 a 3 disciples)
--   Melissa HENRY 3 (dont 2 ont chacun 1 disciple)
--   Steve SANCHEZ 1
--   Louis RENAUD 1
--   Patricia MARTINEZ 2
--   Gabriel LEFEVRE 0
--   Julie DUBOIS 2
--   Julien BOUCHER 0
--   Steve SANCHEZ 0
--   Kevin LOPEZ 5
--
-- Ce script :
-- 1) Identifie la famille Les Déterminés et les 12 disciples directs (par prénom/nom).
-- 2) Insère les profils de la 2e génération (sous Christine, Boris, Léa, Melissa, Steve, Louis, Patricia, Julie, Kevin).
-- 3) Insère la 3e génération (sous 2 disciples de Christine, 1 de Léa, 2 de Melissa).
-- 4) Met à jour nb_disciples sur Alain et resync tous les nb_disciples.
--
-- Les nouveaux profils sont créés avec compte auth (auth.users + auth.identities + profils)
-- pour respecter la FK profiles_id_fkey -> auth.users.
-- Mot de passe commun : TestPassword123!
-- Emails : test.gen2.xxx@test.icc.ga / test.gen3.xxx@test.icc.ga pour éviter doublons.
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crée auth.users + auth.identities + profils (id = user id) pour chaque disciple seed.
CREATE OR REPLACE FUNCTION create_profil_seed_2gen(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_famille_id UUID,
  p_mentor_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  -- Si l'email existe déjà, réutiliser l'utilisateur (idempotent)
  SELECT id INTO v_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_id IS NOT NULL THEN
    INSERT INTO public.profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (v_id, p_email, p_first_name, p_last_name, 'disciple', p_famille_id, p_mentor_id, NOW())
    ON CONFLICT (id) DO UPDATE SET
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      famille_id = EXCLUDED.famille_id,
      mentor_id = EXCLUDED.mentor_id;
    RETURN v_id;
  END IF;

  v_id := gen_random_uuid();
  v_encrypted_pw := crypt('TestPassword123!', gen_salt('bf'));
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_pw,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name),
    NOW(),
    NOW()
  );
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_id,
    v_id,
    jsonb_build_object('sub', v_id::text, 'email', p_email),
    'email',
    v_id::text,
    NOW(),
    NOW(),
    NOW()
  );
  -- Si la FK profils pointe vers public.users (et non auth.users), synchroniser public.users
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    INSERT INTO public.users (id)
    VALUES (v_id)
    ON CONFLICT (id) DO NOTHING;
  END IF;
  INSERT INTO public.profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
  VALUES (v_id, p_email, p_first_name, p_last_name, 'disciple', p_famille_id, p_mentor_id, NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    famille_id = EXCLUDED.famille_id,
    mentor_id = EXCLUDED.mentor_id;
  RETURN v_id;
END;
$$;

DO $$
DECLARE
  v_famille_id UUID;
  v_alain_id UUID;
  -- Ids des 12 disciples directs d'Alain (ordre : Christine, Boris, Léa, Melissa, Steve1, Louis, Patricia, Gabriel, Julie, Julien, Steve2, Kevin)
  v_christine_id UUID;
  v_boris_id UUID;
  v_lea_id UUID;
  v_melissa_id UUID;
  v_steve1_id UUID;
  v_louis_id UUID;
  v_patricia_id UUID;
  v_gabriel_id UUID;
  v_julie_id UUID;
  v_julien_id UUID;
  v_steve2_id UUID;
  v_kevin_id UUID;
  -- Ids créés gen2 (pour gen3)
  v_gen2_christine UUID[] := ARRAY[]::UUID[];
  v_gen2_lea UUID[] := ARRAY[]::UUID[];
  v_gen2_melissa UUID[] := ARRAY[]::UUID[];
  v_id UUID;
  i INT;
BEGIN
  -- 1. Famille Les Déterminés et superviseur Alain SIL
  SELECT f.id, f.superviseur_id INTO v_famille_id, v_alain_id
  FROM familles_disciples f
  WHERE (UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES') OR f.identifiant_famille = 'FAM001')
  LIMIT 1;

  IF v_famille_id IS NULL OR v_alain_id IS NULL THEN
    RAISE EXCEPTION 'Famille Les Déterminés ou superviseur Alain SIL introuvable.';
  END IF;

  -- 2. Résoudre les 12 par prénom/nom (famille = Les Déterminés ; peut être mentor_id = Alain ou déjà sous un mentor)
  SELECT id INTO v_christine_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'CHRISTINE' AND UPPER(TRIM(last_name)) = 'LEFEVRE' LIMIT 1;
  SELECT id INTO v_boris_id    FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'BORIS'    AND UPPER(TRIM(last_name)) = 'ANDRE' LIMIT 1;
  SELECT id INTO v_lea_id      FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'LÉA'      AND UPPER(TRIM(last_name)) = 'FOURNIER' LIMIT 1;
  IF v_lea_id IS NULL THEN
    SELECT id INTO v_lea_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'LEA' AND UPPER(TRIM(last_name)) = 'FOURNIER' LIMIT 1;
  END IF;
  SELECT id INTO v_melissa_id  FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'MELISSA'  AND UPPER(TRIM(last_name)) = 'HENRY' LIMIT 1;
  SELECT id INTO v_steve1_id   FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'STEVE'    AND UPPER(TRIM(last_name)) = 'SANCHEZ' ORDER BY id ASC LIMIT 1 OFFSET 0;
  SELECT id INTO v_louis_id    FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'LOUIS'    AND UPPER(TRIM(last_name)) = 'RENAUD' LIMIT 1;
  SELECT id INTO v_patricia_id FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'PATRICIA' AND UPPER(TRIM(last_name)) = 'MARTINEZ' LIMIT 1;
  SELECT id INTO v_gabriel_id  FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'GABRIEL'  AND UPPER(TRIM(last_name)) = 'LEFEVRE' LIMIT 1;
  SELECT id INTO v_julie_id    FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'JULIE'    AND UPPER(TRIM(last_name)) = 'DUBOIS' LIMIT 1;
  SELECT id INTO v_julien_id   FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'JULIEN'   AND UPPER(TRIM(last_name)) = 'BOUCHER' LIMIT 1;
  SELECT id INTO v_steve2_id   FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'STEVE'    AND UPPER(TRIM(last_name)) = 'SANCHEZ' ORDER BY id ASC LIMIT 1 OFFSET 1;
  SELECT id INTO v_kevin_id    FROM profils WHERE famille_id = v_famille_id AND UPPER(TRIM(first_name)) = 'KEVIN'    AND UPPER(TRIM(last_name)) = 'LOPEZ' LIMIT 1;

  IF v_christine_id IS NULL THEN RAISE EXCEPTION 'Christine LEFEVRE introuvable dans la famille.'; END IF;
  IF v_boris_id IS NULL THEN RAISE EXCEPTION 'Boris ANDRE introuvable.'; END IF;
  IF v_lea_id IS NULL THEN RAISE EXCEPTION 'Léa FOURNIER introuvable.'; END IF;
  IF v_melissa_id IS NULL THEN RAISE EXCEPTION 'Melissa HENRY introuvable.'; END IF;
  IF v_louis_id IS NULL THEN RAISE EXCEPTION 'Louis RENAUD introuvable.'; END IF;
  IF v_patricia_id IS NULL THEN RAISE EXCEPTION 'Patricia MARTINEZ introuvable.'; END IF;
  IF v_gabriel_id IS NULL THEN RAISE EXCEPTION 'Gabriel LEFEVRE introuvable.'; END IF;
  IF v_julie_id IS NULL THEN RAISE EXCEPTION 'Julie DUBOIS introuvable.'; END IF;
  IF v_julien_id IS NULL THEN RAISE EXCEPTION 'Julien BOUCHER introuvable.'; END IF;
  IF v_kevin_id IS NULL THEN RAISE EXCEPTION 'Kevin LOPEZ introuvable.'; END IF;

  -- S'assurer que les 12 sont bien disciples directs d'Alain (mentor_id = Alain) pour affichage "Liste des Disciples de Alain SIL"
  UPDATE profils SET mentor_id = v_alain_id WHERE id IN (
    v_christine_id, v_boris_id, v_lea_id, v_melissa_id, v_steve1_id, v_louis_id,
    v_patricia_id, v_gabriel_id, v_julie_id, v_julien_id, v_steve2_id, v_kevin_id
  );

  -- ---------- Génération 2 : disciples directs de Christine (5), Boris (4), Léa (4), Melissa (3), Steve (1), Louis (1), Patricia (2), Julie (2), Kevin (5) ----------
  FOR i IN 1..5 LOOP
    v_id := create_profil_seed_2gen('test.gen2.christine.' || i || '@test.icc.ga', 'Disciple', 'C' || i, v_famille_id, v_christine_id);
    v_gen2_christine := array_append(v_gen2_christine, v_id);
  END LOOP;
  FOR i IN 1..4 LOOP
    v_id := create_profil_seed_2gen('test.gen2.boris.' || i || '@test.icc.ga', 'Disciple', 'B' || i, v_famille_id, v_boris_id);
  END LOOP;
  FOR i IN 1..4 LOOP
    v_id := create_profil_seed_2gen('test.gen2.lea.' || i || '@test.icc.ga', 'Disciple', 'L' || i, v_famille_id, v_lea_id);
    v_gen2_lea := array_append(v_gen2_lea, v_id);
  END LOOP;
  FOR i IN 1..3 LOOP
    v_id := create_profil_seed_2gen('test.gen2.melissa.' || i || '@test.icc.ga', 'Disciple', 'M' || i, v_famille_id, v_melissa_id);
    v_gen2_melissa := array_append(v_gen2_melissa, v_id);
  END LOOP;
  IF v_steve1_id IS NOT NULL THEN
    v_id := create_profil_seed_2gen('test.gen2.steve1.1@test.icc.ga', 'Disciple', 'S1', v_famille_id, v_steve1_id);
  END IF;
  v_id := create_profil_seed_2gen('test.gen2.louis.1@test.icc.ga', 'Disciple', 'R1', v_famille_id, v_louis_id);
  FOR i IN 1..2 LOOP
    v_id := create_profil_seed_2gen('test.gen2.patricia.' || i || '@test.icc.ga', 'Disciple', 'P' || i, v_famille_id, v_patricia_id);
  END LOOP;
  FOR i IN 1..2 LOOP
    v_id := create_profil_seed_2gen('test.gen2.julie.' || i || '@test.icc.ga', 'Disciple', 'J' || i, v_famille_id, v_julie_id);
  END LOOP;
  FOR i IN 1..5 LOOP
    v_id := create_profil_seed_2gen('test.gen2.kevin.' || i || '@test.icc.ga', 'Disciple', 'K' || i, v_famille_id, v_kevin_id);
  END LOOP;

  -- ---------- Génération 3 : 2 disciples de Christine ont chacun 2 ; 1 de Léa a 3 ; 2 de Melissa ont chacun 1 ----------
  IF array_length(v_gen2_christine, 1) >= 2 THEN
    FOR i IN 1..2 LOOP
      v_id := create_profil_seed_2gen('test.gen3.christine.1.' || i || '@test.icc.ga', 'Disciple', 'C1-' || i, v_famille_id, v_gen2_christine[1]);
    END LOOP;
    FOR i IN 1..2 LOOP
      v_id := create_profil_seed_2gen('test.gen3.christine.2.' || i || '@test.icc.ga', 'Disciple', 'C2-' || i, v_famille_id, v_gen2_christine[2]);
    END LOOP;
  END IF;
  IF array_length(v_gen2_lea, 1) >= 1 THEN
    FOR i IN 1..3 LOOP
      v_id := create_profil_seed_2gen('test.gen3.lea.1.' || i || '@test.icc.ga', 'Disciple', 'L1-' || i, v_famille_id, v_gen2_lea[1]);
    END LOOP;
  END IF;
  IF array_length(v_gen2_melissa, 1) >= 2 THEN
    v_id := create_profil_seed_2gen('test.gen3.melissa.1.1@test.icc.ga', 'Disciple', 'M1-1', v_famille_id, v_gen2_melissa[1]);
    v_id := create_profil_seed_2gen('test.gen3.melissa.2.1@test.icc.ga', 'Disciple', 'M2-1', v_famille_id, v_gen2_melissa[2]);
  END IF;

  RAISE NOTICE 'Seed 2 générations : profils gen2 et gen3 insérés pour Les Déterminés.';
END;
$$;

-- Resynchroniser nb_disciples sur tous les profils (trigger 102 ou manuel)
UPDATE profils p
SET nb_disciples = COALESCE(
  (SELECT COUNT(*)::INTEGER FROM profils q WHERE q.mentor_id = p.id),
  0
)
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'profils' AND c.column_name = 'nb_disciples'
);

-- Aligner nb_disciples d'Alain sur le total de la famille (comme fix_alain_sil_nb_disciples.sql)
UPDATE profils p
SET nb_disciples = (
  SELECT COUNT(*)::INTEGER FROM profils q WHERE q.famille_id = f.id
)
FROM familles_disciples f
WHERE f.superviseur_id = p.id
  AND (UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES') OR f.identifiant_famille = 'FAM001')
  AND UPPER(TRIM(p.last_name)) = 'SIL' AND UPPER(TRIM(p.first_name)) = 'ALAIN';

-- Optionnel : nombre_disciples_actuels sur la famille
UPDATE familles_disciples f
SET nombre_disciples_actuels = (SELECT COUNT(*)::INTEGER FROM profils p WHERE p.famille_id = f.id)
WHERE UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES')
   OR f.identifiant_famille = 'FAM001';

-- Vérification (exécuter après le seed) : total famille + liste des 12 avec "Suit lui-même"
-- SELECT f.nom, p_sup.nb_disciples,
--   (SELECT COUNT(*) FROM profils q WHERE q.famille_id = f.id) AS total_membres
-- FROM familles_disciples f
-- JOIN profils p_sup ON p_sup.id = f.superviseur_id
-- WHERE f.identifiant_famille = 'FAM001';
-- SELECT pr.first_name, pr.last_name, (SELECT COUNT(*) FROM profils q WHERE q.mentor_id = pr.id) AS suit_lui_meme
-- FROM profils pr WHERE pr.mentor_id = (SELECT superviseur_id FROM familles_disciples WHERE identifiant_famille = 'FAM001' LIMIT 1)
-- ORDER BY pr.last_name, pr.first_name;
