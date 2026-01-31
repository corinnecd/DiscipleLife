-- Fichier généré par scripts/run_migrations_090_100.js
-- À exécuter dans Supabase → SQL Editor (tout en une fois ou par bloc).

-- ========== 090_fix_les_glorieux_total_65.sql ==========
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


-- ========== 091_rpc_nombre_profils_hybride_max_profils_ou_cercle.sql ==========
-- ============================================
-- Migration 091 : RPC nombre de membres par familles (hybride profils + cercle)
--
-- Problème : pour Les Glorieux, seuls 12 profils ont famille_id (les nouveaux).
-- Les 53 "anciens" membres sont uniquement dans cercle_personnes (superviseur).
-- La RPC get_nombre_profils_par_familles ne comptait que les profils → affichait 12.
--
-- Solution : retourner pour chaque famille le MAX entre :
--   - COUNT(profils WHERE famille_id = f.id)
--   - COUNT(cercle_personnes WHERE user_id = f.superviseur_id)
-- Ainsi Les Glorieux affiche 65 (cercle du superviseur) tant que les profils
-- ne sont pas tous rattachés par famille_id.
-- ============================================

CREATE OR REPLACE FUNCTION get_nombre_profils_par_familles(p_famille_ids UUID[])
RETURNS TABLE (
  famille_id UUID,
  nb_profils BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH
  nb_profils_table AS (
    SELECT f.id, COUNT(p.id)::BIGINT AS cnt
    FROM familles_disciples f
    LEFT JOIN profils p ON p.famille_id = f.id
    WHERE f.id = ANY(p_famille_ids)
    GROUP BY f.id
  ),
  nb_cercle AS (
    SELECT f.id, COUNT(cp.id)::BIGINT AS cnt
    FROM familles_disciples f
    LEFT JOIN cercle_personnes cp ON cp.user_id = f.superviseur_id
    WHERE f.id = ANY(p_famille_ids)
    GROUP BY f.id
  )
  SELECT
    np.id AS famille_id,
    GREATEST(COALESCE(np.cnt, 0), COALESCE(nc.cnt, 0))::BIGINT AS nb_profils
  FROM nb_profils_table np
  LEFT JOIN nb_cercle nc ON nc.id = np.id;
$$;

COMMENT ON FUNCTION get_nombre_profils_par_familles(UUID[]) IS
'Retourne pour chaque famille le max(profils avec famille_id, cercle du superviseur). Corrige affichage 12→65 pour Les Glorieux. SECURITY DEFINER.';


-- ========== 092_add_date_entree_famille_profils.sql ==========
-- ============================================
-- Migration 092 : Ajouter date_entree_famille à profils
--
-- La colonne est utilisée par SignupDisciple et FamillesDisciples mais
-- absente du schéma actuel. À exécuter pour aligner la base avec l'app.
-- ============================================

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS date_entree_famille DATE;

COMMENT ON COLUMN profils.date_entree_famille IS 'Date d''entrée du disciple dans la famille (formulaire d''inscription).';

CREATE INDEX IF NOT EXISTS idx_profils_date_entree_famille ON profils(date_entree_famille)
WHERE date_entree_famille IS NOT NULL;


-- ========== 093_add_phone_ville_residence_profils.sql ==========
-- ============================================
-- Migration 093 : Ajouter phone et ville_residence à profils
--
-- Utilisés par le formulaire d'inscription (numéro de téléphone, ville de résidence).
-- ============================================

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS phone TEXT;

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS ville_residence TEXT;

COMMENT ON COLUMN profils.phone IS 'Numéro de téléphone du membre (formulaire d''inscription).';
COMMENT ON COLUMN profils.ville_residence IS 'Ville de résidence du membre (formulaire d''inscription).';

CREATE INDEX IF NOT EXISTS idx_profils_phone ON profils(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profils_ville_residence ON profils(ville_residence) WHERE ville_residence IS NOT NULL;


-- ========== 094_rpc_superviseur_dashboard_phase2.sql ==========
-- ============================================
-- Migration 094 : RPC agrégée Dashboard Superviseur (Phase 2)
--
-- Retourne en un seul appel : membres (profils + cercle), stats, progressions,
-- nombre de disciples par membre, KPI formations/vidéos, suivi_par.
-- Réduit les ~15+ appels du frontend à 1 seul.
-- SECURITY DEFINER pour contourner RLS si nécessaire.
-- ============================================

CREATE OR REPLACE FUNCTION get_superviseur_dashboard_phase2(p_user_id UUID, p_famille_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_objectif BIGINT := 70;
  v_membres JSONB := '[]'::JSONB;
  v_stats JSONB;
  v_progression_map JSONB := '{}'::JSONB;
  v_disciples_count_map JSONB := '{}'::JSONB;
  v_kpi_summary JSONB := '{}'::JSONB;
  v_suivi_par_map JSONB := '{}'::JSONB;
  v_suivi_profils JSONB;
  v_superviseur_nom TEXT := '';
  v_nombre_membres INT := 0;
  v_membre_ids UUID[];
  v_formation_term INT := 0;
  v_formation_encours INT := 0;
  v_videos_term INT := 0;
BEGIN
  -- 0. Nom du superviseur (pour suivi_par des membres issus de profils)
  SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_superviseur_nom
  FROM profils WHERE id = p_user_id;

  -- 1. Objectif famille
  SELECT COALESCE(NULLIF(f.objectif_disciples, 0), 70) INTO v_objectif
  FROM familles_disciples f WHERE f.id = p_famille_id;

  -- 2. Membres : profils (famille_id) + cercle_personnes (user_id), dédupliqués
  WITH
  profils_m AS (
    SELECT p.id, p.first_name, p.last_name, p.email, p.avatar_url, p.created_at, p.role,
           'profils' AS source, NULL::UUID AS parent_disciple_id
    FROM profils p
    WHERE p.famille_id = p_famille_id AND p.id <> p_user_id
  ),
  cercle_m AS (
    SELECT c.id, c.first_name, c.last_name, c.email, c.avatar_url,
           COALESCE(c.start_date, c.created_at) AS created_at,
           'disciple'::TEXT AS role, 'cercle_personnes' AS source,
           c.parent_disciple_id, c.user_id
    FROM cercle_personnes c
    WHERE c.user_id = p_user_id
  ),
  merged AS (
    SELECT * FROM profils_m
    UNION ALL
    SELECT cm.id, cm.first_name, cm.last_name, cm.email, cm.avatar_url, cm.created_at,
           cm.role, cm.source, cm.parent_disciple_id
    FROM cercle_m cm
    WHERE NOT EXISTS (SELECT 1 FROM profils_m pm WHERE pm.id = cm.id)
  )
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', m.id,
      'first_name', m.first_name,
      'last_name', m.last_name,
      'email', m.email,
      'avatar_url', m.avatar_url,
      'created_at', m.created_at,
      'role', COALESCE(m.role, 'disciple'),
      'source', m.source,
      'statut_spirituel', 'actif',
      'parent_disciple_id', m.parent_disciple_id
    ) ORDER BY m.created_at DESC NULLS LAST
  ), '[]'::JSONB) INTO v_membres
  FROM merged m;

  SELECT COALESCE(array_agg((elem->>'id')::UUID), ARRAY[]::UUID[])
  INTO v_membre_ids
  FROM jsonb_array_elements(v_membres) AS elem;

  v_nombre_membres := jsonb_array_length(v_membres);

  -- 3. Stats
  v_stats := jsonb_build_object(
    'nombreMembres', v_nombre_membres,
    'objectif', v_objectif,
    'progression', CASE WHEN v_nombre_membres > 0 THEN LEAST(100, (v_nombre_membres::NUMERIC / v_objectif) * 100) ELSE 0 END,
    'reste', GREATEST(v_objectif - v_nombre_membres, 0)
  );

  IF v_membre_ids IS NULL OR array_length(v_membre_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'membres', v_membres,
      'stats', v_stats,
      'membres_progression', v_progression_map,
      'membres_disciples_count', v_disciples_count_map,
      'kpi_summary', v_kpi_summary,
      'membres_suivi_par', v_suivi_par_map
    );
  END IF;

  -- 4. Progressions (formations + vidéos) par user_id
  WITH prog AS (
    SELECT upp.user_id, COUNT(*) FILTER (WHERE ump.est_complete) AS formations
    FROM user_parcours_progression upp
    JOIN user_module_progression ump ON ump.progression_id = upp.id
    WHERE upp.user_id = ANY(v_membre_ids)
    GROUP BY upp.user_id
  ),
  vid AS (
    SELECT vp.disciple_id AS user_id, COUNT(*) AS videos
    FROM video_progress vp
    WHERE vp.disciple_id = ANY(v_membre_ids) AND (vp.is_completed = true)
    GROUP BY vp.disciple_id
  )
  SELECT jsonb_object_agg(
    mid.id::TEXT,
    jsonb_build_object(
      'formations', COALESCE(p.formations, 0),
      'videos', COALESCE(v.videos, 0),
      'total', COALESCE(p.formations, 0) + COALESCE(v.videos, 0)
    )
  ) INTO v_progression_map
  FROM (SELECT unnest(v_membre_ids) AS id) mid
  LEFT JOIN prog p ON p.user_id = mid.id
  LEFT JOIN vid v ON v.user_id = mid.id;

  -- 5. KPI global formations / vidéos
  SELECT
    COALESCE(SUM(1) FILTER (WHERE ump.est_complete), 0),
    COALESCE(SUM(1) FILTER (WHERE NOT ump.est_complete), 0),
    (SELECT COUNT(*) FROM video_progress vp WHERE vp.disciple_id = ANY(v_membre_ids) AND vp.is_completed = true)
  INTO v_formation_term, v_formation_encours, v_videos_term
  FROM user_parcours_progression upp
  JOIN user_module_progression ump ON ump.progression_id = upp.id
  WHERE upp.user_id = ANY(v_membre_ids);

  v_kpi_summary := jsonb_build_object(
    'formationsTerminees', v_formation_term,
    'formationsEnCours', v_formation_encours,
    'videosTerminees', v_videos_term
  );

  -- 6. Nombre de disciples par membre (cercle_personnes user_id = membre)
  WITH direct AS (
    SELECT user_id, COUNT(*) AS cnt
    FROM cercle_personnes
    WHERE user_id = ANY(v_membre_ids)
    GROUP BY user_id
  )
  SELECT COALESCE(jsonb_object_agg(d.user_id::TEXT, d.cnt), '{}'::JSONB) INTO v_disciples_count_map FROM direct d;

  -- Compléter avec 0 pour tous les membres
  SELECT jsonb_object_agg(elem->>'id', COALESCE((v_disciples_count_map->>(elem->>'id'))::INT, 0))
  INTO v_disciples_count_map
  FROM jsonb_array_elements(v_membres) AS elem;

  -- 7. Suivi par : pour chaque membre dans cercle, résoudre user_id ou parent_disciple_id -> nom
  WITH cercle_ids AS (
    SELECT id, user_id, parent_disciple_id FROM cercle_personnes WHERE id = ANY(v_membre_ids)
  ),
  refs AS (
    SELECT c.id AS membre_id,
           COALESCE(c.user_id, c.parent_disciple_id) AS ref_id,
           CASE WHEN c.user_id IS NOT NULL THEN 'profils' ELSE 'cercle' END AS ref_type
    FROM cercle_ids c
  )
  SELECT COALESCE(jsonb_object_agg(
    r.membre_id::TEXT,
    jsonb_build_object(
      'id', COALESCE(pr.id, cp.id),
      'name', TRIM(COALESCE(pr.first_name || ' ' || pr.last_name, cp.first_name || ' ' || cp.last_name, ''))
    )
  ), '{}'::JSONB) INTO v_suivi_par_map
  FROM refs r
  LEFT JOIN profils pr ON pr.id = r.ref_id AND r.ref_type = 'profils'
  LEFT JOIN cercle_personnes cp ON cp.id = r.ref_id AND r.ref_type = 'cercle';

  -- Suivi par = superviseur pour les membres issus de profils uniquement
  SELECT COALESCE(jsonb_object_agg(elem->>'id', jsonb_build_object('id', p_user_id, 'name', v_superviseur_nom)), '{}'::JSONB)
  INTO v_suivi_profils
  FROM jsonb_array_elements(v_membres) AS elem
  WHERE elem->>'source' = 'profils';
  v_suivi_par_map := v_suivi_par_map || COALESCE(v_suivi_profils, '{}'::JSONB);

  RETURN jsonb_build_object(
    'membres', v_membres,
    'stats', v_stats,
    'membres_progression', COALESCE(v_progression_map, '{}'::JSONB),
    'membres_disciples_count', COALESCE(v_disciples_count_map, '{}'::JSONB),
    'kpi_summary', v_kpi_summary,
    'membres_suivi_par', COALESCE(v_suivi_par_map, '{}'::JSONB)
  );
