-- ============================================
-- Phase 3 CRUD – Lecture 100 % profils
-- Exécuter ce script dans le SQL Editor Supabase (Run).
-- Ordre : 087 → 096 → 098 (KPI pasteur, effectifs, dashboard superviseur).
-- Prérequis : tables profils, familles_disciples, reports, user_parcours_progression,
--             user_module_progression, video_progress existantes.
-- ============================================

-- ---------- 087 : KPI disciples par pasteur (profils) ----------
CREATE OR REPLACE FUNCTION get_kpi_disciples_par_pasteur()
RETURNS TABLE (
  pasteur_id UUID,
  nom_affichage TEXT,
  total_disciples BIGINT,
  total_familles BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH
  familles_avec_nb_profils AS (
    SELECT
      f.id AS famille_id,
      f.superviseur_id,
      (SELECT COUNT(*)::BIGINT FROM profils p WHERE p.famille_id = f.id) AS nb_profils
    FROM familles_disciples f
    WHERE f.superviseur_id IS NOT NULL
  ),
  superviseurs_avec_pasteur AS (
    SELECT s.id AS superviseur_id, s.pasteur_id
    FROM profils s
    WHERE s.role = 'superviseur' AND s.pasteur_id IS NOT NULL
  ),
  agg_par_pasteur AS (
    SELECT
      sup.pasteur_id,
      COUNT(DISTINCT fap.famille_id)::BIGINT AS nb_familles,
      COALESCE(SUM(fap.nb_profils), 0)::BIGINT AS total_disciples
    FROM superviseurs_avec_pasteur sup
    JOIN familles_avec_nb_profils fap ON fap.superviseur_id = sup.superviseur_id
    GROUP BY sup.pasteur_id
  )
  SELECT
    p.id AS pasteur_id,
    UPPER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) AS nom_affichage,
    COALESCE(a.total_disciples, 0)::BIGINT AS total_disciples,
    COALESCE(a.nb_familles, 0)::BIGINT AS total_familles
  FROM profils p
  LEFT JOIN agg_par_pasteur a ON a.pasteur_id = p.id
  WHERE p.role = 'pasteur'
  ORDER BY nom_affichage;
$$;

COMMENT ON FUNCTION get_kpi_disciples_par_pasteur() IS
'KPI par pasteur : total_disciples = somme des profils par famille. Migration 087.';


-- ---------- 096 : RPC effectifs / KPI 100 % profils ----------
-- (get_kpi_familles_pour_pasteur, get_progression_par_famille_pasteur, get_mentors_avec_disciples_pour_pasteur, get_nombre_profils_par_familles, get_nombre_disciples_par_familles)
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


-- ---------- 098 : RPC Dashboard Superviseur 100 % profils ----------
-- (get_superviseur_dashboard_phase2, get_superviseur_dashboard_phase2_extra)
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
  SELECT TRIM(COALESCE(first_name, '') || ' ' || COALESCE(last_name, '')) INTO v_superviseur_nom
  FROM profils WHERE id = p_user_id;

  SELECT COALESCE(NULLIF(f.objectif_disciples, 0), 70) INTO v_objectif
  FROM familles_disciples f WHERE f.id = p_famille_id;

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

-- ============================================
-- Fin Phase 3. Les listes et KPI utilisent désormais 100 % profils.
-- ============================================
