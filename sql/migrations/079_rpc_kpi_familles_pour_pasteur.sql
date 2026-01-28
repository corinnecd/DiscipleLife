-- ============================================
-- Migration 079 : RPC KPI familles pour un pasteur (disciples + progression)
--
-- Utilisé par le dashboard pasteur pour la section "KPI des Familles de [nom]".
-- Contourne RLS sur cercle_personnes (SECURITY DEFINER) pour récupérer
-- total_disciples, objectif_total, familles_objectif_atteint.
-- ============================================

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
    SELECT p.id
    FROM profils p
    WHERE p.role = 'superviseur' AND p.pasteur_id = p_pasteur_id
  ),
  counts_cercle AS (
    SELECT cp.user_id, COUNT(*)::BIGINT AS cnt
    FROM cercle_personnes cp
    WHERE cp.user_id IN (SELECT id FROM superviseurs_du_pasteur)
    GROUP BY cp.user_id
  ),
  familles_avec_stats AS (
    SELECT
      f.id,
      f.superviseur_id,
      (f.objectif_disciples IS NOT NULL AND f.objectif_disciples > 0) AS has_objectif,
      COALESCE(f.objectif_disciples, 70)::BIGINT AS objectif,
      COALESCE(cc.cnt, 0)::BIGINT AS nb_disciples
    FROM familles_disciples f
    LEFT JOIN counts_cercle cc ON cc.user_id = f.superviseur_id
    WHERE f.superviseur_id IN (SELECT id FROM superviseurs_du_pasteur)
  )
  SELECT
    COALESCE(SUM(fs.nb_disciples), 0)::BIGINT AS total_disciples,
    COUNT(*)::BIGINT AS total_familles,
    COALESCE(SUM(fs.objectif), 0)::BIGINT AS objectif_total,
    COALESCE(SUM(CASE WHEN fs.nb_disciples >= fs.objectif THEN 1 ELSE 0 END), 0)::BIGINT AS familles_objectif_atteint
  FROM familles_avec_stats fs;
$$;

COMMENT ON FUNCTION get_kpi_familles_pour_pasteur(UUID) IS
'Retourne pour un pasteur donné : total disciples (cercle_personnes), nombre de familles, objectif total, nombre de familles ayant atteint l''objectif. SECURITY DEFINER pour contourner RLS.';