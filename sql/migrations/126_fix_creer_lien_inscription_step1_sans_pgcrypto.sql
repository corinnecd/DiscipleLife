-- ============================================
-- Migration 126 : Fix creer_lien_inscription_step1 sans pgcrypto
-- Remplace gen_random_bytes par md5+random (compatible sans extension)
-- ============================================

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
  -- Token hex 32 chars sans gen_random_bytes (md5 donne 32 hex)
  v_token := md5(random()::text || clock_timestamp()::text);
  v_expire_at := NOW() + INTERVAL '7 days';

  INSERT INTO inscription_step1 (token, email, data_json, expire_at)
  VALUES (v_token, LOWER(TRIM(p_email)), p_data, v_expire_at);

  RETURN QUERY SELECT
    v_token,
    '/signup?token=' || v_token;
END;
$$;

COMMENT ON FUNCTION creer_lien_inscription_step1(TEXT, JSONB) IS 'Crée un token d''inscription étape 1 (sans pgcrypto). L''Edge Function send-inscription-email doit envoyer l''email avec le lien.';
