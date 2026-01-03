-- ============================================
-- OBJECTIF 1: SYSTÈME DE PARRAINAGE/INVITATION
-- Table pour les codes d'invitation uniques par membre
-- ============================================

-- Table pour les codes d'invitation
CREATE TABLE IF NOT EXISTS codes_invitation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) ON DELETE CASCADE UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  lien_invitation TEXT NOT NULL,
  nombre_invites INTEGER DEFAULT 0,
  nombre_conversions INTEGER DEFAULT 0, -- nombre de personnes qui ont accepté Christ via ce code
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table pour suivre les invitations envoyées
CREATE TABLE IF NOT EXISTS invitations_envoyees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_invitation_id UUID REFERENCES codes_invitation(id) ON DELETE CASCADE,
  invitant_id UUID REFERENCES profils(id) ON DELETE CASCADE,
  visiteur_id UUID REFERENCES visiteurs(id) ON DELETE SET NULL, -- peut être null si pas encore enregistré
  email TEXT,
  telephone TEXT,
  nom TEXT,
  prenom TEXT,
  canal TEXT, -- 'whatsapp', 'facebook', 'email', 'sms', 'qr_code', 'autre'
  message TEXT,
  statut TEXT DEFAULT 'envoyee' CHECK (statut IN ('envoyee', 'ouverte', 'conversion', 'ignoree')),
  date_envoi TIMESTAMP DEFAULT NOW(),
  date_ouverture TIMESTAMP,
  date_conversion TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_codes_invitation_user_id ON codes_invitation(user_id);
CREATE INDEX IF NOT EXISTS idx_codes_invitation_code ON codes_invitation(code);
CREATE INDEX IF NOT EXISTS idx_invitations_code_invitation_id ON invitations_envoyees(code_invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitant_id ON invitations_envoyees(invitant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_visiteur_id ON invitations_envoyees(visiteur_id);
CREATE INDEX IF NOT EXISTS idx_invitations_statut ON invitations_envoyees(statut);

-- Trigger pour updated_at (supprimer d'abord s'il existe)
DROP TRIGGER IF EXISTS update_codes_invitation_updated_at ON codes_invitation;
CREATE TRIGGER update_codes_invitation_updated_at BEFORE UPDATE ON codes_invitation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Politiques RLS
ALTER TABLE codes_invitation ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations_envoyees ENABLE ROW LEVEL SECURITY;

-- Politiques pour codes_invitation (supprimer d'abord si elles existent)
DROP POLICY IF EXISTS "Users can view their own invitation codes" ON codes_invitation;
CREATE POLICY "Users can view their own invitation codes" ON codes_invitation
    FOR SELECT USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    ));

DROP POLICY IF EXISTS "Users can insert their own invitation codes" ON codes_invitation;
CREATE POLICY "Users can insert their own invitation codes" ON codes_invitation
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own invitation codes" ON codes_invitation;
CREATE POLICY "Users can update their own invitation codes" ON codes_invitation
    FOR UPDATE USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin'
    ));

-- Politiques pour invitations_envoyees (supprimer d'abord si elles existent)
DROP POLICY IF EXISTS "Users can view their own invitations" ON invitations_envoyees;
CREATE POLICY "Users can view their own invitations" ON invitations_envoyees
    FOR SELECT USING (invitant_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    ));

DROP POLICY IF EXISTS "Users can insert their own invitations" ON invitations_envoyees;
CREATE POLICY "Users can insert their own invitations" ON invitations_envoyees
    FOR INSERT WITH CHECK (invitant_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own invitations" ON invitations_envoyees;
CREATE POLICY "Users can update their own invitations" ON invitations_envoyees
    FOR UPDATE USING (invitant_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    ));

-- Commentaires
COMMENT ON TABLE codes_invitation IS 'Codes d''invitation uniques par membre pour le système de parrainage';
COMMENT ON TABLE invitations_envoyees IS 'Suivi des invitations envoyées par les membres';
COMMENT ON COLUMN invitations_envoyees.canal IS 'Canal utilisé: whatsapp, facebook, email, sms, qr_code, autre';
COMMENT ON COLUMN invitations_envoyees.statut IS 'Statut: envoyee, ouverte, conversion, ignoree';