END;
$$;

COMMENT ON FUNCTION get_superviseur_dashboard_phase2(UUID, UUID) IS
'Retourne en un appel les données Phase 2 du dashboard superviseur : membres (profils+cercle), stats, progressions, disciples count, KPI formations/vidéos, suivi_par. Réduit les appels frontend.';


-- ========== 095_rpc_superviseur_dashboard_phase2_extra.sql ==========
-- ============================================
-- Migration 095 : RPC agrégée Dashboard Superviseur (Phase 2 Extra)
--
-- Retourne en un seul appel : rapports du superviseur, autres superviseurs de la famille (même pasteur),
-- et nombre de membres par superviseur. Réduit ~5 round-trips à 1.
-- §9.1 Étape 3 – Regrouper les requêtes SuperviseurDashboard.
-- ============================================

CREATE OR REPLACE FUNCTION get_superviseur_dashboard_phase2_extra(
  p_user_id UUID,
  p_pasteur_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_rapports JSONB := '[]'::JSONB;
  v_superviseurs JSONB := '[]'::JSONB;
  v_nombre_membres JSONB := '{}'::JSONB;
  v_superviseur_ids UUID[];
BEGIN
  -- 1. Rapports du superviseur (pour historique et graphiques)
  SELECT COALESCE(jsonb_agg(r ORDER BY r.created_at ASC), '[]'::JSONB)
  INTO v_rapports
  FROM reports r
  WHERE r.user_id = p_user_id;

  -- 2. Si pas de pasteur, retourner seulement les rapports
  IF p_pasteur_id IS NULL THEN
    RETURN jsonb_build_object(
      'rapports', v_rapports,
      'superviseurs_famille', v_superviseurs,
      'nombre_membres_par_superviseur', v_nombre_membres
    );
  END IF;

  -- 3. Autres superviseurs (même pasteur, exclure l'actuel)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'email', p.email,
      'avatar_url', p.avatar_url
    ) ORDER BY p.first_name
  ), '[]'::JSONB)
  INTO v_superviseurs
  FROM profils p
  WHERE p.pasteur_id = p_pasteur_id
    AND p.role = 'superviseur'
    AND p.id <> p_user_id;

  SELECT COALESCE(array_agg((elem->>'id')::UUID), ARRAY[]::UUID[])
  INTO v_superviseur_ids
  FROM jsonb_array_elements(v_superviseurs) AS elem;

  IF v_superviseur_ids IS NULL OR array_length(v_superviseur_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'rapports', v_rapports,
      'superviseurs_famille', v_superviseurs,
      'nombre_membres_par_superviseur', v_nombre_membres
    );
  END IF;

  -- 4. Nombre de membres par superviseur (profils dans famille + cercle_personnes user_id)
  WITH counts_profils AS (
    SELECT fd.superviseur_id, COUNT(p.id) AS cnt
    FROM familles_disciples fd
    LEFT JOIN profils p ON p.famille_id = fd.id AND p.id <> fd.superviseur_id
    WHERE fd.superviseur_id = ANY(v_superviseur_ids)
    GROUP BY fd.superviseur_id
  ),
  counts_cercle AS (
    SELECT cp.user_id AS superviseur_id, COUNT(cp.id) AS cnt
    FROM cercle_personnes cp
    WHERE cp.user_id = ANY(v_superviseur_ids)
    GROUP BY cp.user_id
  )
  SELECT COALESCE(jsonb_object_agg(sid::TEXT, (COALESCE(cp.cnt, 0) + COALESCE(cc.cnt, 0))), '{}'::JSONB)
  INTO v_nombre_membres
  FROM unnest(v_superviseur_ids) AS sid
  LEFT JOIN counts_profils cp ON cp.superviseur_id = sid
  LEFT JOIN counts_cercle cc ON cc.superviseur_id = sid;

  RETURN jsonb_build_object(
    'rapports', COALESCE(v_rapports, '[]'::JSONB),
    'superviseurs_famille', COALESCE(v_superviseurs, '[]'::JSONB),
    'nombre_membres_par_superviseur', COALESCE(v_nombre_membres, '{}'::JSONB)
  );
