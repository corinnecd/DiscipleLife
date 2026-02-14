-- ============================================
-- Migration 121 : RPC valider_code_invitation
-- Retourne le token si le code est valide (non expiré, non utilisé)
-- Pour rediriger vers /inscription/:token depuis la HomePage
-- ============================================

DROP FUNCTION IF EXISTS valider_code_invitation(text);

CREATE OR REPLACE FUNCTION valider_code_invitation(p_code TEXT)
RETURNS TABLE (token TEXT, type_role TEXT, famille_nom TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.token,
    i.type_role,
    (SELECT f.nom FROM familles_disciples f WHERE f.id = i.famille_id LIMIT 1)
  FROM invitations_famille i
  WHERE UPPER(TRIM(i.code)) = UPPER(TRIM(p_code))
    AND i.used_at IS NULL
    AND i.expire_at > NOW();
END;
$$;

COMMENT ON FUNCTION valider_code_invitation(TEXT) IS 'Valide un code d''invitation. Retourne token, type_role, famille_nom si valide. Appelable sans auth.';
