-- ============================================
-- Migration 075b : Rendre mentor_id optionnel dans le trigger sync
-- À exécuter APRÈS 075_modele_cible_sync_cercle_vers_profils.sql
--
-- Problème : si user_id (mentor) dans cercle_personnes n'existe pas dans profils,
-- l'INSERT échoue (FK violation). On autorise mentor_id = NULL dans ce cas.
-- ============================================

CREATE OR REPLACE FUNCTION sync_cercle_personnes_vers_profils()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profil_id UUID;
  v_famille_id UUID;
  v_mentor_id UUID;  -- NULL si le mentor n'est pas dans profils
  v_email TEXT;
BEGIN
  -- Famille et mentor : le mentor (user_id) doit exister dans profils pour qu'on utilise son id
  SELECT famille_id, id INTO v_famille_id, v_mentor_id
  FROM profils WHERE id = NEW.user_id
  LIMIT 1;
  -- Si aucun profil trouvé pour NEW.user_id, v_mentor_id reste NULL (variable non initialisée = NULL)

  -- Email: priorité à la valeur cercle, sinon placeholder pour unicité
  v_email := COALESCE(NULLIF(TRIM(NEW.email), ''), 'cercle-' || gen_random_uuid()::text || '@placeholder.disciple.local');

  IF TG_OP = 'INSERT' THEN
    INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (
      gen_random_uuid(),
      v_email,
      COALESCE(NULLIF(TRIM(NEW.first_name), ''), 'Prénom'),
      COALESCE(NULLIF(TRIM(NEW.last_name), ''), 'Nom'),
      'disciple',
      v_famille_id,
      v_mentor_id,  -- NULL si mentor pas dans profils
      COALESCE(NEW.created_at, NOW())
    )
    RETURNING id INTO v_profil_id;
    NEW.profil_id := v_profil_id;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.profil_id IS NOT NULL THEN
      UPDATE profils
      SET
        first_name = COALESCE(NULLIF(TRIM(NEW.first_name), ''), first_name),
        last_name  = COALESCE(NULLIF(TRIM(NEW.last_name), ''), last_name),
        email      = CASE WHEN COALESCE(NULLIF(TRIM(NEW.email), ''), '') <> '' THEN TRIM(NEW.email) ELSE email END,
        famille_id = COALESCE(v_famille_id, famille_id),
        mentor_id  = COALESCE(v_mentor_id, mentor_id)
      WHERE id = NEW.profil_id;
      RETURN NEW;
    ELSE
      INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
      VALUES (
        gen_random_uuid(),
        v_email,
        COALESCE(NULLIF(TRIM(NEW.first_name), ''), 'Prénom'),
        COALESCE(NULLIF(TRIM(NEW.last_name), ''), 'Nom'),
        'disciple',
        v_famille_id,
        v_mentor_id,
        COALESCE(NEW.created_at, NOW())
      )
      RETURNING id INTO v_profil_id;
      NEW.profil_id := v_profil_id;
      RETURN NEW;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
