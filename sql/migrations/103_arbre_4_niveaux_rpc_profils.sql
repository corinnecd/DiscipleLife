-- ============================================
-- Migration 103 : RPC get_arbre_4_niveaux 100 % profils (5 niveaux)
--
-- LOGIQUE DE L'ARBRE ET DES STATS :
-- - Niveau 1 = Pasteur (racine).
-- - Niveau 2 = Superviseurs du pasteur (parent = pasteur).
-- - Niveaux 3, 4, 5 = profondeur selon mentor_id (parent = mon mentor).
-- Pour les stats et l'arbre : à partir du moment où une personne a 1 disciple, elle est Mentor.
-- Dès qu'un disciple a au moins un disciple, il est affiché Mentor.
--
-- PILIER (équipe restreinte) :
-- Un pilier est un membre de l'équipe restreinte du superviseur ou du mentor. Pilier ≠ Berger.
-- - Le superviseur peut upgrader un mentor en pilier (role = 'pilier').
-- - Un mentor peut upgrader un mentor sous sa responsabilité en pilier.
-- En arbre : role_niveau = 'Pilier' si profils.role = 'pilier', sinon Mentor (si a des disciples) ou Disciple.
--
-- BERGER (fonction pastorale, distincte du pilier) :
-- Un berger a la charge pastorale mais n'est pas superviseur d'une famille de 70.
-- À l'inscription, la personne peut indiquer sa fonction (Pasteur, AP, Berger) ; cela apparaît sur sa fiche.
-- La fonction (Pasteur, AP, Berger) n'est pas un niveau dans l'arbre : pour les stats et l'arbre, dès 1 disciple = Mentor.
--
-- Niveau 3 = directs du superviseur ; 4 = mentor de niveau 3 ; 5 = mentor de niveau 4.
-- Source : profils + familles_disciples uniquement.
-- ============================================

DROP FUNCTION IF EXISTS get_arbre_4_niveaux(uuid);

