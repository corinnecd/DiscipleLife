-- ============================================
-- Seed : 7 disciples avec hiérarchie test
--
-- Structure :
-- Mentor (superviseur)
-- ├── D1 (2 disciples)
-- │   ├── D1a (2 disciples)
-- │   └── D1b (0 disciple)
-- ├── D2 (0 disciple)
-- ├── D3 (3 disciples)
-- │   ├── D3a (2 disciples)
-- │   ├── D3b (0 disciple)
-- │   └── D3c (1 disciple)
-- ├── D4 (1 disciple)
-- │   └── D4a (0 disciple)
-- ├── D5 (0 disciple)
-- ├── D6 (0 disciple)
-- └── D7 (0 disciple)
--
-- Total : 7 + 2 + 3 + 1 + (2+2+1) = 18 profils
-- Mot de passe : TestPassword123!
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION create_profil_7d(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role TEXT DEFAULT 'disciple',
  p_famille_id UUID DEFAULT NULL,
  p_mentor_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id UUID := gen_random_uuid();
  v_encrypted_pw TEXT;
BEGIN
  v_encrypted_pw := crypt('TestPassword123!', gen_salt('bf'));
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
    p_email, v_encrypted_pw, NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name),
    NOW(), NOW()
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (v_id, v_id, jsonb_build_object('sub', v_id::text, 'email', p_email), 'email', v_id::text, NOW(), NOW(), NOW());
  INSERT INTO public.profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
  VALUES (v_id, p_email, p_first_name, p_last_name, p_role, p_famille_id, p_mentor_id, NOW())
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
  v_mentor_id UUID;
  v_d1 UUID; v_d2 UUID; v_d3 UUID; v_d4 UUID; v_d5 UUID; v_d6 UUID; v_d7 UUID;
  v_d1a UUID; v_d1b UUID;
  v_d3a UUID; v_d3b UUID; v_d3c UUID;
  v_d4a UUID;
  v_d1a1 UUID; v_d1a2 UUID;
  v_d3a1 UUID; v_d3a2 UUID;
  v_d3c1 UUID;
BEGIN
  -- Famille Les Déterminés + Alain SIL superviseur
  SELECT f.id, f.superviseur_id INTO v_famille_id, v_mentor_id
  FROM familles_disciples f
  WHERE (UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES') OR f.identifiant_famille = 'FAM001')
  LIMIT 1;

  IF v_famille_id IS NULL OR v_mentor_id IS NULL THEN
    RAISE EXCEPTION 'Famille Les Déterminés ou superviseur introuvable.';
  END IF;

  -- 7 disciples directs (mentor_id = superviseur)
  v_d1 := create_profil_7d('test.7d.d1@test.icc.ga', 'Didier', 'MARTIN', 'mentor', v_famille_id, v_mentor_id);
  v_d2 := create_profil_7d('test.7d.d2@test.icc.ga', 'Élise', 'BERNARD', 'disciple', v_famille_id, v_mentor_id);
  v_d3 := create_profil_7d('test.7d.d3@test.icc.ga', 'Franck', 'DUBOIS', 'mentor', v_famille_id, v_mentor_id);
  v_d4 := create_profil_7d('test.7d.d4@test.icc.ga', 'Gaëlle', 'THOMAS', 'mentor', v_famille_id, v_mentor_id);
  v_d5 := create_profil_7d('test.7d.d5@test.icc.ga', 'Hugo', 'ROBERT', 'disciple', v_famille_id, v_mentor_id);
  v_d6 := create_profil_7d('test.7d.d6@test.icc.ga', 'Inès', 'RICHARD', 'disciple', v_famille_id, v_mentor_id);
  v_d7 := create_profil_7d('test.7d.d7@test.icc.ga', 'Jules', 'PETIT', 'disciple', v_famille_id, v_mentor_id);

  -- D1 a 2 disciples : D1a (2), D1b (0)
  v_d1a := create_profil_7d('test.7d.d1a@test.icc.ga', 'D1a', 'MARTIN', 'mentor', v_famille_id, v_d1);
  v_d1b := create_profil_7d('test.7d.d1b@test.icc.ga', 'D1b', 'MARTIN', 'disciple', v_famille_id, v_d1);
  v_d1a1 := create_profil_7d('test.7d.d1a1@test.icc.ga', 'D1a1', 'MARTIN', 'disciple', v_famille_id, v_d1a);
  v_d1a2 := create_profil_7d('test.7d.d1a2@test.icc.ga', 'D1a2', 'MARTIN', 'disciple', v_famille_id, v_d1a);

  -- D3 a 3 disciples : D3a (2), D3b (0), D3c (1)
  v_d3a := create_profil_7d('test.7d.d3a@test.icc.ga', 'D3a', 'DUBOIS', 'mentor', v_famille_id, v_d3);
  v_d3b := create_profil_7d('test.7d.d3b@test.icc.ga', 'D3b', 'DUBOIS', 'disciple', v_famille_id, v_d3);
  v_d3c := create_profil_7d('test.7d.d3c@test.icc.ga', 'D3c', 'DUBOIS', 'mentor', v_famille_id, v_d3);
  v_d3a1 := create_profil_7d('test.7d.d3a1@test.icc.ga', 'D3a1', 'DUBOIS', 'disciple', v_famille_id, v_d3a);
  v_d3a2 := create_profil_7d('test.7d.d3a2@test.icc.ga', 'D3a2', 'DUBOIS', 'disciple', v_famille_id, v_d3a);
  v_d3c1 := create_profil_7d('test.7d.d3c1@test.icc.ga', 'D3c1', 'DUBOIS', 'disciple', v_famille_id, v_d3c);

  -- D4 a 1 disciple : D4a (0)
  v_d4a := create_profil_7d('test.7d.d4a@test.icc.ga', 'D4a', 'THOMAS', 'disciple', v_famille_id, v_d4);

  RAISE NOTICE '7 disciples créés : D1(2), D2(0), D3(3), D4(1), D5(0), D6(0), D7(0).';
  RAISE NOTICE 'Sous-disciples : D1a(2), D1b(0) ; D3a(2), D3b(0), D3c(1) ; D4a(0).';
  RAISE NOTICE 'Total : 18 profils (7 + 2 + 3 + 1 + 5).';
END $$;

-- Resync nb_disciples
UPDATE profils p
SET nb_disciples = COALESCE((SELECT COUNT(*)::INTEGER FROM profils q WHERE q.mentor_id = p.id), 0)
WHERE EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = 'profils' AND c.column_name = 'nb_disciples');

-- Mettre à jour nombre_disciples_actuels sur la famille
UPDATE familles_disciples f
SET nombre_disciples_actuels = (SELECT COUNT(*)::INTEGER FROM profils p WHERE p.famille_id = f.id)
WHERE UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES') OR f.identifiant_famille = 'FAM001';

DROP FUNCTION IF EXISTS create_profil_7d(TEXT, TEXT, TEXT, TEXT, UUID, UUID);
