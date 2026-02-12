-- ============================================
-- Étape 0 : Exécuter les migrations 092, 093, 075
-- À coller dans le SQL Editor Supabase puis Run.
-- Ordre : 092 → 093 → 075 (voir DONNEES_ET_MIGRATIONS_GUIDE.md)
--
-- Prérequis : tables profils et cercle_personnes doivent exister.
-- (cercle_personnes n'est pas créée par les migrations de ce repo ;
--  si elle est absente, exécuter uniquement les blocs 092 et 093 ci‑dessous.)
-- ============================================

-- ---------- 092 : date_entree_famille sur profils ----------
ALTER TABLE profils
ADD COLUMN IF NOT EXISTS date_entree_famille DATE;

COMMENT ON COLUMN profils.date_entree_famille IS 'Date d''entrée du disciple dans la famille (formulaire d''inscription).';

CREATE INDEX IF NOT EXISTS idx_profils_date_entree_famille ON profils(date_entree_famille)
WHERE date_entree_famille IS NOT NULL;

-- ---------- 093 : phone et ville_residence sur profils ----------
ALTER TABLE profils
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS ville_residence TEXT;

COMMENT ON COLUMN profils.phone IS 'Numéro de téléphone du membre (formulaire d''inscription).';
COMMENT ON COLUMN profils.ville_residence IS 'Ville de résidence du membre (formulaire d''inscription).';

CREATE INDEX IF NOT EXISTS idx_profils_phone ON profils(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profils_ville_residence ON profils(ville_residence) WHERE ville_residence IS NOT NULL;

-- ---------- 075 : Modèle cible — sync cercle_personnes → profils ----------
ALTER TABLE cercle_personnes
ADD COLUMN IF NOT EXISTS profil_id UUID REFERENCES profils(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cercle_personnes_profil_id ON cercle_personnes(profil_id);

COMMENT ON COLUMN cercle_personnes.profil_id IS 
'Profil consolidé dans profils. Renseigné automatiquement par le trigger sync_cercle_vers_profils.';

CREATE OR REPLACE FUNCTION sync_cercle_personnes_vers_profils()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profil_id UUID;
  v_famille_id UUID;
  v_email TEXT;
BEGIN
  SELECT famille_id INTO v_famille_id
  FROM profils WHERE id = NEW.user_id
  LIMIT 1;

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
      NEW.user_id,
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
        mentor_id  = NEW.user_id
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
        NEW.user_id,
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

DROP TRIGGER IF EXISTS sync_cercle_vers_profils_trigger ON cercle_personnes;
CREATE TRIGGER sync_cercle_vers_profils_trigger
  BEFORE INSERT OR UPDATE ON cercle_personnes
  FOR EACH ROW
  EXECUTE FUNCTION sync_cercle_personnes_vers_profils();

-- ============================================
-- Fin. Vérifier avec : sql/verification_migrations_092_093_075.sql
-- ============================================
