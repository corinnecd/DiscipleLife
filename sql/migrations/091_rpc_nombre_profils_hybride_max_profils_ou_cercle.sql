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
