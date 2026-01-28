-- ============================================
-- Migration 077 : Sync profils → cercle_personnes (consolidation bidirectionnelle)
--
-- Règle : à chaque INSERT ou UPDATE sur profils (role = disciple, mentor_id non null),
-- créer ou mettre à jour la ligne correspondante dans cercle_personnes pour que le
-- disciple apparaisse dans le cercle de son mentor.
--
-- Cercle → Profils : déjà assuré par le trigger sync_cercle_personnes_vers_profils (075).
-- Profils → Cercle : ce script.
-- ============================================

CREATE OR REPLACE FUNCTION sync_profils_vers_cercle_personnes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_existing RECORD;
BEGIN
  -- Uniquement pour les disciples ayant un mentor (ils appartiennent au cercle du mentor)
  IF NEW.role IS DISTINCT FROM 'disciple' OR NEW.mentor_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_name := TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  IF v_name = '' THEN
    v_name := COALESCE(NEW.email, 'Disciple');
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Créer une entrée dans le cercle du mentor
    INSERT INTO cercle_personnes (user_id, name, first_name, last_name, email, circle_type, profil_id, created_at)
    VALUES (
      NEW.mentor_id,
      v_name,
      COALESCE(NULLIF(TRIM(NEW.first_name), ''), 'Prénom'),
      COALESCE(NULLIF(TRIM(NEW.last_name), ''), 'Nom'),
      NEW.email,
      'Disciple',
      NEW.id,
      COALESCE(NEW.created_at, NOW())
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Éviter boucle : ne mettre à jour cercle que si les données ont vraiment changé
    SELECT id, first_name, last_name, email INTO v_existing
    FROM cercle_personnes
    WHERE profil_id = NEW.id
    LIMIT 1;

    IF v_existing.id IS NOT NULL AND (
      v_existing.first_name IS DISTINCT FROM COALESCE(NULLIF(TRIM(NEW.first_name), ''), 'Prénom')
      OR v_existing.last_name IS DISTINCT FROM COALESCE(NULLIF(TRIM(NEW.last_name), ''), 'Nom')
      OR v_existing.email IS DISTINCT FROM NEW.email
    ) THEN
      UPDATE cercle_personnes
      SET
        name = v_name,
        first_name = COALESCE(NULLIF(TRIM(NEW.first_name), ''), 'Prénom'),
        last_name  = COALESCE(NULLIF(TRIM(NEW.last_name), ''), 'Nom'),
        email     = NEW.email,
        user_id   = COALESCE(NEW.mentor_id, user_id)
      WHERE profil_id = NEW.id;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profils_vers_cercle_trigger ON profils;
CREATE TRIGGER sync_profils_vers_cercle_trigger
  AFTER INSERT OR UPDATE ON profils
  FOR EACH ROW
  WHEN (
    NEW.role = 'disciple'
    AND NEW.mentor_id IS NOT NULL
  )
  EXECUTE FUNCTION sync_profils_vers_cercle_personnes();

COMMENT ON FUNCTION sync_profils_vers_cercle_personnes() IS
'Consolidation profils → cercle_personnes : à chaque ajout/modification d''un profil disciple avec mentor_id, crée ou met à jour l''entrée correspondante dans le cercle du mentor.';
