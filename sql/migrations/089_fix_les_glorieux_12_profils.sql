-- ============================================
-- Migration 089 : Corriger le total Les Glorieux (7 + 5 = 12 nouveaux)
--
-- Si le total n'a augmenté que de 5 au lieu de 12 :
-- 1) Rattacher à Les Glorieux tous les profils créés par 088 (email @fam012.icc.ga).
-- 2) Resynchroniser nombre_disciples_actuels avec le vrai décompte.
--
-- Le total affiché doit être : ancien (ex. 53) + 7 (membres directs) + 5 (disciples des 2 mentors) = 65.
-- À exécuter après 088. Vérifier que les RPC 084, 085, 086 sont appliquées pour que
-- l'interface utilise le décompte par profils (famille_id).
-- ============================================

DO $$
DECLARE
  v_famille_id UUID;
  v_count_before INT;
  v_count_after INT;
  v_updated INT;
BEGIN
  SELECT id INTO v_famille_id
  FROM familles_disciples
  WHERE identifiant_famille = 'FAM012' OR UPPER(TRIM(nom)) = 'LES GLORIEUX'
  LIMIT 1;

  IF v_famille_id IS NULL THEN
    RAISE EXCEPTION 'Famille Les Glorieux (FAM012) introuvable.';
  END IF;

  SELECT COUNT(*)::INT INTO v_count_before FROM profils WHERE famille_id = v_famille_id;

  -- Rattacher à Les Glorieux tous les profils créés par 088 (emails @fam012.icc.ga)
  UPDATE profils
  SET famille_id = v_famille_id
  WHERE email LIKE '%@fam012.icc.ga'
    AND (famille_id IS DISTINCT FROM v_famille_id);
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  SELECT COUNT(*)::INT INTO v_count_after FROM profils WHERE famille_id = v_famille_id;

  RAISE NOTICE 'Migration 089 : % profils @fam012.icc.ga rattachés à Les Glorieux. Total avant=%, après=%', v_updated, v_count_before, v_count_after;
END $$;

-- Resynchroniser nombre_disciples_actuels pour Les Glorieux
UPDATE familles_disciples f
SET nombre_disciples_actuels = (SELECT COUNT(*)::INTEGER FROM profils p WHERE p.famille_id = f.id)
WHERE f.identifiant_famille = 'FAM012' OR UPPER(TRIM(f.nom)) = 'LES GLORIEUX';

-- Vérification : afficher le nouveau total pour Les Glorieux (attendu : 65 si 12 ont été ajoutés)
SELECT f.identifiant_famille, f.nom, f.nombre_disciples_actuels AS total_membres, f.objectif_disciples
FROM familles_disciples f
WHERE f.identifiant_famille = 'FAM012' OR UPPER(TRIM(f.nom)) = 'LES GLORIEUX';