END;
$$;

COMMENT ON FUNCTION get_superviseur_dashboard_phase2_extra(UUID, UUID) IS
'Retourne rapports du superviseur, autres superviseurs (même pasteur) et nombre de membres par superviseur. Réduit les appels Phase 2.';


-- ========== 096_rpc_effectifs_100_profils_sans_cercle.sql ==========
-- ============================================
-- Migration 096 : RPC effectifs / KPI 100 % profils (aucune source cercles)
--
-- Demande : aucune donnée ne doit plus être récupérée dans cercles.
-- Effectifs par famille (repli) = profils (famille_id).
--
-- Ce script remplace l'usage de cercle_personnes par profils dans :
-- - get_kpi_familles_pour_pasteur (effectifs par famille)
-- - get_progression_par_famille_pasteur (barres de progression)
-- - get_mentors_avec_disciples_pasteur (nombre disciples = profils.mentor_id)
-- - get_nombre_profils_par_familles (effectifs par famille, plus d'hybride cercle)
-- - get_nombre_disciples_par_familles (page Familles de Disciples)
-- ============================================

-- 1) KPI familles pour pasteur : effectifs = COUNT(profils WHERE famille_id = f.id)
CREATE OR REPLACE FUNCTION get_kpi_familles_pour_pasteur(p_pasteur_id UUID)
RETURNS TABLE (
  total_disciples BIGINT,
  total_familles BIGINT,
  objectif_total BIGINT,
  familles_objectif_atteint BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH
  superviseurs_du_pasteur AS (
    SELECT p.id FROM profils p
    WHERE p.role = 'superviseur' AND p.pasteur_id = p_pasteur_id
  ),
  nb_profils_par_famille AS (
    SELECT f.id, f.superviseur_id,
           COALESCE(f.objectif_disciples, 70)::BIGINT AS objectif,
           (SELECT COUNT(*)::BIGINT FROM profils p WHERE p.famille_id = f.id) AS nb_profils
    FROM familles_disciples f
    WHERE f.superviseur_id IN (SELECT id FROM superviseurs_du_pasteur)
  )
  SELECT
    COALESCE(SUM(nb.nb_profils), 0)::BIGINT AS total_disciples,
    COUNT(*)::BIGINT AS total_familles,
    COALESCE(SUM(nb.objectif), 0)::BIGINT AS objectif_total,
    COALESCE(SUM(CASE WHEN nb.nb_profils >= nb.objectif THEN 1 ELSE 0 END), 0)::BIGINT AS familles_objectif_atteint
  FROM nb_profils_par_famille nb;
$$;

COMMENT ON FUNCTION get_kpi_familles_pour_pasteur(UUID) IS
'KPI familles pasteur : effectifs = profils par famille_id. Plus de cercle_personnes. Migration 096.';


-- 2) Progression par famille pasteur : nb_disciples = COUNT(profils WHERE famille_id = f.id)
CREATE OR REPLACE FUNCTION get_progression_par_famille_pasteur(p_pasteur_id UUID)
RETURNS TABLE (
  superviseur_id UUID,
  famille_id UUID,
  nom_famille TEXT,
  nb_disciples BIGINT,
  objectif BIGINT,
  progression_pct NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH
  superviseurs_du_pasteur AS (
    SELECT p.id FROM profils p
    WHERE p.role = 'superviseur' AND p.pasteur_id = p_pasteur_id
  ),
  nb_par_famille AS (
    SELECT f.superviseur_id, f.id AS famille_id,
           COALESCE(f.nom, f.identifiant_famille, 'Famille')::TEXT AS nom_famille,
           (SELECT COUNT(*)::BIGINT FROM profils p WHERE p.famille_id = f.id) AS nb_profils,
           COALESCE(NULLIF(f.objectif_disciples, 0), 70)::BIGINT AS objectif
    FROM familles_disciples f
    WHERE f.superviseur_id IN (SELECT id FROM superviseurs_du_pasteur)
  )
  SELECT
    superviseur_id,
    famille_id,
    nom_famille,
    nb_profils AS nb_disciples,
    objectif,
    LEAST(100, (nb_profils::NUMERIC / NULLIF(objectif, 0)) * 100)::NUMERIC AS progression_pct
  FROM nb_par_famille
  ORDER BY nom_famille;
$$;

COMMENT ON FUNCTION get_progression_par_famille_pasteur(UUID) IS
'Progression par famille : nb_disciples = profils par famille_id. Plus de cercle_personnes. Migration 096.';


-- 3) Mentors avec disciples pour pasteur : nombre_disciples = COUNT(profils WHERE mentor_id = user_id)
CREATE OR REPLACE FUNCTION get_mentors_avec_disciples_pour_pasteur(p_pasteur_id UUID)
RETURNS TABLE (
  user_id UUID,
  first_name TEXT,
  last_name TEXT,
  famille_nom TEXT,
  suivi_par_nom TEXT,
  nombre_disciples BIGINT,
  titre TEXT,
  role_profil TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH
  superviseurs_pasteur AS (
    SELECT p.id, UPPER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) AS nom
    FROM profils p
    WHERE p.role = 'superviseur' AND p.pasteur_id = p_pasteur_id
  ),
  familles_actives AS (
    SELECT f.id AS famille_id, f.nom AS famille_nom, f.superviseur_id,
           (SELECT sp.nom FROM superviseurs_pasteur sp WHERE sp.id = f.superviseur_id) AS superviseur_nom
    FROM familles_disciples f
    WHERE f.superviseur_id IN (SELECT id FROM superviseurs_pasteur)
      AND (f.statut IS NULL OR f.statut = 'actif')
  ),
  counts_mentor AS (
    SELECT p.mentor_id AS user_id, COUNT(*)::BIGINT AS cnt
    FROM profils p
    WHERE p.mentor_id IS NOT NULL
    GROUP BY p.mentor_id
  ),
  sup_avec_famille AS (
    SELECT
      p.id AS user_id,
      p.first_name,
      p.last_name,
      fa.famille_nom,
      (SELECT UPPER(TRIM(COALESCE(first_name,'')||' '||COALESCE(last_name,''))) FROM profils WHERE role = 'pasteur' AND id = p.pasteur_id LIMIT 1)::TEXT AS suivi_par_nom,
      COALESCE(cm.cnt, 0)::BIGINT AS nombre_disciples,
      COALESCE(NULLIF(TRIM(p.titre), ''), 'Superviseur')::TEXT AS titre,
      p.role AS role_profil
    FROM familles_actives fa
    JOIN profils p ON p.id = fa.superviseur_id
    LEFT JOIN counts_mentor cm ON cm.user_id = p.id
    WHERE COALESCE(cm.cnt, 0) > 0
  ),
  mentors_famille AS (
    SELECT
      p.id AS user_id,
      p.first_name,
      p.last_name,
      fa.famille_nom,
      fa.superviseur_nom::TEXT AS suivi_par_nom,
      COALESCE(cm.cnt, 0)::BIGINT AS nombre_disciples,
      COALESCE(NULLIF(TRIM(p.titre), ''), CASE p.role WHEN 'mentor' THEN 'Mentor' WHEN 'superviseur' THEN 'Superviseur' WHEN 'disciple_pillier' THEN 'Berger' ELSE 'Disciple' END)::TEXT AS titre,
      p.role AS role_profil
    FROM familles_actives fa
    JOIN profils p ON p.famille_id = fa.famille_id
    LEFT JOIN counts_mentor cm ON cm.user_id = p.id
    WHERE COALESCE(cm.cnt, 0) > 0
      AND p.id NOT IN (SELECT superviseur_id FROM familles_actives)
  )
  SELECT * FROM sup_avec_famille
  UNION
  SELECT * FROM mentors_famille
  ORDER BY famille_nom, last_name, first_name;
