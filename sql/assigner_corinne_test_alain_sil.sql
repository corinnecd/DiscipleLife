-- ============================================
-- Assigner Corinne TEST au superviseur Alain SIL
-- Met à jour mentor_id et famille_id
-- ============================================

DO $$
DECLARE
  v_alain_id UUID;
  v_famille_id UUID;
  v_corinne_id UUID;
  v_rows INT;
BEGIN
  -- Récupérer Alain SIL (superviseur) et sa famille (Les Déterminés)
  SELECT f.superviseur_id, f.id
  INTO v_alain_id, v_famille_id
  FROM familles_disciples f
  JOIN profils p ON p.id = f.superviseur_id
  WHERE UPPER(TRIM(p.first_name)) = 'ALAIN'
    AND UPPER(TRIM(p.last_name)) = 'SIL'
  LIMIT 1;

  IF v_alain_id IS NULL OR v_famille_id IS NULL THEN
    RAISE EXCEPTION 'Alain SIL ou sa famille (Les Déterminés) introuvable.';
  END IF;

  -- Mettre à jour Corinne TEST : mentor_id = Alain, famille_id = famille d'Alain
  UPDATE profils
  SET mentor_id = v_alain_id,
      famille_id = v_famille_id,
      updated_at = NOW()
  WHERE UPPER(TRIM(first_name)) = 'CORINNE'
    AND (UPPER(TRIM(last_name)) = 'TEST' OR UPPER(TRIM(last_name)) LIKE 'TEST%');

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RAISE NOTICE 'Aucun profil Corinne TEST trouvé.';
  ELSE
    RAISE NOTICE 'Corinne TEST assignée au superviseur Alain SIL (famille Les Déterminés).';
    RAISE NOTICE 'Lignes mises à jour : %', v_rows;
  END IF;
END $$;
