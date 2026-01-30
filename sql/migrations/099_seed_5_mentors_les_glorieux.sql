-- ============================================
-- Migration 099 : Ajouter 5 mentors à la famille LES GLORIEUX (FAM012)
--
-- Famille : LES GLORIEUX (FAM012)
-- Superviseur : HÉLÈNE LAMAGO
-- Ajoute 5 profils role=mentor, famille_id=FAM012, mentor_id=superviseur.
-- Comptes créés (mot de passe commun : TestPassword123!)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION create_profil_099(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role TEXT,
  p_famille_id UUID,
  p_mentor_id UUID
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
  v_superviseur_id UUID;
BEGIN
  SELECT id, superviseur_id INTO v_famille_id, v_superviseur_id
  FROM familles_disciples
  WHERE (identifiant_famille = 'FAM012' OR UPPER(TRIM(nom)) = 'LES GLORIEUX')
  LIMIT 1;

  IF v_famille_id IS NULL OR v_superviseur_id IS NULL THEN
    RAISE EXCEPTION 'Famille Les Glorieux (FAM012) ou superviseur introuvable.';
  END IF;

  -- 5 nouveaux mentors (source unique = profils, pas d'entrée cercle_personnes)
  PERFORM create_profil_099('glorieux.mentor6@fam012.icc.ga',  'Marc',    'OKANDZE',  'mentor', v_famille_id, v_superviseur_id);
  PERFORM create_profil_099('glorieux.mentor7@fam012.icc.ga',  'Lucie',   'BOUKALOU', 'mentor', v_famille_id, v_superviseur_id);
  PERFORM create_profil_099('glorieux.mentor8@fam012.icc.ga',  'Thomas',  'MBOUMBA',  'mentor', v_famille_id, v_superviseur_id);
  PERFORM create_profil_099('glorieux.mentor9@fam012.icc.ga',  'Anne',    'NKOGHE',   'mentor', v_famille_id, v_superviseur_id);
  PERFORM create_profil_099('glorieux.mentor10@fam012.icc.ga', 'Pierre',  'LONGONI',  'mentor', v_famille_id, v_superviseur_id);

  RAISE NOTICE 'Migration 099 : 5 mentors ajoutés à Les Glorieux (FAM012) : Marc OKANDZE, Lucie BOUKALOU, Thomas MBOUMBA, Anne NKOGHE, Pierre LONGONI.';
END $$;

-- Mise à jour du décompte famille si la colonne existe
UPDATE familles_disciples f
SET nombre_disciples_actuels = (SELECT COUNT(*)::INTEGER FROM profils p WHERE p.famille_id = f.id)
WHERE f.identifiant_famille = 'FAM012' OR UPPER(TRIM(f.nom)) = 'LES GLORIEUX';

DROP FUNCTION IF EXISTS create_profil_099(TEXT, TEXT, TEXT, TEXT, UUID, UUID);
