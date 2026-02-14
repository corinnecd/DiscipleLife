-- ============================================
-- Migration 122 : RPC marquer_invitation_utilisee
-- Met à jour used_at sur invitations_famille quand le compte est créé
-- Appelée depuis SignupDisciple après création du profil
-- ============================================

DROP FUNCTION IF EXISTS marquer_invitation_utilisee(uuid);

CREATE OR REPLACE FUNCTION marquer_invitation_utilisee(p_invitation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE invitations_famille
  SET used_at = NOW()
  WHERE id = p_invitation_id
    AND used_at IS NULL;
END;
$$;

COMMENT ON FUNCTION marquer_invitation_utilisee(UUID) IS 'Marque une invitation comme utilisée (used_at). Appelée après création du compte depuis SignupDisciple.';
