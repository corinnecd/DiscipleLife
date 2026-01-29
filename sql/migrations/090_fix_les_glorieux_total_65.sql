-- ============================================
-- Migration 090 : Corriger le total Les Glorieux pour atteindre 65 (53 + 12)
--
-- La migration 089 n'a pas suffi : il manque des rattachements.
-- Ce script :
-- 1) Rattache à Les Glorieux tous les profils @fam012.icc.ga (les 12 de la 088).
-- 2) Rattache tous les profils présents dans le cercle du superviseur (cercle_personnes, par profil_id).
-- 2b) Rattache par email les profils correspondant aux entrées cercle (même sans profil_id).
-- 3) Rattache les disciples directs du superviseur (mentor_id = superviseur Les Glorieux).
-- 4) Rattache tous les profils dont le mentor appartient à Les Glorieux (disciples des mentors).
-- 5) Resynchronise nombre_disciples_actuels avec le décompte réel.
--
-- À exécuter après 088 et 089. Vérifier le total avec la requête finale.
-- ============================================

DO $$
DECLARE
  v_famille_id UUID;
  v_superviseur_id UUID;
  v_count_after INT;
  v_updated INT;
BEGIN
  SELECT id, superviseur_id INTO v_famille_id, v_superviseur_id
  FROM familles_disciples
  WHERE identifiant_famille = 'FAM012' OR UPPER(TRIM(nom)) = 'LES GLORIEUX'
  LIMIT 1;

  IF v_famille_id IS NULL THEN
    RAISE EXCEPTION 'Famille Les Glorieux (FAM012) introuvable.';
  END IF;

  -- 1) Tous les profils créés par 088 (emails @fam012.icc.ga) → Les Glorieux
  UPDATE profils
  SET famille_id = v_famille_id
  WHERE email LIKE '%@fam012.icc.ga'
    AND (famille_id IS NULL OR famille_id <> v_famille_id);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '090 : % profils @fam012.icc.ga rattachés à Les Glorieux.', v_updated;

  -- 2) Tous les profils dans le cercle du superviseur (par profil_id) → Les Glorieux
  IF v_superviseur_id IS NOT NULL THEN
    UPDATE profils p
    SET famille_id = v_famille_id
    FROM cercle_personnes c
    WHERE c.user_id = v_superviseur_id
      AND c.profil_id = p.id
      AND (p.famille_id IS NULL OR p.famille_id <> v_famille_id);
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE '090 : % profils du cercle (profil_id) rattachés à Les Glorieux.', v_updated;

    -- 2b) Rattacher par email les profils correspondant aux entrées cercle (même sans profil_id)
    UPDATE profils p
    SET famille_id = v_famille_id
    FROM cercle_personnes c
    WHERE c.user_id = v_superviseur_id
      AND c.email IS NOT NULL
      AND TRIM(c.email) <> ''
      AND c.email = p.email
      AND (p.famille_id IS NULL OR p.famille_id <> v_famille_id);
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    RAISE NOTICE '090 : % profils du cercle (par email) rattachés à Les Glorieux.', v_updated;
  END IF;

  -- 3) Disciples directs du superviseur (mentor_id = superviseur Les Glorieux) → Les Glorieux
  UPDATE profils p
  SET famille_id = v_famille_id
  WHERE p.mentor_id = v_superviseur_id
    AND (p.famille_id IS NULL OR p.famille_id <> v_famille_id);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '090 : % profils (disciples directs du superviseur) rattachés à Les Glorieux.', v_updated;

  -- 4) Profils dont le mentor est déjà dans Les Glorieux (disciples des mentors) → Les Glorieux
  UPDATE profils p
  SET famille_id = v_famille_id
  WHERE p.mentor_id IN (SELECT id FROM profils WHERE famille_id = v_famille_id)
    AND (p.famille_id IS NULL OR p.famille_id <> v_famille_id);
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RAISE NOTICE '090 : % profils (disciples de mentors) rattachés à Les Glorieux.', v_updated;

  -- 5) Resynchroniser nombre_disciples_actuels pour Les Glorieux
  UPDATE familles_disciples f
  SET nombre_disciples_actuels = (SELECT COUNT(*)::INTEGER FROM profils p WHERE p.famille_id = f.id)
  WHERE f.id = v_famille_id;

  SELECT COUNT(*)::INT INTO v_count_after FROM profils WHERE famille_id = v_famille_id;
  RAISE NOTICE '090 : Total profils Les Glorieux après correction = % (attendu : 65).', v_count_after;
END $$;

-- Vérification : afficher le total pour Les Glorieux
SELECT f.identifiant_famille, f.nom, f.nombre_disciples_actuels AS total_membres, f.objectif_disciples
FROM familles_disciples f
WHERE f.identifiant_famille = 'FAM012' OR UPPER(TRIM(f.nom)) = 'LES GLORIEUX';

-- Diagnostic : nombre de profils @fam012.icc.ga (doit être 12 si la 088 a tout créé)
SELECT COUNT(*) AS nb_profils_fam012_email
FROM profils
WHERE email LIKE '%@fam012.icc.ga';
