-- ============================================
-- Migration 124 : Créer invitation avec nouvelle famille
-- Ajoute p_nom_nouvelle_famille pour créer une famille si "Nouvelle famille" choisi
-- ============================================

DROP FUNCTION IF EXISTS creer_invitation_famille(text, uuid, text);
DROP FUNCTION IF EXISTS creer_invitation_famille(text, uuid, text, text);

CREATE OR REPLACE FUNCTION creer_invitation_famille(
  p_type_role TEXT,
  p_famille_id UUID,
  p_email_invite TEXT DEFAULT NULL,
  p_nom_nouvelle_famille TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  code TEXT,
  token TEXT,
  lien_complet TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_profil RECORD;
  v_famille_id UUID;
  v_invitation invitations_famille;
  v_code TEXT;
  v_token TEXT;
  v_mentor_id UUID;
  v_superviseur_id UUID;
  v_pasteur_id UUID;
  v_expire_at TIMESTAMPTZ := NOW() + INTERVAL '7 days';
  v_is_admin BOOLEAN;
  v_nom_famille TEXT;
  v_identifiant TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  -- Récupérer le profil du créateur
  SELECT pr.role, pr.mentor_id, pr.pasteur_id, f.superviseur_id
  INTO v_profil
  FROM profils pr
  LEFT JOIN familles_disciples f ON f.id = pr.famille_id
  WHERE pr.id = v_uid
  LIMIT 1;

  IF v_profil IS NULL THEN
    RAISE EXCEPTION 'Profil non trouvé';
  END IF;

  v_is_admin := v_profil.role IN ('admin', 'super_admin');

  -- Si p_famille_id est null et p_nom_nouvelle_famille fourni, créer la famille
  IF p_famille_id IS NULL AND NULLIF(TRIM(p_nom_nouvelle_famille), '') IS NOT NULL THEN
    v_nom_famille := TRIM(p_nom_nouvelle_famille);
    v_identifiant := 'FAM' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    WHILE EXISTS (SELECT 1 FROM familles_disciples WHERE identifiant_famille = v_identifiant) LOOP
      v_identifiant := 'FAM' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 4));
    END LOOP;
    INSERT INTO familles_disciples (nom, identifiant_famille, superviseur_id, objectif_disciples, statut)
    VALUES (v_nom_famille, v_identifiant, NULL, 70, 'actif')
    RETURNING id INTO v_famille_id;
    p_famille_id := v_famille_id;
  END IF;

  -- Logique de validation (identique à 123 avec p_famille_id potentiellement mis à jour)
  IF v_is_admin THEN
    IF p_type_role = 'pasteur' THEN
      v_mentor_id := NULL;
      v_superviseur_id := NULL;
      v_pasteur_id := NULL;
    ELSIF p_type_role = 'superviseur' THEN
      v_pasteur_id := v_uid;
    ELSIF p_type_role = 'mentor' THEN
      IF p_famille_id IS NULL THEN
        RAISE EXCEPTION 'famille_id requis pour un mentor';
      END IF;
      SELECT f.superviseur_id, f.pasteur_id INTO v_superviseur_id, v_pasteur_id
      FROM familles_disciples f WHERE f.id = p_famille_id LIMIT 1;
    ELSIF p_type_role = 'disciple' THEN
      IF p_famille_id IS NULL THEN
        RAISE EXCEPTION 'famille_id requis pour un disciple';
      END IF;
      SELECT f.superviseur_id INTO v_superviseur_id FROM familles_disciples f WHERE f.id = p_famille_id LIMIT 1;
      SELECT p.id INTO v_mentor_id FROM profils p WHERE p.famille_id = p_famille_id AND p.role IN ('mentor', 'pilier') LIMIT 1;
    ELSE
      RAISE EXCEPTION 'type_role invalide: %', p_type_role;
    END IF;
  ELSE
    IF p_type_role = 'disciple' THEN
      IF v_profil.role NOT IN ('mentor', 'pilier', 'superviseur') THEN
        RAISE EXCEPTION 'Seul un mentor, pilier ou superviseur peut inviter un disciple';
      END IF;
      IF p_famille_id IS NULL THEN
        RAISE EXCEPTION 'famille_id requis pour un disciple';
      END IF;
      SELECT f.superviseur_id INTO v_superviseur_id FROM familles_disciples f WHERE f.id = p_famille_id LIMIT 1;
      IF v_profil.role = 'superviseur' THEN
        IF v_superviseur_id != v_uid THEN
          RAISE EXCEPTION 'Ce superviseur ne gère pas cette famille';
        END IF;
        v_mentor_id := v_uid;
        v_superviseur_id := v_uid;
      ELSIF v_profil.role IN ('mentor', 'pilier') THEN
        IF NOT EXISTS (SELECT 1 FROM profils WHERE id = v_uid AND famille_id = p_famille_id) THEN
          RAISE EXCEPTION 'Ce mentor n''appartient pas à cette famille';
        END IF;
        v_mentor_id := v_uid;
      END IF;
    ELSIF p_type_role = 'mentor' THEN
      IF v_profil.role != 'superviseur' THEN
        RAISE EXCEPTION 'Seul un superviseur peut inviter un mentor';
      END IF;
      IF p_famille_id IS NULL THEN
        RAISE EXCEPTION 'famille_id requis pour un mentor';
      END IF;
      SELECT f.superviseur_id, f.pasteur_id INTO v_superviseur_id, v_pasteur_id
      FROM familles_disciples f WHERE f.id = p_famille_id LIMIT 1;
      IF v_superviseur_id != v_uid THEN
        RAISE EXCEPTION 'Ce superviseur ne gère pas cette famille';
      END IF;
    ELSIF p_type_role = 'superviseur' THEN
      IF v_profil.role != 'pasteur' THEN
        RAISE EXCEPTION 'Seul un pasteur peut inviter un superviseur';
      END IF;
      v_pasteur_id := v_uid;
      IF p_famille_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM familles_disciples WHERE id = p_famille_id AND superviseur_id IS NOT NULL) THEN
          RAISE EXCEPTION 'Cette famille a déjà un superviseur';
        END IF;
      END IF;
    ELSIF p_type_role = 'pasteur' THEN
      RAISE EXCEPTION 'Seuls les admins peuvent inviter un pasteur';
    ELSE
      RAISE EXCEPTION 'type_role invalide: %', p_type_role;
    END IF;
  END IF;

  -- Générer code et token uniques (sans pgcrypto : md5 + convert_to)
  v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
  v_token := replace(replace(replace(
    encode(convert_to(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT || RANDOM()::TEXT), 'UTF8'), 'base64'),
    '+', '-'), '/', '_'), '=', '');
  WHILE EXISTS (SELECT 1 FROM invitations_famille i WHERE i.code = v_code OR i.token = v_token) LOOP
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    v_token := replace(replace(replace(
      encode(convert_to(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT || RANDOM()::TEXT), 'UTF8'), 'base64'),
      '+', '-'), '/', '_'), '=', '');
  END LOOP;

  INSERT INTO invitations_famille (
    code, token, type_role, famille_id, mentor_id, superviseur_id, pasteur_id,
    email_invite, expire_at, created_by
  )
  VALUES (
    v_code, v_token, p_type_role, p_famille_id, v_mentor_id, v_superviseur_id, v_pasteur_id,
    NULLIF(TRIM(p_email_invite), ''), v_expire_at, v_uid
  )
  RETURNING * INTO v_invitation;

  RETURN QUERY
  SELECT
    v_invitation.id,
    v_invitation.code,
    v_invitation.token,
    ('/inscription/' || v_invitation.token)::TEXT AS lien_complet;
END;
$$;

COMMENT ON FUNCTION creer_invitation_famille(TEXT, UUID, TEXT, TEXT) IS 'Crée une invitation. Si p_famille_id null et p_nom_nouvelle_famille fourni, crée la famille. Admin peut inviter tout rôle.';
