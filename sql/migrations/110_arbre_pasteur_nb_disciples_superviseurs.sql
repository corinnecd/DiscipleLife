-- ============================================
-- Migration 110 : Arbre – badge pasteur = nombre de superviseurs (disciples directs)
-- Remplace le niveau 1 de get_arbre_4_niveaux pour que nb_disciples = COUNT(superviseurs).
-- À exécuter après 103 (et après 109 pour les données).
-- ============================================

CREATE OR REPLACE FUNCTION get_arbre_4_niveaux(p_pasteur_id UUID DEFAULT NULL)
RETURNS TABLE (
  niveau SMALLINT,
  id UUID,
  nom TEXT,
  prenom TEXT,
  parent_id UUID,
  nb_disciples INTEGER,
  role_niveau TEXT,
  famille_nom TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  -- Niveau 1 : Pasteurs. Les disciples directs = les SUPERVISEURS (pas mentor_id).
  RETURN QUERY
  SELECT
    1::SMALLINT AS niveau,
    (p.id)::UUID,
    UPPER(TRIM(COALESCE(p.last_name, '')))::TEXT AS nom,
    TRIM(COALESCE(p.first_name, ''))::TEXT AS prenom,
    NULL::UUID AS parent_id,
    (SELECT COUNT(*)::INTEGER FROM profils s
     WHERE s.role = 'superviseur'
       AND (s.pasteur_id = p.id OR EXISTS (
         SELECT 1 FROM familles_disciples f WHERE f.superviseur_id = s.id AND f.pasteur_id = p.id
       ))) AS nb_disciples,
    'Pasteur'::TEXT AS role_niveau,
    NULL::TEXT AS famille_nom
  FROM profils p
  WHERE p.role = 'pasteur'
    AND (p_pasteur_id IS NULL OR p.id = p_pasteur_id);

  -- Niveau 2 : Superviseurs (parent = pasteur)
  RETURN QUERY
  SELECT
    2::SMALLINT AS niveau,
    (p.id)::UUID,
    UPPER(TRIM(COALESCE(p.last_name, '')))::TEXT AS nom,
    TRIM(COALESCE(p.first_name, ''))::TEXT AS prenom,
    COALESCE(p.pasteur_id, (SELECT f.pasteur_id FROM familles_disciples f WHERE f.superviseur_id = p.id LIMIT 1))::UUID AS parent_id,
    COALESCE(p.nb_disciples, 0)::INTEGER AS nb_disciples,
    'Superviseur'::TEXT AS role_niveau,
    (SELECT f.nom FROM familles_disciples f WHERE f.superviseur_id = p.id LIMIT 1)::TEXT AS famille_nom
  FROM profils p
  WHERE p.role = 'superviseur'
    AND (p_pasteur_id IS NULL OR p.pasteur_id = p_pasteur_id
         OR EXISTS (SELECT 1 FROM familles_disciples f WHERE f.superviseur_id = p.id AND f.pasteur_id = p_pasteur_id));

  -- Niveau 3 : Mentors (parent = superviseur de la famille)
  RETURN QUERY
  SELECT
    3::SMALLINT AS niveau,
    (p.id)::UUID,
    UPPER(TRIM(COALESCE(p.last_name, '')))::TEXT AS nom,
    TRIM(COALESCE(p.first_name, ''))::TEXT AS prenom,
    (SELECT f.superviseur_id FROM familles_disciples f WHERE f.id = p.famille_id LIMIT 1)::UUID AS parent_id,
    COALESCE(p.nb_disciples, 0)::INTEGER AS nb_disciples,
    COALESCE(NULLIF(TRIM(p.titre), ''), 'Mentor')::TEXT AS role_niveau,
    (SELECT f.nom FROM familles_disciples f WHERE f.id = p.famille_id LIMIT 1)::TEXT AS famille_nom
  FROM profils p
  WHERE p.famille_id IS NOT NULL
    AND p.id NOT IN (SELECT superviseur_id FROM familles_disciples WHERE superviseur_id IS NOT NULL)
    AND (p.role IN ('mentor', 'disciple', 'pilier') OR COALESCE(p.nb_disciples, 0) > 0)
    AND (p_pasteur_id IS NULL OR EXISTS (
      SELECT 1 FROM familles_disciples f
      WHERE f.id = p.famille_id AND (f.pasteur_id = p_pasteur_id OR f.superviseur_id IN (SELECT pr.id FROM profils pr WHERE pr.pasteur_id = p_pasteur_id))
    ));

  -- Niveau 4 : Disciples (parent = mentor_id)
  RETURN QUERY
  SELECT
    4::SMALLINT AS niveau,
    (p.id)::UUID,
    UPPER(TRIM(COALESCE(p.last_name, '')))::TEXT AS nom,
    TRIM(COALESCE(p.first_name, ''))::TEXT AS prenom,
    p.mentor_id::UUID AS parent_id,
    0::INTEGER AS nb_disciples,
    'Disciple'::TEXT AS role_niveau,
    (SELECT f.nom FROM familles_disciples f WHERE f.id = p.famille_id LIMIT 1)::TEXT AS famille_nom
  FROM profils p
  WHERE p.mentor_id IS NOT NULL
    AND (p_pasteur_id IS NULL OR EXISTS (
      SELECT 1 FROM profils mentor
      JOIN familles_disciples f ON f.id = mentor.famille_id
      WHERE mentor.id = p.mentor_id
        AND (f.pasteur_id = p_pasteur_id OR f.superviseur_id IN (SELECT pr.id FROM profils pr WHERE pr.pasteur_id = p_pasteur_id))
    ));
END;
$$;

COMMENT ON FUNCTION get_arbre_4_niveaux(UUID) IS
'Arbre 4 niveaux : Pasteur (disciples directs = superviseurs) → Superviseur → Mentor → Disciple. Migration 110.';
