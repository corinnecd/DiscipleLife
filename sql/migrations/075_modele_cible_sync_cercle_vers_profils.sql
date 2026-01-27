-- ============================================
-- Migration: Modèle cible — Sync cercle_personnes → profils
-- Objectif: Toute donnée ajoutée dans cercle_personnes est automatiquement
--           mise à jour et consolidée dans profils (source de vérité).
-- Réf: MODELE_CIBLE_DONNEES.md
-- ============================================

-- Prérequis: les tables cercle_personnes et profils doivent exister.

-- 1. Lien cercle_personnes → profils
ALTER TABLE cercle_personnes
ADD COLUMN IF NOT EXISTS profil_id UUID REFERENCES profils(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cercle_personnes_profil_id ON cercle_personnes(profil_id);

COMMENT ON COLUMN cercle_personnes.profil_id IS 
'Profil consolidé dans profils. Renseigné automatiquement par le trigger sync_cercle_vers_profils.';

-- 2. Fonction trigger: créer ou mettre à jour le profil à chaque INSERT/UPDATE
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
  -- Déterminer famille_id depuis le mentor (user_id du cercle)
  SELECT famille_id INTO v_famille_id
  FROM profils WHERE id = NEW.user_id
  LIMIT 1;

  -- Email: priorité à la valeur cercle, sinon placeholder pour unicité
  v_email := COALESCE(NULLIF(TRIM(NEW.email), ''), 'cercle-' || gen_random_uuid()::text || '@placeholder.disciple.local');

  IF TG_OP = 'INSERT' THEN
    -- Créer un nouveau profil et lier
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
      -- Mettre à jour le profil existant
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
      -- Pas encore de profil: créer comme en INSERT
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

-- 3. Déclencher sur INSERT et UPDATE
DROP TRIGGER IF EXISTS sync_cercle_vers_profils_trigger ON cercle_personnes;
CREATE TRIGGER sync_cercle_vers_profils_trigger
  BEFORE INSERT OR UPDATE ON cercle_personnes
  FOR EACH ROW
  EXECUTE FUNCTION sync_cercle_personnes_vers_profils();

-- 4. (Optionnel) Backfill des lignes existantes sans profil_id
-- Décommenter et exécuter une fois si besoin de consolider les entrées déjà présentes:
/*
UPDATE cercle_personnes cp
SET profil_id = sub.id
FROM (
  INSERT INTO profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
  SELECT
    gen_random_uuid(),
    COALESCE(NULLIF(TRIM(c.email), ''), 'cercle-' || gen_random_uuid()::text || '@placeholder.disciple.local'),
    COALESCE(NULLIF(TRIM(c.first_name), ''), 'Prénom'),
    COALESCE(NULLIF(TRIM(c.last_name), ''), 'Nom'),
    'disciple',
    (SELECT famille_id FROM profils WHERE id = c.user_id LIMIT 1),
    c.user_id,
    COALESCE(c.created_at, NOW())
  FROM cercle_personnes c
  WHERE c.profil_id IS NULL
  RETURNING id, (SELECT id FROM cercle_personnes WHERE ... ) -- nécessite une logique par ligne
) sub
WHERE cp.profil_id IS NULL;
*/
-- Pour un backfill simple, privilégier un script dédié ou des UPDATE déclenchés ligne par ligne.
