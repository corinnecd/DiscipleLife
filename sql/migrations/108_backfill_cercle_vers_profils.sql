-- ============================================
-- Migration 108 : Backfill cercle_personnes → profils
--
-- Crée un profil pour chaque entrée cercle_personnes sans profil_id
-- UNIQUEMENT lorsque l'email existe dans auth.users (contrainte FK profiles_id_fkey).
-- Les lignes cercle dont l'email n'a pas de compte Auth restent sans profil_id.
--
-- Prérequis :
-- - 075_modele_cible_sync_cercle_vers_profils.sql (colonne profil_id + trigger)
-- - Optionnel : 097 (colonnes circle_type, visible_to_others sur profils)
--
-- À exécuter dans Supabase → SQL Editor (une seule fois).
-- ============================================

DO $$
DECLARE
  r RECORD;
  v_auth_user_id UUID;
  v_famille_id UUID;
  v_email TEXT;
  v_created INT := 0;
  v_skipped INT := 0;
BEGIN
  FOR r IN
    SELECT id, user_id, first_name, last_name, email, circle_type, created_at
    FROM cercle_personnes
    WHERE profil_id IS NULL AND NULLIF(TRIM(email), '') IS NOT NULL
    ORDER BY created_at NULLS LAST, id
  LOOP
    v_email := TRIM(r.email);

    -- Profil uniquement si un compte Auth existe avec cet email (contrainte FK)
    SELECT id INTO v_auth_user_id
    FROM auth.users
    WHERE email = v_email
    LIMIT 1;

    IF v_auth_user_id IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Famille du mentor (user_id = mentor/superviseur)
    SELECT famille_id INTO v_famille_id
    FROM profils
    WHERE id = r.user_id
    LIMIT 1;

    -- Créer le profil avec id = auth user id (obligatoire pour la FK)
    INSERT INTO profils (
      id,
      email,
      first_name,
      last_name,
      role,
      famille_id,
      mentor_id,
      created_at
    )
    VALUES (
      v_auth_user_id,
      v_email,
      COALESCE(NULLIF(TRIM(r.first_name), ''), 'Prénom'),
      COALESCE(NULLIF(TRIM(r.last_name), ''), 'Nom'),
      'disciple',
      v_famille_id,
      r.user_id,
      COALESCE(r.created_at, NOW())
    )
    ON CONFLICT (id) DO UPDATE SET
      first_name = COALESCE(NULLIF(TRIM(r.first_name), ''), profils.first_name),
      last_name  = COALESCE(NULLIF(TRIM(r.last_name), ''), profils.last_name),
      email      = EXCLUDED.email,
      famille_id = COALESCE(EXCLUDED.famille_id, profils.famille_id),
      mentor_id  = COALESCE(EXCLUDED.mentor_id, profils.mentor_id);

    -- Lier cercle_personnes à ce profil
    UPDATE cercle_personnes
    SET profil_id = v_auth_user_id
    WHERE id = r.id;

    v_created := v_created + 1;
  END LOOP;

  SELECT COUNT(*) INTO v_skipped FROM cercle_personnes WHERE profil_id IS NULL;

  RAISE NOTICE 'Backfill 108 terminé : % profil(s) créé(s) ou mis à jour (email dans auth.users). Lignes cercle sans profil_id restantes : % (emails sans compte Auth).', v_created, v_skipped;
END;
$$;

-- Copier circle_type vers profils si la colonne existe (migration 097)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profils' AND column_name = 'circle_type'
  ) THEN
    UPDATE profils p
    SET circle_type = c.circle_type
    FROM cercle_personnes c
    WHERE c.profil_id = p.id AND NULLIF(TRIM(c.circle_type), '') IS NOT NULL;
    RAISE NOTICE '108 : circle_type copié de cercle_personnes vers profils.';
  END IF;
END;
$$;

-- Vérification
SELECT
  (SELECT COUNT(*) FROM cercle_personnes WHERE profil_id IS NOT NULL) AS cercle_avec_profil,
  (SELECT COUNT(*) FROM cercle_personnes WHERE profil_id IS NULL)    AS cercle_sans_profil,
  (SELECT COUNT(*) FROM cercle_personnes)                             AS total_cercle;