CREATE OR REPLACE FUNCTION get_arbre_4_niveaux(p_pasteur_id UUID DEFAULT NULL)
RETURNS TABLE (
  niveau INT,
  id UUID,
  parent_id UUID,
  nom TEXT,
  prenom TEXT,
  nb_disciples INT,
  role_niveau TEXT,
  famille_nom TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  -- Niveau 1 : Pasteur (racine)
  SELECT
    1 AS niveau,
    p.id,
    NULL::UUID AS parent_id,
    TRIM(COALESCE(p.last_name, '')) AS nom,
    TRIM(COALESCE(p.first_name, '')) AS prenom,
    (SELECT COUNT(*)::INT FROM profils s WHERE s.pasteur_id = p.id AND s.role = 'superviseur') AS nb_disciples,
    'Pasteur'::TEXT AS role_niveau,
    NULL::TEXT AS famille_nom
  FROM profils p
  WHERE p.id = p_pasteur_id AND p.role = 'pasteur'

  UNION ALL

  -- Niveau 2 : Superviseurs du pasteur
  SELECT
    2 AS niveau,
    s.id,
    s.pasteur_id AS parent_id,
    TRIM(COALESCE(s.last_name, '')) AS nom,
    TRIM(COALESCE(s.first_name, '')) AS prenom,
    (SELECT COUNT(*)::INT FROM profils m
     WHERE m.famille_id IN (SELECT f.id FROM familles_disciples f WHERE f.superviseur_id = s.id)
       AND m.mentor_id = s.id) AS nb_disciples,
    'Superviseur'::TEXT AS role_niveau,
    (SELECT TRIM(COALESCE(f.nom, '')) FROM familles_disciples f WHERE f.superviseur_id = s.id LIMIT 1) AS famille_nom
  FROM profils s
  WHERE s.pasteur_id = p_pasteur_id AND s.role = 'superviseur'

  UNION ALL

  -- Niveau 3 : Directs du superviseur. role_niveau = Pilier (équipe restreinte) si role='pilier', sinon Mentor si ≥1 disciple, sinon Disciple. (Berger = fonction fiche, pas niveau arbre.)
  SELECT
    3 AS niveau,
    n3.id,
    n3.mentor_id AS parent_id,
    TRIM(COALESCE(n3.last_name, '')) AS nom,
    TRIM(COALESCE(n3.first_name, '')) AS prenom,
    COALESCE(n3.nb_disciples, 0)::INT AS nb_disciples,
    CASE
      WHEN n3.role = 'pilier' THEN 'Pilier'::TEXT
      WHEN EXISTS (SELECT 1 FROM profils d WHERE d.mentor_id = n3.id) THEN 'Mentor'::TEXT
      ELSE 'Disciple'::TEXT
    END AS role_niveau,
    TRIM(COALESCE(f.nom, ''))::TEXT AS famille_nom
  FROM profils n3
  JOIN familles_disciples f ON f.id = n3.famille_id AND f.superviseur_id = n3.mentor_id
  WHERE f.superviseur_id IN (SELECT id FROM profils WHERE role = 'superviseur' AND pasteur_id = p_pasteur_id)

  UNION ALL

  -- Niveau 4 : parent = niveau 3. Pilier si role='pilier', sinon Mentor si ≥1 disciple, sinon Disciple.
  SELECT
    4 AS niveau,
    n4.id,
    n4.mentor_id AS parent_id,
    TRIM(COALESCE(n4.last_name, '')) AS nom,
    TRIM(COALESCE(n4.first_name, '')) AS prenom,
    COALESCE(n4.nb_disciples, 0)::INT AS nb_disciples,
    CASE
      WHEN n4.role = 'pilier' THEN 'Pilier'::TEXT
      WHEN EXISTS (SELECT 1 FROM profils d WHERE d.mentor_id = n4.id) THEN 'Mentor'::TEXT
      ELSE 'Disciple'::TEXT
    END AS role_niveau,
    (SELECT TRIM(COALESCE(fd.nom, '')) FROM familles_disciples fd JOIN profils mp ON mp.famille_id = fd.id AND mp.id = n4.mentor_id LIMIT 1) AS famille_nom
  FROM profils n4
  WHERE n4.mentor_id IN (
    SELECT n3.id FROM profils n3
    JOIN familles_disciples f ON f.id = n3.famille_id AND f.superviseur_id = n3.mentor_id
    WHERE f.superviseur_id IN (SELECT id FROM profils WHERE role = 'superviseur' AND pasteur_id = p_pasteur_id)
  )

  UNION ALL

  -- Niveau 5 : parent = niveau 4. Pilier si role='pilier', sinon Mentor si ≥1 disciple, sinon Disciple.
  SELECT
    5 AS niveau,
    n5.id,
    n5.mentor_id AS parent_id,
    TRIM(COALESCE(n5.last_name, '')) AS nom,
    TRIM(COALESCE(n5.first_name, '')) AS prenom,
    COALESCE(n5.nb_disciples, 0)::INT AS nb_disciples,
    CASE
      WHEN n5.role = 'pilier' THEN 'Pilier'::TEXT
      WHEN EXISTS (SELECT 1 FROM profils d WHERE d.mentor_id = n5.id) THEN 'Mentor'::TEXT
      ELSE 'Disciple'::TEXT
    END AS role_niveau,
    (SELECT TRIM(COALESCE(fd.nom, '')) FROM familles_disciples fd JOIN profils mp ON mp.famille_id = fd.id AND mp.id = n5.mentor_id LIMIT 1) AS famille_nom
  FROM profils n5
  WHERE n5.mentor_id IN (
    SELECT n4.id FROM profils n4
    WHERE n4.mentor_id IN (
      SELECT n3.id FROM profils n3
      JOIN familles_disciples f ON f.id = n3.famille_id AND f.superviseur_id = n3.mentor_id
      WHERE f.superviseur_id IN (SELECT id FROM profils WHERE role = 'superviseur' AND pasteur_id = p_pasteur_id)
    )
  );
$$;

COMMENT ON FUNCTION get_arbre_4_niveaux(UUID) IS
'Arbre 5 niveaux. Pilier si role=pilier (équipe restreinte). Sinon Mentor si ≥1 disciple, sinon Disciple. Berger = fonction (fiche), pas niveau arbre. 100 % profils.';
