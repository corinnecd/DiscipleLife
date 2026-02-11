-- ============================================
-- Supprimer 25 disciples qui n'ont aucun disciple (feuilles de l'arbre)
-- Famille : Les Déterminés (Alain SIL). Le superviseur n'est pas touché.
-- Ordre FK : auth.identities → profils → auth.users
-- ============================================

DO $$
DECLARE
  v_famille_id UUID;
  v_superviseur_id UUID;
  ids_suppr UUID[];
BEGIN
  SELECT f.id, f.superviseur_id INTO v_famille_id, v_superviseur_id
  FROM familles_disciples f
  WHERE (UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES') OR f.identifiant_famille = 'FAM001')
  LIMIT 1;

  IF v_famille_id IS NULL THEN
    RAISE EXCEPTION 'Famille Les Déterminés introuvable.';
  END IF;

  -- 25 profils : famille = Les Déterminés, pas le superviseur, et aucun disciple sous eux
  SELECT array_agg(id) INTO ids_suppr
  FROM (
    SELECT p.id
    FROM profils p
    WHERE p.famille_id = v_famille_id
      AND p.id != v_superviseur_id
      AND (SELECT COUNT(*) FROM profils q WHERE q.mentor_id = p.id) = 0
    ORDER BY p.id
    LIMIT 25
  ) t;

  IF ids_suppr IS NOT NULL AND array_length(ids_suppr, 1) > 0 THEN
    -- Cercle : annuler parent_disciple_id qui pointe vers des lignes qu'on va supprimer (FK cercle_personnes_parent_disciple_id_fkey).
    UPDATE public.cercle_personnes
    SET parent_disciple_id = NULL
    WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr));
    -- Puis supprimer les lignes cercle_personnes qui pointent vers ces profils
    -- (évite le trigger sync_cercle_vers_profils qui tenterait un INSERT profils → FK users).
    DELETE FROM public.cercle_personnes WHERE profil_id = ANY(ids_suppr);
    DELETE FROM auth.identities WHERE user_id = ANY(ids_suppr);
    DELETE FROM public.profils WHERE id = ANY(ids_suppr);
    DELETE FROM auth.users WHERE id = ANY(ids_suppr);
    RAISE NOTICE 'Supprimé % disciple(s) sans disciple.', array_length(ids_suppr, 1);
  ELSE
    RAISE NOTICE 'Aucun disciple sans disciple à supprimer (ou moins de 25).';
  END IF;
END;
$$;

-- Resynchroniser nb_disciples et total famille
UPDATE profils p
SET nb_disciples = COALESCE(
  (SELECT COUNT(*)::INTEGER FROM profils q WHERE q.mentor_id = p.id),
  0
)
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'profils' AND c.column_name = 'nb_disciples'
);

UPDATE profils p
SET nb_disciples = (SELECT COUNT(*)::INTEGER FROM profils q WHERE q.famille_id = f.id)
FROM familles_disciples f
WHERE f.superviseur_id = p.id
  AND (UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES') OR f.identifiant_famille = 'FAM001')
  AND UPPER(TRIM(p.last_name)) = 'SIL' AND UPPER(TRIM(p.first_name)) = 'ALAIN';

UPDATE familles_disciples f
SET nombre_disciples_actuels = (SELECT COUNT(*)::INTEGER FROM profils p WHERE p.famille_id = f.id)
WHERE UPPER(TRIM(f.nom)) IN ('LES DÉTERMINÉS', 'LES DETERMINES') OR f.identifiant_famille = 'FAM001';
