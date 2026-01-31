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
