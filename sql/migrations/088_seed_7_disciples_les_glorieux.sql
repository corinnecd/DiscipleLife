-- ============================================
-- Migration 088 : Ajouter 7 disciples à la famille Les Glorieux (FAM012)
--
-- Parmi ces 7 : 5 sont mentors, 2 sont disciples.
-- 2 de ces 5 mentors ont eux-mêmes des disciples : 2 et 3 respectivement.
-- Crée les comptes auth + profils pour tous (7 + 2 + 3 = 12 personnes).
--
-- Comptes créés (mot de passe commun : TestPassword123!)
-- 7 dans Les Glorieux : glorieux.mentor1@fam012.icc.ga (Samuel NKOUROU), ... mentor2-5,
--   glorieux.disc1@fam012.icc.ga (Marie MBENZA), glorieux.disc2@fam012.icc.ga (Philippe NDINGA).
-- 5 sous-mentors : glorieux.mentor1.d1@fam012.icc.ga (David MOUKOKO), .d2 (Ruth MBOUMBA),
--   glorieux.mentor2.d1@fam012.icc.ga (Timothée NKOGHE), .d2 (Sarah LONGONI), .d3 (Paul MASSALA).
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fonction helper : crée auth.users + auth.identities + profils (comme 083)
CREATE OR REPLACE FUNCTION create_profil_088(
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
  -- 7 membres Les Glorieux (5 mentors, 2 disciples) — mentor_id = superviseur
  v_mentor1_id UUID;  -- aura 2 disciples
  v_mentor2_id UUID;  -- aura 3 disciples
  v_mentor3_id UUID;
  v_mentor4_id UUID;
  v_mentor5_id UUID;
  v_disc1_id UUID;
  v_disc2_id UUID;
  -- 5 disciples sous mentor1 et mentor2
  v_d1a UUID; v_d1b UUID;
  v_d2a UUID; v_d2b UUID; v_d2c UUID;
BEGIN
  SELECT id, superviseur_id INTO v_famille_id, v_superviseur_id
  FROM familles_disciples
  WHERE identifiant_famille = 'FAM012'
     OR UPPER(TRIM(nom)) = 'LES GLORIEUX'
  LIMIT 1;

  IF v_famille_id IS NULL OR v_superviseur_id IS NULL THEN
    RAISE EXCEPTION 'Famille Les Glorieux (FAM012) ou superviseur introuvable.';
  END IF;

  RAISE NOTICE 'Famille Les Glorieux: famille_id=%, superviseur_id=%', v_famille_id, v_superviseur_id;

  -- ----- 7 membres dans Les Glorieux (tous sous le superviseur) -----
  -- 5 mentors
  v_mentor1_id := create_profil_088('glorieux.mentor1@fam012.icc.ga', 'Samuel', 'NKOUROU', 'mentor', v_famille_id, v_superviseur_id);
  v_mentor2_id := create_profil_088('glorieux.mentor2@fam012.icc.ga', 'Rachel', 'MBOUMBA', 'mentor', v_famille_id, v_superviseur_id);
  v_mentor3_id := create_profil_088('glorieux.mentor3@fam012.icc.ga', 'Daniel', 'MOUANGA', 'mentor', v_famille_id, v_superviseur_id);
  v_mentor4_id := create_profil_088('glorieux.mentor4@fam012.icc.ga', 'Esther', 'NGOMA', 'mentor', v_famille_id, v_superviseur_id);
  v_mentor5_id := create_profil_088('glorieux.mentor5@fam012.icc.ga', 'Jonathan', 'OUENGA', 'mentor', v_famille_id, v_superviseur_id);
  -- 2 disciples
  v_disc1_id := create_profil_088('glorieux.disc1@fam012.icc.ga', 'Marie', 'MBENZA', 'disciple', v_famille_id, v_superviseur_id);
  v_disc2_id := create_profil_088('glorieux.disc2@fam012.icc.ga', 'Philippe', 'NDINGA', 'disciple', v_famille_id, v_superviseur_id);

  RAISE NOTICE '7 membres créés (5 mentors + 2 disciples).';

  -- ----- Mentor1 a 2 disciples -----
  v_d1a := create_profil_088('glorieux.mentor1.d1@fam012.icc.ga', 'David', 'MOUKOKO', 'disciple', v_famille_id, v_mentor1_id);
  v_d1b := create_profil_088('glorieux.mentor1.d2@fam012.icc.ga', 'Ruth', 'MBOUMBA', 'disciple', v_famille_id, v_mentor1_id);

  -- ----- Mentor2 a 3 disciples -----
  v_d2a := create_profil_088('glorieux.mentor2.d1@fam012.icc.ga', 'Timothée', 'NKOGHE', 'disciple', v_famille_id, v_mentor2_id);
  v_d2b := create_profil_088('glorieux.mentor2.d2@fam012.icc.ga', 'Sarah', 'LONGONI', 'disciple', v_famille_id, v_mentor2_id);
  v_d2c := create_profil_088('glorieux.mentor2.d3@fam012.icc.ga', 'Paul', 'MASSALA', 'disciple', v_famille_id, v_mentor2_id);

  RAISE NOTICE '5 disciples supplémentaires créés (2 sous Samuel NKOUROU, 3 sous Rachel MBOUMBA).';

  -- ----- Cercle du superviseur : ajouter les 5 mentors (les 2 disciples Marie et Philippe sont déjà ajoutés par le trigger 077) -----
  INSERT INTO cercle_personnes (user_id, name, first_name, last_name, email, circle_type, profil_id, created_at)
  SELECT v_superviseur_id, 'Samuel NKOUROU', 'Samuel', 'NKOUROU', 'glorieux.mentor1@fam012.icc.ga', 'Disciple', v_mentor1_id, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM cercle_personnes WHERE user_id = v_superviseur_id AND profil_id = v_mentor1_id);
  INSERT INTO cercle_personnes (user_id, name, first_name, last_name, email, circle_type, profil_id, created_at)
  SELECT v_superviseur_id, 'Rachel MBOUMBA', 'Rachel', 'MBOUMBA', 'glorieux.mentor2@fam012.icc.ga', 'Disciple', v_mentor2_id, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM cercle_personnes WHERE user_id = v_superviseur_id AND profil_id = v_mentor2_id);
  INSERT INTO cercle_personnes (user_id, name, first_name, last_name, email, circle_type, profil_id, created_at)
  SELECT v_superviseur_id, 'Daniel MOUANGA', 'Daniel', 'MOUANGA', 'glorieux.mentor3@fam012.icc.ga', 'Disciple', v_mentor3_id, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM cercle_personnes WHERE user_id = v_superviseur_id AND profil_id = v_mentor3_id);
  INSERT INTO cercle_personnes (user_id, name, first_name, last_name, email, circle_type, profil_id, created_at)
  SELECT v_superviseur_id, 'Esther NGOMA', 'Esther', 'NGOMA', 'glorieux.mentor4@fam012.icc.ga', 'Disciple', v_mentor4_id, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM cercle_personnes WHERE user_id = v_superviseur_id AND profil_id = v_mentor4_id);
  INSERT INTO cercle_personnes (user_id, name, first_name, last_name, email, circle_type, profil_id, created_at)
  SELECT v_superviseur_id, 'Jonathan OUENGA', 'Jonathan', 'OUENGA', 'glorieux.mentor5@fam012.icc.ga', 'Disciple', v_mentor5_id, NOW()
  WHERE NOT EXISTS (SELECT 1 FROM cercle_personnes WHERE user_id = v_superviseur_id AND profil_id = v_mentor5_id);

  RAISE NOTICE 'Entrées cercle_personnes (superviseur) ajoutées pour les 5 mentors.';

  -- Vérification : tous les profils @fam012.icc.ga doivent avoir famille_id = Les Glorieux
  UPDATE profils SET famille_id = v_famille_id WHERE email LIKE '%@fam012.icc.ga' AND (famille_id IS NULL OR famille_id <> v_famille_id);

  RAISE NOTICE 'Migration 088 terminée : 12 comptes créés pour Les Glorieux (7 + 5 sous-mentors).';
END $$;

-- Mettre à jour nombre_disciples_actuels pour Les Glorieux (décompte réel = 7 + 5 + ancien total)
UPDATE familles_disciples f
SET nombre_disciples_actuels = (SELECT COUNT(*)::INTEGER FROM profils p WHERE p.famille_id = f.id)
WHERE f.identifiant_famille = 'FAM012' OR UPPER(TRIM(f.nom)) = 'LES GLORIEUX';

DROP FUNCTION IF EXISTS create_profil_088(TEXT, TEXT, TEXT, TEXT, UUID, UUID);
