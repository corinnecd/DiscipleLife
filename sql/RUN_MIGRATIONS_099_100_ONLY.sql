-- ============================================
-- Migrations 099 et 100 uniquement
-- À exécuter dans Supabase → SQL Editor lorsque 090 à 098 sont déjà appliquées.
-- 099 : 5 mentors Les Glorieux (idempotent)
-- 100 : Rôle pilier + trigger disciple → mentor
-- ============================================

-- ========== 099_seed_5_mentors_les_glorieux.sql ==========
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
  v_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  -- Si l'email existe déjà dans auth.users, réutiliser cet utilisateur (idempotent)
  SELECT id INTO v_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_id IS NOT NULL THEN
    -- Mettre à jour le profil uniquement (auth.users inchangé)
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


-- ========== 100_role_pilier_trigger_mentor_auto.sql ==========
-- ============================================
-- Migration 100 : Rôle pilier + mise à jour automatique disciple → mentor
--
-- 1) Ajouter le rôle 'pilier' à profils (upgrade par le superviseur : mentor → pilier ou berger).
-- 2) Trigger : lorsqu'un disciple qui n'avait aucun disciple se voit attribuer au moins un
--    disciple (INSERT/UPDATE sur profils avec mentor_id), mettre à jour automatiquement
--    sa fiche : role = 'mentor'. Les KPI se recalculent via les RPC (COUNT sur profils).
-- ============================================

-- 1) Étendre la contrainte role pour inclure 'pilier'
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profils_role_check') THEN
    ALTER TABLE profils DROP CONSTRAINT profils_role_check;
  END IF;
  ALTER TABLE profils
  ADD CONSTRAINT profils_role_check
  CHECK (role IN ('super_admin', 'admin', 'pasteur', 'superviseur', 'mentor', 'pilier', 'disciple', 'tutore'));
END $$;

COMMENT ON COLUMN profils.role IS 'Rôle : tutore (tutoré), disciple, mentor, pilier (ou titre Berger), superviseur, pasteur.';

-- 2) Fonction trigger : après INSERT ou UPDATE sur profils (mentor_id renseigné),
--    si le mentor a pour rôle 'disciple' et a désormais au moins 1 disciple, le passer en 'mentor'.
CREATE OR REPLACE FUNCTION sync_mentor_role_on_first_disciple()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mentor_id UUID;
  v_count_disciples INT;
BEGIN
  v_mentor_id := COALESCE(NEW.mentor_id, (CASE WHEN TG_OP = 'UPDATE' THEN OLD.mentor_id END));
  IF v_mentor_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COUNT(*)::INT INTO v_count_disciples
  FROM profils
  WHERE mentor_id = v_mentor_id AND id <> v_mentor_id;

  IF v_count_disciples >= 1 THEN
    UPDATE profils
    SET role = 'mentor'
    WHERE id = v_mentor_id
      AND role = 'disciple';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_mentor_role_on_first_disciple_trigger ON profils;
CREATE TRIGGER sync_mentor_role_on_first_disciple_trigger
  AFTER INSERT OR UPDATE OF mentor_id ON profils
  FOR EACH ROW
  EXECUTE FUNCTION sync_mentor_role_on_first_disciple();

COMMENT ON FUNCTION sync_mentor_role_on_first_disciple() IS
'Passe automatiquement un profil de rôle disciple à mentor lorsqu''il obtient au moins un disciple (mentor_id). Migration 100.';
