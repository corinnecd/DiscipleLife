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
