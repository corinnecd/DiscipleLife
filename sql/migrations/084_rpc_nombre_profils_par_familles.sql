-- ============================================
-- Migration 084 : RPC nombre de profils (membres) par familles
--
-- Retourne pour chaque famille_id le nombre de profils avec ce famille_id.
-- SECURITY DEFINER pour contourner la RLS sur profils et afficher le vrai total.
-- Utilisé par la page Liste des Familles pour "Membres: X / 70".
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
  SELECT
    f.id AS famille_id,
    COUNT(p.id)::BIGINT AS nb_profils
  FROM familles_disciples f
  LEFT JOIN profils p ON p.famille_id = f.id
  WHERE f.id = ANY(p_famille_ids)
  GROUP BY f.id;
$$;

COMMENT ON FUNCTION get_nombre_profils_par_familles(UUID[]) IS
'Retourne pour chaque famille_id le nombre de profils (membres). Contourne RLS. Page Liste des Familles.';
