-- ============================================
-- Migration 080 : RPC progression par famille pour un pasteur (graphiques)
--
-- Utilisé par la page "Progression Globale des Familles" pour remplir les barres
-- de progression par famille. Contourne RLS sur cercle_personnes (SECURITY DEFINER).
-- ============================================

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
    SELECT p.id
    FROM profils p
    WHERE p.role = 'superviseur' AND p.pasteur_id = p_pasteur_id
  ),
  counts_cercle AS (
    SELECT cp.user_id, COUNT(*)::BIGINT AS cnt
    FROM cercle_personnes cp
    WHERE cp.user_id IN (SELECT id FROM superviseurs_du_pasteur)
    GROUP BY cp.user_id
  )
  SELECT
    f.superviseur_id,
    f.id AS famille_id,
    COALESCE(f.nom, f.identifiant_famille, 'Famille')::TEXT AS nom_famille,
    COALESCE(cc.cnt, 0)::BIGINT AS nb_disciples,
    COALESCE(NULLIF(f.objectif_disciples, 0), 70)::BIGINT AS objectif,
    LEAST(100, (COALESCE(cc.cnt, 0)::NUMERIC / NULLIF(COALESCE(NULLIF(f.objectif_disciples, 0), 70), 0)) * 100)::NUMERIC AS progression_pct
  FROM familles_disciples f
  LEFT JOIN counts_cercle cc ON cc.user_id = f.superviseur_id
  WHERE f.superviseur_id IN (SELECT id FROM superviseurs_du_pasteur)
  ORDER BY nom_famille;
$$;

COMMENT ON FUNCTION get_progression_par_famille_pasteur(UUID) IS
'Retourne une ligne par famille du pasteur : superviseur_id, famille_id, nom_famille, nb_disciples, objectif, progression_pct. Utilisé pour les graphiques de progression. SECURITY DEFINER.';