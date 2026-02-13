-- ============================================
-- Migration 111 : Table invitations_famille
-- Invitations pour rejoindre une famille (validation hiérarchique)
-- Disciple ← mentor | Mentor ← superviseur | Superviseur ← pasteur
-- ============================================

-- Table invitations_famille
CREATE TABLE IF NOT EXISTS invitations_famille (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  type_role TEXT NOT NULL CHECK (type_role IN ('disciple', 'mentor', 'superviseur')),
  famille_id UUID REFERENCES familles_disciples(id) ON DELETE SET NULL,
  mentor_id UUID REFERENCES profils(id) ON DELETE SET NULL,
  superviseur_id UUID REFERENCES profils(id) ON DELETE SET NULL,
  pasteur_id UUID REFERENCES profils(id) ON DELETE SET NULL,
  email_invite TEXT,
  expire_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_by UUID REFERENCES profils(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_famille_token ON invitations_famille(token);
CREATE INDEX IF NOT EXISTS idx_invitations_famille_code ON invitations_famille(code);
CREATE INDEX IF NOT EXISTS idx_invitations_famille_expire_at ON invitations_famille(expire_at);
CREATE INDEX IF NOT EXISTS idx_invitations_famille_created_by ON invitations_famille(created_by);

COMMENT ON TABLE invitations_famille IS 'Invitations pour rejoindre une famille. Disciple validé par mentor, Mentor par superviseur, Superviseur par pasteur.';
COMMENT ON COLUMN invitations_famille.token IS 'Token unique pour le lien /inscription/{token}';
COMMENT ON COLUMN invitations_famille.code IS 'Code affichable (pour double validation par email)';

-- RLS
ALTER TABLE invitations_famille ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Valider token invitation (lecture publique par token)" ON invitations_famille;
-- Pas de policy SELECT classique : la lecture se fait via RPC valider_invitation_token (SECURITY DEFINER)

DROP POLICY IF EXISTS "Createur peut voir ses invitations" ON invitations_famille;
CREATE POLICY "Createur peut voir ses invitations" ON invitations_famille
  FOR SELECT USING (created_by = auth.uid());

DROP POLICY IF EXISTS "Validateurs peuvent créer invitations" ON invitations_famille;
CREATE POLICY "Validateurs peuvent créer invitations" ON invitations_famille
  FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Admins peuvent tout voir" ON invitations_famille;
CREATE POLICY "Admins peuvent tout voir" ON invitations_famille
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
  );

-- ============================================
-- RPC : valider_invitation_token
-- Retourne les infos d'invitation si le token est valide (non expiré, non utilisé)
-- Appelable sans auth (utilisateur pas encore inscrit)
-- ============================================
DROP FUNCTION IF EXISTS valider_invitation_token(text);

CREATE OR REPLACE FUNCTION valider_invitation_token(p_token TEXT)
RETURNS TABLE (
  id UUID,
  type_role TEXT,
  famille_id UUID,
  famille_nom TEXT,
  code TEXT,
  email_invite TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.id,
    i.type_role,
    i.famille_id,
    (SELECT f.nom FROM familles_disciples f WHERE f.id = i.famille_id LIMIT 1),
    i.code,
    i.email_invite
  FROM invitations_famille i
  WHERE i.token = p_token
    AND i.used_at IS NULL
    AND i.expire_at > NOW();
END;
$$;

COMMENT ON FUNCTION valider_invitation_token(TEXT) IS 'Valide un token d''invitation. Retourne les infos si valide. SECURITY DEFINER.';

-- ============================================
-- RPC : creer_invitation_famille
-- Crée une invitation. Le créateur doit être le validateur autorisé.
-- ============================================
DROP FUNCTION IF EXISTS creer_invitation_famille(text, uuid, text);

CREATE OR REPLACE FUNCTION creer_invitation_famille(
  p_type_role TEXT,
  p_famille_id UUID,
  p_email_invite TEXT DEFAULT NULL
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
  v_famille RECORD;
  v_invitation invitations_famille;
  v_code TEXT;
  v_token TEXT;
  v_mentor_id UUID;
  v_superviseur_id UUID;
  v_pasteur_id UUID;
  v_expire_at TIMESTAMPTZ := NOW() + INTERVAL '7 days';
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

  -- Vérifier que le créateur est le validateur autorisé
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
    -- Pour superviseur, famille_id peut être null (nouvelle famille à créer) ou une famille sans superviseur
    IF p_famille_id IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM familles_disciples WHERE id = p_famille_id AND superviseur_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Cette famille a déjà un superviseur';
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'type_role invalide: %', p_type_role;
  END IF;

  -- Générer code et token uniques
  v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
  v_token := encode(gen_random_bytes(24), 'base64url');
  -- S'assurer unicité
  WHILE EXISTS (SELECT 1 FROM invitations_famille WHERE code = v_code OR token = v_token) LOOP
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    v_token := encode(gen_random_bytes(24), 'base64url');
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

COMMENT ON FUNCTION creer_invitation_famille(TEXT, UUID, TEXT) IS 'Crée une invitation. Validateur: mentor/pilier/superviseur pour disciple, superviseur pour mentor, pasteur pour superviseur. SECURITY DEFINER.';
