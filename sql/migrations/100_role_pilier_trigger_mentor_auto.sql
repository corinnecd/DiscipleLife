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
