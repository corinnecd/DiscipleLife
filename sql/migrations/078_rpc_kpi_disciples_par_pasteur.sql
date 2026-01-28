-- ============================================
-- Migration 078 : RPC KPI disciples par pasteur (contourne RLS sur cercle_personnes)
--
-- Si RLS sur cercle_personnes limite la lecture au propriétaire du cercle (user_id = auth.uid()),
-- le pasteur/admin ne voit pas les cercles des superviseurs → comptes à 0.
-- Cette fonction SECURITY DEFINER lit cercle_personnes côté serveur et retourne les totaux.
-- ============================================

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
  counts_cercle AS (
    SELECT cp.user_id, COUNT(*)::BIGINT AS cnt
    FROM cercle_personnes cp
    WHERE cp.user_id IN (SELECT f.superviseur_id FROM familles_disciples f WHERE f.superviseur_id IS NOT NULL)
    GROUP BY cp.user_id
  ),
  familles_par_sup AS (
    SELECT f.superviseur_id, COUNT(*)::BIGINT AS nb_familles
    FROM familles_disciples f
    WHERE f.superviseur_id IS NOT NULL
    GROUP BY f.superviseur_id
  ),
  agg_par_sup AS (
    SELECT s.pasteur_id,
      COALESCE(cc.cnt, 0)::BIGINT AS nb_disciples,
      COALESCE(fs.nb_familles, 0)::BIGINT AS nb_familles
    FROM profils s
    LEFT JOIN counts_cercle cc ON cc.user_id = s.id
    LEFT JOIN familles_par_sup fs ON fs.superviseur_id = s.id
    WHERE s.role = 'superviseur' AND s.pasteur_id IS NOT NULL
  )
  SELECT
    p.id AS pasteur_id,
    UPPER(TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, ''))) AS nom_affichage,
    COALESCE(SUM(a.nb_disciples), 0)::BIGINT AS total_disciples,
    COALESCE(SUM(a.nb_familles), 0)::BIGINT AS total_familles
  FROM profils p
  LEFT JOIN agg_par_sup a ON a.pasteur_id = p.id
  WHERE p.role = 'pasteur'
  GROUP BY p.id, p.first_name, p.last_name
  ORDER BY nom_affichage;
$$;

COMMENT ON FUNCTION get_kpi_disciples_par_pasteur() IS
'Retourne pour chaque pasteur le total de disciples (cercle_personnes) et le nombre de familles. Utilisé par le dashboard pasteur. SECURITY DEFINER pour contourner RLS sur cercle_personnes.';
