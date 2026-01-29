-- ============================================
-- Migration 082 : RPC mentors/piliers avec disciples (familles actives du pasteur)
--
-- Retourne la liste des personnes qui ont au moins un disciple dans leur cercle,
-- appartenant aux familles actives du pasteur. Utilisé par le Tableau Consolidé des Mentors.
-- SECURITY DEFINER pour contourner RLS sur cercle_personnes.
-- ============================================

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
  counts_cercle AS (
    SELECT cp.user_id, COUNT(*)::BIGINT AS cnt
    FROM cercle_personnes cp
    GROUP BY cp.user_id
  ),
  -- Superviseurs (suivis par le pasteur)
  sup_avec_famille AS (
    SELECT
      p.id AS user_id,
      p.first_name,
      p.last_name,
      f.famille_nom,
      (SELECT pn.nom FROM pasteur_nom pn)::TEXT AS suivi_par_nom,
      COALESCE(cc.cnt, 0)::BIGINT AS nombre_disciples,
      COALESCE(NULLIF(TRIM(p.titre), ''), 'Superviseur')::TEXT AS titre,
      p.role AS role_profil
    FROM familles_actives f
    JOIN profils p ON p.id = f.superviseur_id
    LEFT JOIN counts_cercle cc ON cc.user_id = p.id
    WHERE COALESCE(cc.cnt, 0) > 0
  ),
  -- Mentors / disciples (suivis par le superviseur de la famille)
  mentors_famille AS (
    SELECT
      p.id AS user_id,
      p.first_name,
      p.last_name,
      fa.famille_nom,
      fa.superviseur_nom::TEXT AS suivi_par_nom,
      COALESCE(cc.cnt, 0)::BIGINT AS nombre_disciples,
      COALESCE(NULLIF(TRIM(p.titre), ''), CASE p.role WHEN 'mentor' THEN 'Mentor' WHEN 'superviseur' THEN 'Superviseur' WHEN 'disciple_pillier' THEN 'Berger' ELSE 'Disciple' END)::TEXT AS titre,
      p.role AS role_profil
    FROM familles_actives fa
    JOIN profils p ON p.famille_id = fa.famille_id
    LEFT JOIN counts_cercle cc ON cc.user_id = p.id
    WHERE COALESCE(cc.cnt, 0) > 0
      AND p.id NOT IN (SELECT superviseur_id FROM familles_actives)
  )
  SELECT * FROM sup_avec_famille
  UNION
  SELECT * FROM mentors_famille
  ORDER BY famille_nom, last_name, first_name;
$$;

COMMENT ON FUNCTION get_mentors_avec_disciples_pour_pasteur(UUID) IS
'Liste des disciples/mentors (hors superviseurs) qui ont au moins un disciple, dans les familles actives du pasteur. Pour le Tableau Consolidé des Mentors. SECURITY DEFINER.';