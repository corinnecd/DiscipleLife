-- ============================================
-- Migration 086 : RPC progression et KPI basées sur profils (pas cercle_personnes)
--
-- Source de vérité pour "nombre de disciples" = COUNT(profils) WHERE famille_id = f.id.
-- Évite d'afficher 53 partout quand cercle_personnes ou nombre_disciples_actuels
-- contiennent une valeur figée.
-- ============================================

-- 1. get_progression_par_famille_pasteur : nb_disciples = nombre de profils de la famille
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
  WITH superviseurs_du_pasteur AS (
    SELECT p.id
    FROM profils p
    WHERE p.role = 'superviseur' AND p.pasteur_id = p_pasteur_id
  ),
  counts_profils AS (
    SELECT p.famille_id, COUNT(*)::BIGINT AS cnt
    FROM profils p
    WHERE p.famille_id IN (
      SELECT f.id FROM familles_disciples f
      WHERE f.superviseur_id IN (SELECT id FROM superviseurs_du_pasteur)
    )
    GROUP BY p.famille_id
  )
  SELECT
    f.superviseur_id,
    f.id AS famille_id,
    COALESCE(f.nom, f.identifiant_famille, 'Famille')::TEXT AS nom_famille,
    COALESCE(cp.cnt, 0)::BIGINT AS nb_disciples,
    COALESCE(NULLIF(f.objectif_disciples, 0), 70)::BIGINT AS objectif,
    LEAST(100, (COALESCE(cp.cnt, 0)::NUMERIC / NULLIF(COALESCE(NULLIF(f.objectif_disciples, 0), 70), 0)) * 100)::NUMERIC AS progression_pct
  FROM familles_disciples f
  LEFT JOIN counts_profils cp ON cp.famille_id = f.id
  WHERE f.superviseur_id IN (SELECT id FROM superviseurs_du_pasteur)
  ORDER BY nom_famille;
$$;

COMMENT ON FUNCTION get_progression_par_famille_pasteur(UUID) IS
'Progression par famille du pasteur : nb_disciples = COUNT(profils) par famille_id. Migration 086.';

-- 2. get_kpi_familles_pour_pasteur : total_disciples = somme des profils par famille
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
  WITH superviseurs_du_pasteur AS (
    SELECT p.id
    FROM profils p
    WHERE p.role = 'superviseur' AND p.pasteur_id = p_pasteur_id
  ),
  familles_avec_stats AS (
    SELECT
      f.id,
      f.superviseur_id,
      COALESCE(f.objectif_disciples, 70)::BIGINT AS objectif,
      (SELECT COUNT(*)::BIGINT FROM profils p WHERE p.famille_id = f.id) AS nb_disciples
    FROM familles_disciples f
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
'KPI familles pour pasteur : total_disciples = somme des profils par famille. Migration 086.';