$$;

COMMENT ON FUNCTION get_mentors_avec_disciples_pour_pasteur(UUID) IS
'Mentors avec disciples : nombre_disciples = COUNT(profils WHERE mentor_id = user_id). Plus de cercle_personnes. Migration 096.';


-- 4) Nombre de profils par familles : uniquement profils (plus d'hybride avec cercle)
CREATE OR REPLACE FUNCTION get_nombre_profils_par_familles(p_famille_ids UUID[])
RETURNS TABLE (
  famille_id UUID,
  nb_profils BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    f.id AS famille_id,
    COUNT(p.id)::BIGINT AS nb_profils
  FROM familles_disciples f
  LEFT JOIN profils p ON p.famille_id = f.id
  WHERE f.id = ANY(p_famille_ids)
  GROUP BY f.id;
$$;

COMMENT ON FUNCTION get_nombre_profils_par_familles(UUID[]) IS
'Effectifs par famille : uniquement profils (famille_id). Plus de source cercles. Migration 096.';


-- 5) Nombre de disciples par familles (page Familles de Disciples) : profils par famille_id
CREATE OR REPLACE FUNCTION get_nombre_disciples_par_familles(p_famille_ids UUID[])
RETURNS TABLE (
  famille_id UUID,
  nb_disciples_cercle BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    f.id AS famille_id,
    (SELECT COUNT(*)::BIGINT FROM profils p WHERE p.famille_id = f.id) AS nb_disciples_cercle
  FROM familles_disciples f
  WHERE f.id = ANY(p_famille_ids);
$$;

COMMENT ON FUNCTION get_nombre_disciples_par_familles(UUID[]) IS
'Effectifs par famille : profils (famille_id). Colonne conservée nb_disciples_cercle pour compat. Plus de cercle. Migration 096.';


-- ========== 097_profils_circle_type_visible_to_others.sql ==========
-- ============================================
-- Migration 097 : Colonnes circle_type et visible_to_others sur profils
--
-- Permet de migrer toutes les pages de cercle_personnes vers profils.
-- circle_type = niveau spirituel (unbelievers, newBelievers, established, makers).
-- visible_to_others = visibilité dans le groupe (ex-Cercles).
-- ============================================

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS circle_type TEXT;

ALTER TABLE profils
ADD COLUMN IF NOT EXISTS visible_to_others BOOLEAN DEFAULT false;

COMMENT ON COLUMN profils.circle_type IS 'Niveau spirituel (unbelievers, newBelievers, established, makers). Aligné avec cercle_personnes.circle_type.';
COMMENT ON COLUMN profils.visible_to_others IS 'Visible par le groupe (ex-cercle).';

CREATE INDEX IF NOT EXISTS idx_profils_circle_type ON profils(circle_type);
CREATE INDEX IF NOT EXISTS idx_profils_mentor_id_circle_type ON profils(mentor_id, circle_type);


-- ========== 098_rpc_superviseur_dashboard_100_profils.sql ==========
-- ============================================
-- Migration 098 : RPC Dashboard Superviseur 100 % profils (plus de cercle_personnes)
--
-- Remplace get_superviseur_dashboard_phase2 et get_superviseur_dashboard_phase2_extra
-- pour que membres, stats, disciples count et suivi_par viennent uniquement de profils.
-- ============================================

-- 1) get_superviseur_dashboard_phase2 : membres = profils (famille_id), disciples count = profils (mentor_id), suivi_par = profils (mentor_id)
CREATE OR REPLACE FUNCTION get_superviseur_dashboard_phase2(p_user_id UUID, p_famille_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_objectif BIGINT := 70;
  v_membres JSONB := '[]'::JSONB;
  v_stats JSONB;
  v_progression_map JSONB := '{}'::JSONB;
  v_disciples_count_map JSONB := '{}'::JSONB;
  v_kpi_summary JSONB := '{}'::JSONB;
  v_suivi_par_map JSONB := '{}'::JSONB;
  v_suivi_profils JSONB;
  v_superviseur_nom TEXT := '';
  v_nombre_membres INT := 0;
  v_membre_ids UUID[];
  v_formation_term INT := 0;
  v_formation_encours INT := 0;
  v_videos_term INT := 0;
BEGIN
  -- 0. Nom du superviseur
  SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_superviseur_nom
  FROM profils WHERE id = p_user_id;

  -- 1. Objectif famille
  SELECT COALESCE(NULLIF(f.objectif_disciples, 0), 70) INTO v_objectif
  FROM familles_disciples f WHERE f.id = p_famille_id;

  -- 2. Membres : uniquement profils (famille_id), source unique
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'email', p.email,
      'avatar_url', p.avatar_url,
      'created_at', p.created_at,
      'role', COALESCE(p.role, 'disciple'),
      'source', 'profils',
      'statut_spirituel', 'actif',
      'parent_disciple_id', NULL
    ) ORDER BY p.created_at DESC NULLS LAST
  ), '[]'::JSONB) INTO v_membres
  FROM profils p
  WHERE p.famille_id = p_famille_id AND p.id <> p_user_id;

  SELECT COALESCE(array_agg((elem->>'id')::UUID), ARRAY[]::UUID[])
  INTO v_membre_ids
  FROM jsonb_array_elements(v_membres) AS elem;

  v_nombre_membres := jsonb_array_length(v_membres);

  -- 3. Stats
  v_stats := jsonb_build_object(
    'nombreMembres', v_nombre_membres,
    'objectif', v_objectif,
    'progression', CASE WHEN v_nombre_membres > 0 THEN LEAST(100, (v_nombre_membres::NUMERIC / v_objectif) * 100) ELSE 0 END,
    'reste', GREATEST(v_objectif - v_nombre_membres, 0)
  );

  IF v_membre_ids IS NULL OR array_length(v_membre_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'membres', v_membres,
      'stats', v_stats,
      'membres_progression', v_progression_map,
      'membres_disciples_count', v_disciples_count_map,
      'kpi_summary', v_kpi_summary,
      'membres_suivi_par', v_suivi_par_map
    );
  END IF;

  -- 4. Progressions (formations + vidéos) par user_id
  WITH prog AS (
    SELECT upp.user_id, COUNT(*) FILTER (WHERE ump.est_complete) AS formations
    FROM user_parcours_progression upp
    JOIN user_module_progression ump ON ump.progression_id = upp.id
    WHERE upp.user_id = ANY(v_membre_ids)
    GROUP BY upp.user_id
  ),
  vid AS (
    SELECT vp.disciple_id AS user_id, COUNT(*) AS videos
    FROM video_progress vp
    WHERE vp.disciple_id = ANY(v_membre_ids) AND (vp.is_completed = true)
    GROUP BY vp.disciple_id
  )
  SELECT jsonb_object_agg(
    mid.id::TEXT,
    jsonb_build_object(
      'formations', COALESCE(p.formations, 0),
      'videos', COALESCE(v.videos, 0),
      'total', COALESCE(p.formations, 0) + COALESCE(v.videos, 0)
    )
  ) INTO v_progression_map
  FROM (SELECT unnest(v_membre_ids) AS id) mid
  LEFT JOIN prog p ON p.user_id = mid.id
  LEFT JOIN vid v ON v.user_id = mid.id;

  -- 5. KPI global formations / vidéos
  SELECT
    COALESCE(SUM(1) FILTER (WHERE ump.est_complete), 0),
    COALESCE(SUM(1) FILTER (WHERE NOT ump.est_complete), 0),
    (SELECT COUNT(*) FROM video_progress vp WHERE vp.disciple_id = ANY(v_membre_ids) AND vp.is_completed = true)
  INTO v_formation_term, v_formation_encours, v_videos_term
  FROM user_parcours_progression upp
  JOIN user_module_progression ump ON ump.progression_id = upp.id
  WHERE upp.user_id = ANY(v_membre_ids);

  v_kpi_summary := jsonb_build_object(
    'formationsTerminees', v_formation_term,
    'formationsEnCours', v_formation_encours,
    'videosTerminees', v_videos_term
  );

  -- 6. Nombre de disciples par membre : profils (mentor_id = membre)
  WITH direct AS (
    SELECT p.mentor_id AS user_id, COUNT(*)::INT AS cnt
    FROM profils p
    WHERE p.mentor_id = ANY(v_membre_ids)
    GROUP BY p.mentor_id
  )
  SELECT COALESCE(jsonb_object_agg(d.user_id::TEXT, d.cnt), '{}'::JSONB) INTO v_disciples_count_map FROM direct d;

  SELECT jsonb_object_agg(elem->>'id', COALESCE((v_disciples_count_map->>(elem->>'id'))::INT, 0))
  INTO v_disciples_count_map
  FROM jsonb_array_elements(v_membres) AS elem;

  -- 7. Suivi par : mentor si mentor_id renseigné, sinon superviseur (profils uniquement)
  WITH refs AS (
    SELECT p.id AS membre_id, p.mentor_id AS ref_id
    FROM profils p
    WHERE p.id = ANY(v_membre_ids) AND p.mentor_id IS NOT NULL
  )
  SELECT COALESCE(jsonb_object_agg(
    r.membre_id::TEXT,
    jsonb_build_object(
      'id', pr.id,
      'name', TRIM(COALESCE(pr.first_name, '') || ' ' || COALESCE(pr.last_name, ''))
    )
  ), '{}'::JSONB) INTO v_suivi_par_map
  FROM refs r
  LEFT JOIN profils pr ON pr.id = r.ref_id;

  -- Par défaut : suivi par = superviseur ; les membres avec mentor_id ont déjà été mis dans v_suivi_par_map
  SELECT COALESCE(jsonb_object_agg(elem->>'id', jsonb_build_object('id', p_user_id, 'name', v_superviseur_nom)), '{}'::JSONB)
  INTO v_suivi_profils
  FROM jsonb_array_elements(v_membres) AS elem;
  v_suivi_par_map := COALESCE(v_suivi_profils, '{}'::JSONB) || COALESCE(v_suivi_par_map, '{}'::JSONB);

  RETURN jsonb_build_object(
    'membres', v_membres,
    'stats', v_stats,
    'membres_progression', COALESCE(v_progression_map, '{}'::JSONB),
    'membres_disciples_count', COALESCE(v_disciples_count_map, '{}'::JSONB),
    'kpi_summary', v_kpi_summary,
    'membres_suivi_par', COALESCE(v_suivi_par_map, '{}'::JSONB)
  );
