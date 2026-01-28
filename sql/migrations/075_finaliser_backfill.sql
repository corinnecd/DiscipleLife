-- ============================================
-- Finaliser la migration 075 : trigger 075b + backfill + vérification
-- À exécuter dans Supabase → SQL Editor (tout le fichier en une fois, ou par blocs).
-- Prérequis : la migration 075_modele_cible_sync_cercle_vers_profils.sql a déjà été exécutée.
--
-- IMPORTANT : profils.id doit exister dans auth.users (FK). On ne crée un profil que si
-- l'email du cercle correspond à un utilisateur Auth ; sinon profil_id reste NULL.
-- ============================================

-- ----- ÉTAPE A : Trigger (profil uniquement si compte Auth existant) -----
CREATE OR REPLACE FUNCTION sync_cercle_personnes_vers_profils()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_profil_id UUID;
  v_famille_id UUID;
  v_mentor_id UUID;
  v_email TEXT;
  v_auth_user_id UUID;  -- id dans auth.users (obligatoire pour insérer dans profils)
BEGIN
  SELECT famille_id, id INTO v_famille_id, v_mentor_id
  FROM public.profils WHERE id = NEW.user_id
  LIMIT 1;

  v_email := COALESCE(NULLIF(TRIM(NEW.email), ''), '');

  IF TG_OP = 'INSERT' THEN
    -- Créer un profil seulement si un compte Auth existe avec cet email
    IF v_email <> '' THEN
      SELECT id INTO v_auth_user_id FROM auth.users WHERE email = v_email LIMIT 1;
    END IF;
    IF v_auth_user_id IS NOT NULL THEN
      INSERT INTO public.profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
      VALUES (
        v_auth_user_id,
        v_email,
        COALESCE(NULLIF(TRIM(NEW.first_name), ''), 'Prénom'),
        COALESCE(NULLIF(TRIM(NEW.last_name), ''), 'Nom'),
        'disciple',
        v_famille_id,
        v_mentor_id,
        COALESCE(NEW.created_at, NOW())
      )
      ON CONFLICT (id) DO UPDATE SET
        first_name = COALESCE(NULLIF(TRIM(NEW.first_name), ''), profils.first_name),
        last_name  = COALESCE(NULLIF(TRIM(NEW.last_name), ''), profils.last_name),
        email      = EXCLUDED.email,
        famille_id = COALESCE(v_famille_id, profils.famille_id),
        mentor_id  = COALESCE(v_mentor_id, profils.mentor_id);
      NEW.profil_id := v_auth_user_id;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.profil_id IS NOT NULL THEN
      UPDATE public.profils
      SET
        first_name = COALESCE(NULLIF(TRIM(NEW.first_name), ''), first_name),
        last_name  = COALESCE(NULLIF(TRIM(NEW.last_name), ''), last_name),
        email      = CASE WHEN COALESCE(NULLIF(TRIM(NEW.email), ''), '') <> '' THEN TRIM(NEW.email) ELSE email END,
        famille_id = COALESCE(v_famille_id, famille_id),
        mentor_id  = COALESCE(v_mentor_id, mentor_id)
      WHERE id = NEW.profil_id;
      RETURN NEW;
    ELSE
      -- Pas encore de profil : créer seulement si compte Auth existe avec cet email
      IF v_email <> '' THEN
        SELECT id INTO v_auth_user_id FROM auth.users WHERE email = v_email LIMIT 1;
      END IF;
      IF v_auth_user_id IS NOT NULL THEN
        INSERT INTO public.profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
        VALUES (
          v_auth_user_id,
          v_email,
          COALESCE(NULLIF(TRIM(NEW.first_name), ''), 'Prénom'),
          COALESCE(NULLIF(TRIM(NEW.last_name), ''), 'Nom'),
          'disciple',
          v_famille_id,
          v_mentor_id,
          COALESCE(NEW.created_at, NOW())
        )
        ON CONFLICT (id) DO UPDATE SET
          first_name = COALESCE(NULLIF(TRIM(NEW.first_name), ''), profils.first_name),
          last_name  = COALESCE(NULLIF(TRIM(NEW.last_name), ''), profils.last_name),
          email      = EXCLUDED.email,
          famille_id = COALESCE(v_famille_id, profils.famille_id),
          mentor_id  = COALESCE(v_mentor_id, profils.mentor_id);
        NEW.profil_id := v_auth_user_id;
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ----- ÉTAPE B : Backfill (remplir profil_id pour les lignes existantes) -----
UPDATE cercle_personnes
SET last_name = last_name
WHERE profil_id IS NULL;

-- ----- ÉTAPE C : Vérification -----
SELECT 'Lignes avec profil_id' AS indicateur, COUNT(*) AS nombre
FROM cercle_personnes WHERE profil_id IS NOT NULL
UNION ALL
SELECT 'Lignes sans profil_id', COUNT(*)
FROM cercle_personnes WHERE profil_id IS NULL;
