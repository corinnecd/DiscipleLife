-- ============================================
-- Migration 087 : KPI disciples par pasteur basé sur profils (pas cercle_personnes)
--
-- Aligne "KPI Globaux - Total Disciples par Pasteur" avec la même source de vérité :
-- total_disciples = somme des profils (famille_id) des familles du pasteur.
-- Quand les effectifs d'une famille changent, cette section se met à jour au prochain chargement.
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
'KPI par pasteur : total_disciples = somme des profils par famille. Migration 087. Aligné avec Liste des Familles et Progression.';