END;
$$;

COMMENT ON FUNCTION get_superviseur_dashboard_phase2(UUID, UUID) IS
'Dashboard superviseur Phase 2 : membres, stats, disciples count, suivi_par = 100 % profils. Plus de cercle_personnes. Migration 098.';


-- 2) get_superviseur_dashboard_phase2_extra : nombre_membres_par_superviseur = uniquement profils (famille)
CREATE OR REPLACE FUNCTION get_superviseur_dashboard_phase2_extra(
  p_user_id UUID,
  p_pasteur_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_rapports JSONB := '[]'::JSONB;
  v_superviseurs JSONB := '[]'::JSONB;
  v_nombre_membres JSONB := '{}'::JSONB;
  v_superviseur_ids UUID[];
BEGIN
  -- 1. Rapports du superviseur
  SELECT COALESCE(jsonb_agg(r ORDER BY r.created_at ASC), '[]'::JSONB)
  INTO v_rapports
  FROM reports r
  WHERE r.user_id = p_user_id;

  IF p_pasteur_id IS NULL THEN
    RETURN jsonb_build_object(
      'rapports', v_rapports,
      'superviseurs_famille', v_superviseurs,
      'nombre_membres_par_superviseur', v_nombre_membres
    );
  END IF;

  -- 2. Autres superviseurs (même pasteur)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'email', p.email,
      'avatar_url', p.avatar_url
    ) ORDER BY p.first_name
  ), '[]'::JSONB)
  INTO v_superviseurs
  FROM profils p
  WHERE p.pasteur_id = p_pasteur_id
    AND p.role = 'superviseur'
    AND p.id <> p_user_id;

  SELECT COALESCE(array_agg((elem->>'id')::UUID), ARRAY[]::UUID[])
  INTO v_superviseur_ids
  FROM jsonb_array_elements(v_superviseurs) AS elem;

  IF v_superviseur_ids IS NULL OR array_length(v_superviseur_ids, 1) IS NULL THEN
    RETURN jsonb_build_object(
      'rapports', v_rapports,
      'superviseurs_famille', v_superviseurs,
      'nombre_membres_par_superviseur', v_nombre_membres
    );
  END IF;

  -- 3. Nombre de membres par superviseur : uniquement profils (famille_id), plus de cercle_personnes
  WITH counts_profils AS (
    SELECT fd.superviseur_id, COUNT(p.id)::INT AS cnt
    FROM familles_disciples fd
    LEFT JOIN profils p ON p.famille_id = fd.id AND p.id <> fd.superviseur_id
    WHERE fd.superviseur_id = ANY(v_superviseur_ids)
    GROUP BY fd.superviseur_id
  )
  SELECT COALESCE(jsonb_object_agg(sid::TEXT, COALESCE(cp.cnt, 0)), '{}'::JSONB)
  INTO v_nombre_membres
  FROM unnest(v_superviseur_ids) AS sid
  LEFT JOIN counts_profils cp ON cp.superviseur_id = sid;

  RETURN jsonb_build_object(
    'rapports', COALESCE(v_rapports, '[]'::JSONB),
    'superviseurs_famille', COALESCE(v_superviseurs, '[]'::JSONB),
    'nombre_membres_par_superviseur', COALESCE(v_nombre_membres, '{}'::JSONB)
  );
