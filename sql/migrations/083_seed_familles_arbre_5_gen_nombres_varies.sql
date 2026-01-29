-- ============================================
-- Migration 083 : Seed familles avec nombres VARIÉS et arbre 5 générations
--
-- Remplace / complète le seed 074 pour :
-- - Nombres différents et aléatoires par famille (40 à 65 membres)
-- - 8 à 15 mentors par famille (disciples qui ont au moins 1 disciple)
-- - 5 générations (Superviseur → G1 → G2 → G3 → G4 → G5)
-- - Rôles Mentor / Disciple cohérents (mentor = a au moins 1 disciple)
--
-- Prérequis : profils.id référence auth.users(id). Chaque profil test est créé
-- avec un compte auth (auth.users + auth.identities) puis la ligne profils.
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ÉTAPE 0: NETTOYAGE (profils test + auth.users / auth.identities correspondants)
DO $$
DECLARE
  v_ids UUID[];
  v_count_presences INTEGER;
  v_count_prieres INTEGER;
  v_count_cercle INTEGER;
  v_count_identities INTEGER;
  v_count_auth INTEGER;
  v_count_profils INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 0: NETTOYAGE DES ANCIENNES DONNÉES DE TEST';
  RAISE NOTICE '========================================';

  SELECT ARRAY_AGG(id) INTO v_ids FROM profils WHERE email LIKE '%@test.icc.ga';
  IF v_ids IS NOT NULL AND array_length(v_ids, 1) > 0 THEN
    DELETE FROM attendance_tracking WHERE disciple_id = ANY(v_ids);
    GET DIAGNOSTICS v_count_presences = ROW_COUNT;
    DELETE FROM prayer_requests WHERE user_id = ANY(v_ids);
    GET DIAGNOSTICS v_count_prieres = ROW_COUNT;
    DELETE FROM cercle_personnes WHERE profil_id = ANY(v_ids);
    GET DIAGNOSTICS v_count_cercle = ROW_COUNT;
    DELETE FROM auth.identities WHERE user_id = ANY(v_ids);
    GET DIAGNOSTICS v_count_identities = ROW_COUNT;
    DELETE FROM auth.users WHERE id = ANY(v_ids);
    GET DIAGNOSTICS v_count_auth = ROW_COUNT;
    DELETE FROM profils WHERE id = ANY(v_ids);
    GET DIAGNOSTICS v_count_profils = ROW_COUNT;
    RAISE NOTICE 'Supprimé: % présences, % prières, % cercle, % identities, % auth.users, % profils', v_count_presences, v_count_prieres, v_count_cercle, v_count_identities, v_count_auth, v_count_profils;
  ELSE
    RAISE NOTICE 'Aucun profil @test.icc.ga à supprimer.';
  END IF;
END $$;

-- ÉTAPE 1: Vérification familles / superviseurs
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM familles_disciples WHERE superviseur_id IS NOT NULL) < 1 THEN
    RAISE EXCEPTION 'Aucune famille avec superviseur trouvée.';
  END IF;
END $$;

