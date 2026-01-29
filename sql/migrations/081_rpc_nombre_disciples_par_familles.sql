-- ============================================
-- Migration 081 : RPC nombre de disciples par familles (page Familles de Disciples)
--
-- Accepte une liste d'IDs de familles et retourne pour chacune le nombre de
-- disciples (cercle_personnes sous le superviseur de la famille).
-- Contourne RLS sur cercle_personnes (SECURITY DEFINER).
-- ============================================

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
  WITH
  familles_filtrees AS (
    SELECT f.id, f.superviseur_id
    FROM familles_disciples f
    WHERE f.id = ANY(p_famille_ids)
  ),
  counts_cercle AS (
    SELECT cp.user_id, COUNT(*)::BIGINT AS cnt
    FROM cercle_personnes cp
    WHERE cp.user_id IN (SELECT superviseur_id FROM familles_filtrees WHERE superviseur_id IS NOT NULL)
    GROUP BY cp.user_id
  )
  SELECT
    ff.id AS famille_id,
    COALESCE(cc.cnt, 0)::BIGINT AS nb_disciples_cercle
  FROM familles_filtrees ff
  LEFT JOIN counts_cercle cc ON cc.user_id = ff.superviseur_id;
$$;

COMMENT ON FUNCTION get_nombre_disciples_par_familles(UUID[]) IS
'Retourne pour chaque famille_id le nombre de disciples (cercle_personnes du superviseur). Utilisé par la page Familles de Disciples. SECURITY DEFINER.';