END;
$$;

COMMENT ON FUNCTION get_superviseur_dashboard_phase2_extra(UUID, UUID) IS
'Rapports, superviseurs (même pasteur), nombre de membres par superviseur = 100 % profils. Plus de cercle_personnes. Migration 098.';


-- ========== 099_seed_5_mentors_les_glorieux.sql ==========
-- ============================================
-- Migration 099 : Ajouter 5 mentors à la famille LES GLORIEUX (FAM012)
--
-- Famille : LES GLORIEUX (FAM012)
-- Superviseur : HÉLÈNE LAMAGO
-- Ajoute 5 profils role=mentor, famille_id=FAM012, mentor_id=superviseur.
-- Comptes créés (mot de passe commun : TestPassword123!)
-- ============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION create_profil_099(
  p_email TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_role TEXT,
  p_famille_id UUID,
  p_mentor_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  v_id UUID;
  v_encrypted_pw TEXT;
BEGIN
  -- Si l'email existe déjà dans auth.users, réutiliser cet utilisateur (idempotent)
  SELECT id INTO v_id FROM auth.users WHERE email = p_email LIMIT 1;
  IF v_id IS NOT NULL THEN
    -- Mettre à jour le profil uniquement (auth.users inchangé)
    INSERT INTO public.profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
    VALUES (v_id, p_email, p_first_name, p_last_name, p_role, p_famille_id, p_mentor_id, NOW())
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role,
      famille_id = EXCLUDED.famille_id,
      mentor_id = EXCLUDED.mentor_id;
    RETURN v_id;
  END IF;

  -- Sinon créer le compte auth + identities + profil
  v_id := gen_random_uuid();
  v_encrypted_pw := crypt('TestPassword123!', gen_salt('bf'));
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) VALUES (
    v_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    p_email,
    v_encrypted_pw,
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('first_name', p_first_name, 'last_name', p_last_name),
    NOW(),
    NOW()
  );
  INSERT INTO auth.identities (
    id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
  ) VALUES (
    v_id,
    v_id,
    jsonb_build_object('sub', v_id::text, 'email', p_email),
    'email',
    v_id::text,
    NOW(),
    NOW(),
    NOW()
  );
  INSERT INTO public.profils (id, email, first_name, last_name, role, famille_id, mentor_id, created_at)
  VALUES (v_id, p_email, p_first_name, p_last_name, p_role, p_famille_id, p_mentor_id, NOW())
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    role = EXCLUDED.role,
    famille_id = EXCLUDED.famille_id,
    mentor_id = EXCLUDED.mentor_id;
  RETURN v_id;
