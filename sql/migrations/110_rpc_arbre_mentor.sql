-- ============================================
-- Migration 110 : RPC get_arbre_mentor
-- Retourne les nœuds de l'arbre du mentor (format plat : id, parent_id, nom, prenom, etc.)
-- SECURITY DEFINER pour contourner RLS sur profils
-- Un mentor ne peut récupérer que son propre arbre (p_mentor_id = auth.uid())
-- ============================================

DROP FUNCTION IF EXISTS get_arbre_mentor(uuid, text);

CREATE OR REPLACE FUNCTION get_arbre_mentor(p_mentor_id UUID, p_mode TEXT DEFAULT 'mon_arbre')
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  nom TEXT,
  prenom TEXT,
  avatar_url TEXT,
  role_niveau TEXT,
  nb_disciples INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  v_mentor RECORD;
  v_famille_id UUID;
  v_superviseur_id UUID;
  v_sup RECORD;
BEGIN
  -- Sécurité : seul le mentor peut récupérer son arbre
  IF p_mentor_id IS DISTINCT FROM auth.uid() THEN
    RETURN;
  END IF;

  SELECT profils.id, profils.first_name, profils.last_name, profils.prenom, profils.nom,
         profils.avatar_url, profils.role, profils.famille_id, profils.mentor_id
  INTO v_mentor
  FROM profils
  WHERE profils.id = p_mentor_id
  LIMIT 1;

  IF v_mentor.id IS NULL THEN
    RETURN;
  END IF;

  v_famille_id := v_mentor.famille_id;

  -- Mode ma_place_famille : Superviseur → ... → Mentor → Disciples
  IF p_mode = 'ma_place_famille' AND v_famille_id IS NOT NULL THEN
    SELECT f.superviseur_id INTO v_superviseur_id
    FROM familles_disciples f
    WHERE f.id = v_famille_id
    LIMIT 1;

    IF v_superviseur_id IS NOT NULL THEN
      -- Superviseur (racine)
      SELECT p.id, p.first_name, p.last_name, p.prenom, p.nom, p.avatar_url, p.role
      INTO v_sup
      FROM profils p
      WHERE p.id = v_superviseur_id
      LIMIT 1;
      IF v_sup.id IS NOT NULL THEN
        id := v_sup.id;
        parent_id := NULL;
        nom := TRIM(COALESCE(v_sup.last_name, v_sup.nom, ''));
        prenom := TRIM(COALESCE(v_sup.first_name, v_sup.prenom, ''));
        avatar_url := v_sup.avatar_url;
        role_niveau := COALESCE(v_sup.role, 'Superviseur');
        nb_disciples := (SELECT COUNT(*)::INT FROM profils WHERE mentor_id = v_sup.id);
        RETURN NEXT;
      END IF;
    END IF;
  END IF;

  -- Mentor (racine en mon_arbre, ou enfant du superviseur en ma_place_famille)
  id := v_mentor.id;
  parent_id := CASE WHEN p_mode = 'ma_place_famille' AND v_superviseur_id IS NOT NULL
                    THEN v_superviseur_id
                    ELSE NULL END;
  nom := TRIM(COALESCE(v_mentor.last_name, v_mentor.nom, ''));
  prenom := TRIM(COALESCE(v_mentor.first_name, v_mentor.prenom, ''));
  avatar_url := v_mentor.avatar_url;
  role_niveau := COALESCE(v_mentor.role, 'Mentor');
  nb_disciples := (SELECT COUNT(*)::INT FROM profils WHERE mentor_id = v_mentor.id);
  RETURN NEXT;

  -- Descendants (mentor_id = p_mentor_id ou récursif dans la famille)
  RETURN QUERY
  WITH RECURSIVE descendants AS (
    SELECT p2.id, p2.mentor_id AS parent_id, p2.first_name, p2.last_name, p2.prenom, p2.nom, p2.avatar_url, p2.role
    FROM profils p2
    WHERE p2.mentor_id = p_mentor_id
      AND (v_famille_id IS NULL OR p2.famille_id = v_famille_id)
    UNION ALL
    SELECT p3.id, p3.mentor_id, p3.first_name, p3.last_name, p3.prenom, p3.nom, p3.avatar_url, p3.role
    FROM profils p3
    JOIN descendants d ON p3.mentor_id = d.id
    WHERE (v_famille_id IS NULL OR p3.famille_id = v_famille_id)
  )
  SELECT
    d.id,
    d.parent_id,
    TRIM(COALESCE(d.last_name, d.nom, ''))::TEXT,
    TRIM(COALESCE(d.first_name, d.prenom, ''))::TEXT,
    d.avatar_url,
    COALESCE(d.role, 'Disciple')::TEXT,
    (SELECT COUNT(*)::INT FROM profils p WHERE p.mentor_id = d.id)
  FROM descendants d;
END;
$$;

COMMENT ON FUNCTION get_arbre_mentor(UUID, TEXT) IS
'Arbre du mentor. p_mode: mon_arbre | ma_place_famille. Retourne des lignes (id, parent_id, nom, prenom, ...). SECURITY DEFINER.';
