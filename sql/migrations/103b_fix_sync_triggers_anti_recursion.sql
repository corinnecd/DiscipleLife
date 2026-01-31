-- ============================================
-- Migration 103b : Sync profils ↔ cercle_personnes — profils = seule source
-- À exécuter AVANT 104_seed_arbre_repartition_disciples (seed).
--
-- Règle métier : la seule source des données est la table profils.
-- Donc : profils → cercle_personnes (synchro active), cercle_personnes → profils (désactivée).
--
-- 1) sync_cercle_personnes_vers_profils : ne plus jamais écrire dans profils (no-op).
-- 2) sync_profils_vers_cercle_personnes : conserve la synchro profils → cercle, sans garde
--    anti-récursion (plus de boucle puisque cercle ne touche plus à profils).
-- ============================================

-- 1) sync_cercle_personnes_vers_profils : no-op — profils est la seule source, on ne met jamais à jour profils depuis cercle
CREATE OR REPLACE FUNCTION sync_cercle_personnes_vers_profils()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Profils = seule source : on ne crée ni ne met à jour profils depuis cercle_personnes.
  RETURN NEW;
END;
$$;

-- 2) sync_profils_vers_cercle_personnes : profils → cercle (seule synchro active)
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
  IF NEW.role IS DISTINCT FROM 'disciple' OR NEW.mentor_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_name := TRIM(COALESCE(NEW.first_name, '') || ' ' || COALESCE(NEW.last_name, ''));
  IF v_name = '' THEN
    v_name := COALESCE(NEW.email, 'Disciple');
  END IF;

  IF TG_OP = 'INSERT' THEN
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

COMMENT ON FUNCTION sync_cercle_personnes_vers_profils() IS
'No-op : profils est la seule source ; on ne met jamais à jour profils depuis cercle_personnes.';
COMMENT ON FUNCTION sync_profils_vers_cercle_personnes() IS
'Sync profils → cercle_personnes (seule synchro active ; source des données = profils).';
