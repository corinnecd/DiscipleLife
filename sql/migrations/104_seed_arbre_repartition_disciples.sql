-- ============================================
-- Migration 104 : Profils disciples selon répartition pour l'arbre généalogique
--
-- Répartition sur les profils "mentors" (ceux qui ont une famille et peuvent avoir des disciples) :
--   25 % → 0 disciple
--   10 % → 1 disciple
--   20 % → 2 à 5 disciples
--   40 % → 6 à 8 disciples
--   5 %  → 9 à 12 disciples
--
-- Crée auth.users + auth.identities + profils pour chaque disciple (FK profils.id → auth.users.id).
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Crée un profil disciple : si l'email existe déjà dans auth.users, met à jour profils ; sinon crée user + identities + profil.
CREATE OR REPLACE FUNCTION create_profil_arbre_104(
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
  -- Si l'email existe déjà dans auth.users, réutiliser cet utilisateur (idempotent)
  SELECT id INTO v_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_id IS NOT NULL THEN
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
  END IF;

  -- Sinon créer le compte auth + identities + profil
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
  M INT;
  p0 INT; p1 INT; p2_5 INT; p6_8 INT; p9_12 INT;
  rn INT := 0;
  nb INT;
  ment RECORD;
  i INT;
  prenoms TEXT[] := ARRAY['Pierre','Sophie','André','Isabelle','Jacques','Luc','Alice','Martine','Joseph','Christine','Daniel','Sandrine','Éric','Valérie','Franck','Jean','David','Samuel','Julie','Claire','Paul','Sarah','Patrick','Marie','Thomas','Rebecca','Nadine','Boris','Melissa','Kevin','Steve','Patricia','Benoît','Léa','Hugo','Emma','Nathan','Chloé','Lucas','Manon'];
  noms TEXT[] := ARRAY['MARTIN','BERNARD','DUBOIS','MERCIER','PETIT','ROBERT','LAURENT','SIMON','MICHEL','LEFEVRE','GARCIA','ROUX','MOREL','FOURNIER','GIRARD','DUPONT','MOREAU','LAMBERT','FONTAINE','ROUSSEAU','VINCENT','CHEVALIER','BONNET','BLANC','MULLER','ROBIN','GIRAUD','ANDRE','HENRY','LOPEZ','SANCHEZ','MARTINEZ','DUPUIS','FAURE','ROY','NOEL','GAUTHIER','PERRIN','COLIN'];
  idx_nom INT;
  p TEXT; n TEXT;
  email_disc TEXT;
BEGIN
  -- Charger les mentors dans une table temporaire pour ne pas garder de curseur sur profils
  -- (sinon ALTER TABLE profils échoue : "table is being used by active queries")
  DROP TABLE IF EXISTS mentors_104;
  CREATE TEMP TABLE mentors_104 AS
  SELECT id, famille_id,
         ROW_NUMBER() OVER (ORDER BY id) AS rn
  FROM profils
  WHERE famille_id IS NOT NULL
    AND id NOT IN (SELECT superviseur_id FROM familles_disciples WHERE superviseur_id IS NOT NULL);

  SELECT COUNT(*)::INT INTO M FROM mentors_104;

  IF M = 0 THEN
    RAISE NOTICE '104 : Aucun profil mentor (famille_id non null) trouvé. Rien à faire.';
    RETURN;
  END IF;

  -- Répartition : 25% → 0, 10% → 1, 20% → 2-5, 40% → 6-8, 5% → 9-12
  p0   := GREATEST(0, FLOOR(M * 0.25)::INT);
  p1   := GREATEST(0, FLOOR(M * 0.10)::INT);
  p2_5 := GREATEST(0, FLOOR(M * 0.20)::INT);
  p6_8 := GREATEST(0, FLOOR(M * 0.40)::INT);
  p9_12:= GREATEST(0, M - p0 - p1 - p2_5 - p6_8);

  RAISE NOTICE '104 : % mentors, répartition: 0 disc=%, 1=%, 2-5=%, 6-8=%, 9-12=%', M, p0, p1, p2_5, p6_8, p9_12;

  FOR ment IN SELECT * FROM mentors_104 ORDER BY id
  LOOP
    rn := ment.rn;
    IF rn <= p0 THEN
      nb := 0;
    ELSIF rn <= p0 + p1 THEN
      nb := 1;
    ELSIF rn <= p0 + p1 + p2_5 THEN
      nb := 2 + FLOOR(RANDOM() * 4)::INT;  -- 2 à 5
    ELSIF rn <= p0 + p1 + p2_5 + p6_8 THEN
      nb := 6 + FLOOR(RANDOM() * 3)::INT;  -- 6 à 8
    ELSE
      nb := 9 + FLOOR(RANDOM() * 4)::INT;  -- 9 à 12
    END IF;

    IF nb > 0 THEN
      FOR i IN 1 .. nb LOOP
        idx_nom := 1 + (ABS(ment.rn * 17 + i) % ARRAY_LENGTH(prenoms, 1));
        p := prenoms[idx_nom];
        idx_nom := 1 + (ABS(ment.rn * 31 + i + 50) % ARRAY_LENGTH(noms, 1));
        n := noms[idx_nom];
        email_disc := 'disciple.arbre.' || REPLACE(ment.id::TEXT, '-', '') || '.' || i || '@seed.disciple.local';

        PERFORM create_profil_arbre_104(email_disc, p, n, ment.famille_id, ment.id);
      END LOOP;
    END IF;
  END LOOP;

  RAISE NOTICE '104 : Seed arbre (répartition disciples) terminé.';
END;
$$;

-- Resynchroniser nb_disciples sur tous les profils (au cas où le trigger a été désactivé ailleurs)
UPDATE profils p
SET nb_disciples = COALESCE(
  (SELECT COUNT(*)::INTEGER FROM profils q WHERE q.mentor_id = p.id),
  0
)
WHERE EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = 'profils' AND c.column_name = 'nb_disciples');

DROP FUNCTION IF EXISTS create_profil_arbre_104(TEXT, TEXT, TEXT, UUID, UUID);