-- ÉTAPE 2: Fonction helper — crée auth.users + auth.identities + profils (contrainte FK profils.id → auth.users.id)
CREATE OR REPLACE FUNCTION create_test_profil_083(
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
  -- UPSERT : Supabase peut créer la ligne profils via un trigger sur auth.users ; on met à jour si elle existe
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

-- ÉTAPE 3: Table temporaire familles
DROP TABLE IF EXISTS temp_familles_083;
CREATE TEMP TABLE temp_familles_083 AS
SELECT fd.id AS famille_id, fd.nom AS famille_nom, fd.superviseur_id
FROM familles_disciples fd
WHERE fd.superviseur_id IS NOT NULL
ORDER BY fd.nom;

-- ÉTAPE 4: Création des disciples/mentors avec nombres VARIÉS et 5 générations
DO $$
DECLARE
  fr RECORD;
  superviseur_id_var UUID;
  famille_id_var UUID;
  nb_total INT;
  nb_mentors INT;
  idx_famille INT := 0;

  m1_id UUID; m2_id UUID; m3_id UUID; m4_id UUID; d5_id UUID;
  g1_mentor_id UUID;
  i INT;
  nb_g1_disciples INT;
  prenoms TEXT[] := ARRAY['Pierre','Sophie','André','Isabelle','Jacques','Luc','Alice','Martine','Joseph','Christine','Daniel','Sandrine','Éric','Valérie','Franck','Jean','David','Samuel','Julie','Claire','Paul','Sarah','Patrick','Marie','Thomas','Rebecca','Nadine','Boris','Melissa','Kevin','Steve','Patricia','Benoît'];
  noms TEXT[] := ARRAY['MARTIN','BERNARD','DUBOIS','MERCIER','PETIT','ROBERT','LAURENT','SIMON','MICHEL','LEFEVRE','GARCIA','ROUX','MOREL','FOURNIER','GIRARD','DUPONT','MOREAU','LAMBERT','FONTAINE','ROUSSEAU','VINCENT','CHEVALIER','BONNET','BLANC','MULLER','ROBIN','GIRAUD','ANDRE','HENRY','LOPEZ','SANCHEZ','MARTINEZ','DUPUIS'];
  p TEXT; n TEXT; idx_nom INT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ÉTAPE 4: CRÉATION PAR FAMILLE (nombres variés, 5 gen, 8-15 mentors)';
  RAISE NOTICE '========================================';

  FOR fr IN SELECT * FROM temp_familles_083 LOOP
    famille_id_var := fr.famille_id;
    superviseur_id_var := fr.superviseur_id;
    idx_famille := idx_famille + 1;

    nb_total := 40 + floor(random() * 26)::INT;
    nb_mentors := 8 + floor(random() * 8)::INT;

    -- Chaîne 5 générations (4 mentors + 1 disciple en G5)
    m1_id := create_test_profil_083('m1.' || idx_famille || '@test.icc.ga', 'Pierre', 'MARTIN', 'mentor', famille_id_var, superviseur_id_var);
    m2_id := create_test_profil_083('m2.' || idx_famille || '@test.icc.ga', 'Jean', 'DUPONT', 'mentor', famille_id_var, m1_id);
    m3_id := create_test_profil_083('m3.' || idx_famille || '@test.icc.ga', 'Thierry', 'RENARD', 'mentor', famille_id_var, m2_id);
    m4_id := create_test_profil_083('m4.' || idx_famille || '@test.icc.ga', 'Patricia', 'MARTINEZ', 'mentor', famille_id_var, m3_id);
    d5_id := create_test_profil_083('d5.' || idx_famille || '@test.icc.ga', 'Benoît', 'DUPUIS', 'disciple', famille_id_var, m4_id);

    -- (nb_mentors - 4) mentors G1 + 1 disciple G2 chacun
    FOR i IN 1 .. GREATEST(0, nb_mentors - 4) LOOP
      idx_nom := 1 + (idx_famille * 3 + i) % array_length(prenoms, 1);
      p := prenoms[idx_nom]; n := noms[idx_nom];
      g1_mentor_id := create_test_profil_083('g1m.' || idx_famille || '.' || i || '@test.icc.ga', p, n, 'mentor', famille_id_var, superviseur_id_var);
      idx_nom := 1 + (idx_famille * 5 + i * 2) % array_length(prenoms, 1);
      p := prenoms[idx_nom]; n := noms[idx_nom];
      PERFORM create_test_profil_083('g2d.' || idx_famille || '.' || i || '@test.icc.ga', p, n, 'disciple', famille_id_var, g1_mentor_id);
    END LOOP;

    -- G1 disciples (feuilles)
    nb_g1_disciples := GREATEST(0, nb_total - 5 - (GREATEST(0, nb_mentors - 4) * 2));
    FOR i IN 1 .. nb_g1_disciples LOOP
      idx_nom := 1 + (idx_famille * 7 + i) % array_length(prenoms, 1);
      p := prenoms[idx_nom]; n := noms[idx_nom];
      PERFORM create_test_profil_083('g1d.' || idx_famille || '.' || i || '@test.icc.ga', p, n, 'disciple', famille_id_var, superviseur_id_var);
    END LOOP;

    RAISE NOTICE 'Famille % (%): % membres, % mentors, 5 gen', fr.famille_nom, idx_famille, nb_total, nb_mentors;
  END LOOP;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Seed 083 terminé: % familles traitées', idx_famille;
  RAISE NOTICE '========================================';
END $$;

-- Nettoyage
DROP TABLE IF EXISTS temp_familles_083;
DROP FUNCTION IF EXISTS create_test_profil_083(TEXT, TEXT, TEXT, TEXT, UUID, UUID);
