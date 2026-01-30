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
