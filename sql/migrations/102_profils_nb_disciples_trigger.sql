-- ============================================
-- Migration 102 : Nombre de disciples dans profils (nb_disciples)
-- Objectif: Stocker dans profils le nombre de disciples directs (mentor_id = ce profil)
--           pour cohérence tableau / fiche / arbre généalogique.
-- Suivi par = mentor (mentor_id) déjà en place ; affichage = nom du mentor.
-- ============================================

-- 1. Ajouter la colonne nb_disciples à profils (si elle n'existe pas)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profils' AND column_name = 'nb_disciples'
  ) THEN
    ALTER TABLE profils ADD COLUMN nb_disciples INTEGER NOT NULL DEFAULT 0;
    COMMENT ON COLUMN profils.nb_disciples IS 'Nombre de disciples directs (profils dont mentor_id = ce profil). Mise à jour automatique par trigger.';
  END IF;
END $$;

-- S'assurer que les valeurs NULL sont à 0 (colonne ajoutée ailleurs sans DEFAULT)
UPDATE profils SET nb_disciples = 0 WHERE nb_disciples IS NULL;

-- Désactiver temporairement les triggers profils <-> cercle_personnes pour éviter une boucle
-- (le sync initial ci-dessous met à jour toutes les lignes profils et déclencherait ces triggers en cascade)
ALTER TABLE profils DISABLE TRIGGER sync_profils_vers_cercle_trigger;
ALTER TABLE cercle_personnes DISABLE TRIGGER sync_cercle_vers_profils_trigger;

-- 2. Fonction trigger : maintenir nb_disciples à chaque INSERT/UPDATE/DELETE sur profils (mentor_id)
CREATE OR REPLACE FUNCTION profils_sync_nb_disciples()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.mentor_id IS NOT NULL THEN
      UPDATE profils SET nb_disciples = COALESCE(nb_disciples, 0) + 1 WHERE id = NEW.mentor_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.mentor_id IS DISTINCT FROM NEW.mentor_id THEN
      IF OLD.mentor_id IS NOT NULL THEN
        UPDATE profils SET nb_disciples = GREATEST(0, COALESCE(nb_disciples, 0) - 1) WHERE id = OLD.mentor_id;
      END IF;
      IF NEW.mentor_id IS NOT NULL THEN
        UPDATE profils SET nb_disciples = COALESCE(nb_disciples, 0) + 1 WHERE id = NEW.mentor_id;
      END IF;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.mentor_id IS NOT NULL THEN
      UPDATE profils SET nb_disciples = GREATEST(0, COALESCE(nb_disciples, 0) - 1) WHERE id = OLD.mentor_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS profils_sync_nb_disciples_trigger ON profils;
CREATE TRIGGER profils_sync_nb_disciples_trigger
  AFTER INSERT OR UPDATE OF mentor_id OR DELETE ON profils
  FOR EACH ROW
  EXECUTE FUNCTION profils_sync_nb_disciples();

-- 3. Synchronisation initiale : nb_disciples = COUNT(profils où mentor_id = id)
UPDATE profils p
SET nb_disciples = COALESCE(
  (SELECT COUNT(*)::INTEGER FROM profils q WHERE q.mentor_id = p.id),
  0
);

-- Réactiver les triggers profils <-> cercle_personnes
ALTER TABLE profils ENABLE TRIGGER sync_profils_vers_cercle_trigger;
ALTER TABLE cercle_personnes ENABLE TRIGGER sync_cercle_vers_profils_trigger;

COMMENT ON FUNCTION profils_sync_nb_disciples() IS
'Met à jour profils.nb_disciples quand un profil est inséré/modifié/supprimé avec mentor_id. Migration 102.';
