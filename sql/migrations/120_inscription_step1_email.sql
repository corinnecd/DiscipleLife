-- ============================================
-- Migration 120 : Inscription étape 1 - envoi email avec lien formulaire intégral
-- Quand l'utilisateur valide le formulaire simplifié, un email est envoyé
-- avec un lien vers /signup?token=xxx (formulaire complet)
-- ============================================

CREATE TABLE IF NOT EXISTS inscription_step1 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  data_json JSONB NOT NULL,
  expire_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inscription_step1_token ON inscription_step1(token);
CREATE INDEX IF NOT EXISTS idx_inscription_step1_email ON inscription_step1(email);
CREATE INDEX IF NOT EXISTS idx_inscription_step1_expire_at ON inscription_step1(expire_at);

COMMENT ON TABLE inscription_step1 IS 'Données inscription étape 1 en attente. Email envoyé avec lien /signup?token=xxx.';

-- RPC : créer un lien d'inscription étape 1 (appelable sans auth)
DROP FUNCTION IF EXISTS creer_lien_inscription_step1(TEXT, JSONB);

CREATE OR REPLACE FUNCTION creer_lien_inscription_step1(p_email TEXT, p_data JSONB)
RETURNS TABLE (token TEXT, lien_complet TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_expire_at TIMESTAMPTZ;
BEGIN
  v_token := encode(gen_random_bytes(32), 'hex');
  v_expire_at := NOW() + INTERVAL '7 days';

  INSERT INTO inscription_step1 (token, email, data_json, expire_at)
  VALUES (v_token, LOWER(TRIM(p_email)), p_data, v_expire_at);

  RETURN QUERY SELECT
    v_token,
    '/signup?token=' || v_token;
END;
$$;

COMMENT ON FUNCTION creer_lien_inscription_step1(TEXT, JSONB) IS 'Crée un token d''inscription étape 1. L''Edge Function send-inscription-email doit envoyer l''email avec le lien.';

-- RPC : récupérer les données inscription_step1 par token (pour préremplir le formulaire /signup)
DROP FUNCTION IF EXISTS get_inscription_step1_by_token(TEXT);

CREATE OR REPLACE FUNCTION get_inscription_step1_by_token(p_token TEXT)
RETURNS TABLE (email TEXT, data_json JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT i.email, i.data_json
  FROM inscription_step1 i
  WHERE i.token = p_token
    AND i.used_at IS NULL
    AND i.expire_at > NOW();
END;
$$;

COMMENT ON FUNCTION get_inscription_step1_by_token(TEXT) IS 'Récupère les données inscription étape 1 par token. Préremplit le formulaire /signup.';
