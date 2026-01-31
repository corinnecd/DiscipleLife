-- ============================================
-- Migration 101 : Suivi par = nom du mentor (mentor_id) si présent, sinon superviseur
-- Pour get_mentors_avec_disciples_pour_pasteur : suivi_par_nom = nom du profil mentor_id
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
  counts_mentor AS (
    SELECT p.mentor_id AS user_id, COUNT(*)::BIGINT AS cnt
    FROM profils p
    WHERE p.mentor_id IS NOT NULL
    GROUP BY p.mentor_id
  ),
  sup_avec_famille AS (
    SELECT
      p.id AS user_id,
      p.first_name,
      p.last_name,
      fa.famille_nom,
      (SELECT UPPER(TRIM(COALESCE(mentor.first_name,'')||' '||COALESCE(mentor.last_name,''))) FROM profils mentor WHERE mentor.role = 'pasteur' AND mentor.id = p.pasteur_id LIMIT 1)::TEXT AS suivi_par_nom,
      COALESCE(cm.cnt, 0)::BIGINT AS nombre_disciples,
      COALESCE(NULLIF(TRIM(p.titre), ''), 'Superviseur')::TEXT AS titre,
      p.role AS role_profil
    FROM familles_actives fa
    JOIN profils p ON p.id = fa.superviseur_id
    LEFT JOIN counts_mentor cm ON cm.user_id = p.id
    WHERE COALESCE(cm.cnt, 0) > 0
  ),
  mentors_famille AS (
    SELECT
      p.id AS user_id,
      p.first_name,
      p.last_name,
      fa.famille_nom,
      COALESCE(
        (SELECT UPPER(TRIM(COALESCE(m.first_name,'')||' '||COALESCE(m.last_name,''))) FROM profils m WHERE m.id = p.mentor_id LIMIT 1),
        fa.superviseur_nom
      )::TEXT AS suivi_par_nom,
      COALESCE(cm.cnt, 0)::BIGINT AS nombre_disciples,
      COALESCE(NULLIF(TRIM(p.titre), ''), CASE p.role WHEN 'mentor' THEN 'Mentor' WHEN 'superviseur' THEN 'Superviseur' WHEN 'disciple_pillier' THEN 'Berger' ELSE 'Disciple' END)::TEXT AS titre,
      p.role AS role_profil
    FROM familles_actives fa
    JOIN profils p ON p.famille_id = fa.famille_id
    LEFT JOIN counts_mentor cm ON cm.user_id = p.id
    WHERE COALESCE(cm.cnt, 0) > 0
      AND p.id NOT IN (SELECT superviseur_id FROM familles_actives)
  )
  SELECT * FROM sup_avec_famille
  UNION
  SELECT * FROM mentors_famille
  ORDER BY famille_nom, last_name, first_name;
$$;

COMMENT ON FUNCTION get_mentors_avec_disciples_pour_pasteur(UUID) IS
'Suivi par = nom du mentor (mentor_id) si présent, sinon superviseur. Migration 101.';