END;
$$;

DO $$
DECLARE
  v_famille_id UUID;
  v_superviseur_id UUID;
BEGIN
  SELECT id, superviseur_id INTO v_famille_id, v_superviseur_id
  FROM familles_disciples
  WHERE (identifiant_famille = 'FAM012' OR UPPER(TRIM(nom)) = 'LES GLORIEUX')
  LIMIT 1;

  IF v_famille_id IS NULL OR v_superviseur_id IS NULL THEN
    RAISE EXCEPTION 'Famille Les Glorieux (FAM012) ou superviseur introuvable.';
  END IF;

  -- 5 nouveaux mentors (source unique = profils, pas d'entrée cercle_personnes)
  PERFORM create_profil_099('glorieux.mentor6@fam012.icc.ga',  'Marc',    'OKANDZE',  'mentor', v_famille_id, v_superviseur_id);
  PERFORM create_profil_099('glorieux.mentor7@fam012.icc.ga',  'Lucie',   'BOUKALOU', 'mentor', v_famille_id, v_superviseur_id);
  PERFORM create_profil_099('glorieux.mentor8@fam012.icc.ga',  'Thomas',  'MBOUMBA',  'mentor', v_famille_id, v_superviseur_id);
  PERFORM create_profil_099('glorieux.mentor9@fam012.icc.ga',  'Anne',    'NKOGHE',   'mentor', v_famille_id, v_superviseur_id);
  PERFORM create_profil_099('glorieux.mentor10@fam012.icc.ga', 'Pierre',  'LONGONI',  'mentor', v_famille_id, v_superviseur_id);

  RAISE NOTICE 'Migration 099 : 5 mentors ajoutés à Les Glorieux (FAM012) : Marc OKANDZE, Lucie BOUKALOU, Thomas MBOUMBA, Anne NKOGHE, Pierre LONGONI.';
END $$;

-- Mise à jour du décompte famille si la colonne existe
UPDATE familles_disciples f
SET nombre_disciples_actuels = (SELECT COUNT(*)::INTEGER FROM profils p WHERE p.famille_id = f.id)
WHERE f.identifiant_famille = 'FAM012' OR UPPER(TRIM(f.nom)) = 'LES GLORIEUX';

DROP FUNCTION IF EXISTS create_profil_099(TEXT, TEXT, TEXT, TEXT, UUID, UUID);


-- ========== 100_role_pilier_trigger_mentor_auto.sql ==========
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

