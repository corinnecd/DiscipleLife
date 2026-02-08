-- ============================================
-- Migration 111 : Forcer les 12 superviseurs de DR MODE (PASTEUR-001) pour l'arbre généalogique
-- Objectif : Garantir que profils.pasteur_id ET familles_disciples.pasteur_id pointent vers
--            PASTEUR-001 pour les 12 superviseurs listés (répartition officielle 062).
--            À exécuter après 109/110 si l'arbre n'affiche qu'un seul superviseur sous DR MODE.
-- ============================================

-- 1. Récupérer l'id de DR MODE (PASTEUR-001)
DO $$
DECLARE
  v_pasteur_001_id UUID;
  v_count_sup INT;
  v_count_fam INT;
BEGIN
  SELECT id INTO v_pasteur_001_id
  FROM profils
  WHERE role = 'pasteur'
    AND (identifiant_unique = 'PASTEUR-001' OR (UPPER(TRIM(last_name)) = 'MODE' AND UPPER(TRIM(first_name)) LIKE '%DR%'))
  LIMIT 1;

  IF v_pasteur_001_id IS NULL THEN
    RAISE EXCEPTION 'Migration 111 : PASTEUR-001 (DR MODE) introuvable. Exécutez d''abord les migrations pasteurs (049, 107).';
  END IF;

  -- 2. Affecter les 12 superviseurs à DR MODE (liste officielle = 062_FINAL)
  UPDATE profils
  SET pasteur_id = v_pasteur_001_id,
      updated_at = COALESCE(updated_at, NOW())
  WHERE role = 'superviseur'
    AND (
      (LOWER(TRIM(first_name)) LIKE '%betsaleel%' AND LOWER(TRIM(last_name)) LIKE '%badila%') OR
      (LOWER(TRIM(first_name)) LIKE '%coco%' AND LOWER(TRIM(last_name)) LIKE '%okanzi%') OR
      (LOWER(TRIM(first_name)) LIKE '%elisabeth%' AND LOWER(TRIM(last_name)) LIKE '%amecy%') OR
      (LOWER(TRIM(first_name)) LIKE '%ephrem%' AND LOWER(TRIM(last_name)) LIKE '%mba%') OR
      ((LOWER(TRIM(first_name)) LIKE '%helene%' OR LOWER(TRIM(first_name)) LIKE '%hélène%') AND LOWER(TRIM(last_name)) LIKE '%lamago%') OR
      (LOWER(TRIM(first_name)) LIKE '%karine%' AND LOWER(TRIM(last_name)) LIKE '%william%') OR
      ((LOWER(TRIM(first_name)) LIKE '%kevin%' OR LOWER(TRIM(first_name)) LIKE '%kévin%') AND (LOWER(TRIM(last_name)) LIKE '%thea%' OR LOWER(TRIM(last_name)) LIKE '%théa%')) OR
      (LOWER(TRIM(first_name)) LIKE '%laetitia%' AND LOWER(TRIM(last_name)) LIKE '%obame%') OR
      (LOWER(TRIM(first_name)) LIKE '%manicia%' AND (LOWER(TRIM(last_name)) LIKE '%thea%' OR LOWER(TRIM(last_name)) LIKE '%théa%')) OR
      ((LOWER(TRIM(first_name)) LIKE '%nasdene%' OR LOWER(TRIM(first_name)) LIKE '%nasdène%') AND LOWER(TRIM(last_name)) LIKE '%kodia%') OR
      (LOWER(TRIM(first_name)) LIKE '%rochelle%' AND LOWER(TRIM(last_name)) LIKE '%passi%') OR
      (LOWER(TRIM(first_name)) LIKE '%yvan%' AND LOWER(TRIM(last_name)) LIKE '%dessande%')
    );

  GET DIAGNOSTICS v_count_sup = ROW_COUNT;

  -- 3. Mettre à jour les familles de ces superviseurs : pasteur_id = DR MODE
  UPDATE familles_disciples f
  SET pasteur_id = v_pasteur_001_id
  FROM profils p
  WHERE p.id = f.superviseur_id
    AND p.role = 'superviseur'
    AND p.pasteur_id = v_pasteur_001_id
    AND (f.pasteur_id IS DISTINCT FROM v_pasteur_001_id);

  GET DIAGNOSTICS v_count_fam = ROW_COUNT;

  RAISE NOTICE 'Migration 111 : % superviseur(s) affecté(s) à DR MODE, % famille(s) mise(s) à jour.', v_count_sup, v_count_fam;
END $$;

-- 4. Vérification : nombre de superviseurs sous PASTEUR-001 (doit être 12)
SELECT
  p.identifiant_unique AS pasteur,
  p.first_name || ' ' || p.last_name AS pasteur_nom,
  COUNT(s.id)::INT AS nombre_superviseurs_directs,
  STRING_AGG(s.first_name || ' ' || s.last_name, ', ' ORDER BY s.first_name) AS liste_superviseurs
FROM profils p
LEFT JOIN profils s ON s.pasteur_id = p.id AND s.role = 'superviseur'
WHERE p.role = 'pasteur'
  AND p.identifiant_unique = 'PASTEUR-001'
GROUP BY p.id, p.identifiant_unique, p.first_name, p.last_name;
