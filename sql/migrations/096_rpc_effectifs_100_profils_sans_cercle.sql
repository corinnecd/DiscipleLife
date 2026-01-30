-- ============================================
-- Migration 096 : RPC effectifs / KPI 100 % profils (aucune source cercles)
--
-- Demande : aucune donnée ne doit plus être récupérée dans cercles.
-- Effectifs par famille (repli) = profils (famille_id).
--
-- Ce script remplace l'usage de cercle_personnes par profils dans :
-- - get_kpi_familles_pour_pasteur (effectifs par famille)
-- - get_progression_par_famille_pasteur (barres de progression)
-- - get_mentors_avec_disciples_pasteur (nombre disciples = profils.mentor_id)
-- - get_nombre_profils_par_familles (effectifs par famille, plus d'hybride cercle)
-- - get_nombre_disciples_par_familles (page Familles de Disciples)
-- ============================================

-- 1) KPI familles pour pasteur : effectifs = COUNT(profils WHERE famille_id = f.id)
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
    SELECT p.id FROM profils p
    WHERE p.role = 'superviseur' AND p.pasteur_id = p_pasteur_id
  ),
  nb_profils_par_famille AS (
    SELECT f.id, f.superviseur_id,
           COALESCE(f.objectif_disciples, 70)::BIGINT AS objectif,
           (SELECT COUNT(*)::BIGINT FROM profils p WHERE p.famille_id = f.id) AS nb_profils
    FROM familles_disciples f
    WHERE f.superviseur_id IN (SELECT id FROM superviseurs_du_pasteur)
  )
  SELECT
    COALESCE(SUM(nb.nb_profils), 0)::BIGINT AS total_disciples,
    COUNT(*)::BIGINT AS total_familles,
    COALESCE(SUM(nb.objectif), 0)::BIGINT AS objectif_total,
    COALESCE(SUM(CASE WHEN nb.nb_profils >= nb.objectif THEN 1 ELSE 0 END), 0)::BIGINT AS familles_objectif_atteint
  FROM nb_profils_par_famille nb;
$$;

COMMENT ON FUNCTION get_kpi_familles_pour_pasteur(UUID) IS
'KPI familles pasteur : effectifs = profils par famille_id. Plus de cercle_personnes. Migration 096.';


-- 2) Progression par famille pasteur : nb_disciples = COUNT(profils WHERE famille_id = f.id)
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
    SELECT p.id FROM profils p
    WHERE p.role = 'superviseur' AND p.pasteur_id = p_pasteur_id
  ),
  nb_par_famille AS (
    SELECT f.superviseur_id, f.id AS famille_id,
           COALESCE(f.nom, f.identifiant_famille, 'Famille')::TEXT AS nom_famille,
           (SELECT COUNT(*)::BIGINT FROM profils p WHERE p.famille_id = f.id) AS nb_profils,
           COALESCE(NULLIF(f.objectif_disciples, 0), 70)::BIGINT AS objectif
    FROM familles_disciples f
    WHERE f.superviseur_id IN (SELECT id FROM superviseurs_du_pasteur)
  )
  SELECT
    superviseur_id,
    famille_id,
    nom_famille,
    nb_profils AS nb_disciples,
    objectif,
    LEAST(100, (nb_profils::NUMERIC / NULLIF(objectif, 0)) * 100)::NUMERIC AS progression_pct
  FROM nb_par_famille
  ORDER BY nom_famille;
$$;

COMMENT ON FUNCTION get_progression_par_famille_pasteur(UUID) IS
'Progression par famille : nb_disciples = profils par famille_id. Plus de cercle_personnes. Migration 096.';


-- 3) Mentors avec disciples pour pasteur : nombre_disciples = COUNT(profils WHERE mentor_id = user_id)
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
      (SELECT UPPER(TRIM(COALESCE(first_name,'')||' '||COALESCE(last_name,''))) FROM profils WHERE role = 'pasteur' AND id = p.pasteur_id LIMIT 1)::TEXT AS suivi_par_nom,
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
      fa.superviseur_nom::TEXT AS suivi_par_nom,
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
'Mentors avec disciples : nombre_disciples = COUNT(profils WHERE mentor_id = user_id). Plus de cercle_personnes. Migration 096.';


-- 4) Nombre de profils par familles : uniquement profils (plus d'hybride avec cercle)
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
'Effectifs par famille : uniquement profils (famille_id). Plus de source cercles. Migration 096.';


-- 5) Nombre de disciples par familles (page Familles de Disciples) : profils par famille_id
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
  SELECT
    f.id AS famille_id,
    (SELECT COUNT(*)::BIGINT FROM profils p WHERE p.famille_id = f.id) AS nb_disciples_cercle
  FROM familles_disciples f
  WHERE f.id = ANY(p_famille_ids);
$$;

COMMENT ON FUNCTION get_nombre_disciples_par_familles(UUID[]) IS
'Effectifs par famille : profils (famille_id). Colonne conservée nb_disciples_cercle pour compat. Plus de cercle. Migration 096.';
