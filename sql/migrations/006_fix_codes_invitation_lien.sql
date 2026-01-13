-- ============================================
-- FIX: Corriger la table codes_invitation
-- Ajouter la colonne lien_invitation si elle n'existe pas
-- Vérifier et corriger les politiques RLS
-- ============================================

-- 1. Créer la table si elle n'existe pas
CREATE TABLE IF NOT EXISTS codes_invitation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) ON DELETE CASCADE UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  nombre_invites INTEGER DEFAULT 0,
  nombre_conversions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Ajouter la colonne lien_invitation si elle n'existe pas
DO $$ 
BEGIN
    -- Vérifier si la colonne existe déjà
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'codes_invitation' 
        AND column_name = 'lien_invitation'
    ) THEN
        -- Ajouter la colonne (sans NOT NULL d'abord)
        ALTER TABLE codes_invitation 
        ADD COLUMN lien_invitation TEXT;
        
        -- Mettre à jour les enregistrements existants avec un lien par défaut basé sur le code
        UPDATE codes_invitation 
        SET lien_invitation = CONCAT('https://app.disciplelife.com/invitation/', code)
        WHERE lien_invitation IS NULL OR lien_invitation = '';
        
        -- Rendre la colonne NOT NULL après avoir rempli les valeurs
        ALTER TABLE codes_invitation 
        ALTER COLUMN lien_invitation SET NOT NULL;
        
        RAISE NOTICE 'Colonne lien_invitation ajoutée avec succès';
    ELSE
        RAISE NOTICE 'La colonne lien_invitation existe déjà';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de l''ajout de la colonne: %', SQLERRM;
END $$;

-- 3. Activer RLS si ce n'est pas déjà fait
ALTER TABLE codes_invitation ENABLE ROW LEVEL SECURITY;

-- 4. Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Users can view their own invitation codes" ON codes_invitation;
DROP POLICY IF EXISTS "Users can insert their own invitation codes" ON codes_invitation;
DROP POLICY IF EXISTS "Users can update their own invitation codes" ON codes_invitation;
DROP POLICY IF EXISTS "Users can delete their own invitation codes" ON codes_invitation;

-- 5. Créer les politiques RLS (utiliser auth.uid() pour Supabase Auth)
-- Note: Si vous utilisez une table profils avec un champ id différent, ajustez selon votre schéma

-- Politique SELECT : Les utilisateurs peuvent voir leurs propres codes + admins/mentors peuvent tout voir
CREATE POLICY "Users can view their own invitation codes" ON codes_invitation
    FOR SELECT 
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'mentor')
        )
    );

-- Politique INSERT : Les utilisateurs peuvent créer leurs propres codes
CREATE POLICY "Users can insert their own invitation codes" ON codes_invitation
    FOR INSERT 
    WITH CHECK (user_id = auth.uid());

-- Politique UPDATE : Les utilisateurs peuvent mettre à jour leurs propres codes + admins peuvent tout mettre à jour
CREATE POLICY "Users can update their own invitation codes" ON codes_invitation
    FOR UPDATE 
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    )
    WITH CHECK (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Politique DELETE : Les utilisateurs peuvent supprimer leurs propres codes + admins peuvent tout supprimer
CREATE POLICY "Users can delete their own invitation codes" ON codes_invitation
    FOR DELETE 
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- 6. Créer l'index si nécessaire
CREATE INDEX IF NOT EXISTS idx_codes_invitation_user_id ON codes_invitation(user_id);
CREATE INDEX IF NOT EXISTS idx_codes_invitation_code ON codes_invitation(code);

-- 7. Créer le trigger pour updated_at si nécessaire
-- Vérifier d'abord si la fonction existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe
DROP TRIGGER IF EXISTS update_codes_invitation_updated_at ON codes_invitation;

-- Créer le trigger
CREATE TRIGGER update_codes_invitation_updated_at 
    BEFORE UPDATE ON codes_invitation
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Vérifier que la table invitations_envoyees existe et a les bonnes politiques
CREATE TABLE IF NOT EXISTS invitations_envoyees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_invitation_id UUID REFERENCES codes_invitation(id) ON DELETE CASCADE,
  invitant_id UUID REFERENCES profils(id) ON DELETE CASCADE,
  visiteur_id UUID REFERENCES visiteurs(id) ON DELETE SET NULL,
  email TEXT,
  telephone TEXT,
  nom TEXT,
  prenom TEXT,
  canal TEXT,
  message TEXT,
  statut TEXT DEFAULT 'envoyee' CHECK (statut IN ('envoyee', 'ouverte', 'conversion', 'ignoree')),
  date_envoi TIMESTAMP DEFAULT NOW(),
  date_ouverture TIMESTAMP,
  date_conversion TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Activer RLS pour invitations_envoyees
ALTER TABLE invitations_envoyees ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own invitations" ON invitations_envoyees;
DROP POLICY IF EXISTS "Users can insert their own invitations" ON invitations_envoyees;
DROP POLICY IF EXISTS "Users can update their own invitations" ON invitations_envoyees;
DROP POLICY IF EXISTS "Users can delete their own invitations" ON invitations_envoyees;

-- Créer les politiques RLS pour invitations_envoyees
CREATE POLICY "Users can view their own invitations" ON invitations_envoyees
    FOR SELECT 
    USING (
        invitant_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'mentor')
        )
    );

CREATE POLICY "Users can insert their own invitations" ON invitations_envoyees
    FOR INSERT 
    WITH CHECK (invitant_id = auth.uid());

CREATE POLICY "Users can update their own invitations" ON invitations_envoyees
    FOR UPDATE 
    USING (
        invitant_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'mentor')
        )
    )
    WITH CHECK (
        invitant_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'mentor')
        )
    );

CREATE POLICY "Users can delete their own invitations" ON invitations_envoyees
    FOR DELETE 
    USING (
        invitant_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Commentaires
COMMENT ON TABLE codes_invitation IS 'Codes d''invitation uniques par membre pour le système de parrainage';
COMMENT ON TABLE invitations_envoyees IS 'Suivi des invitations envoyées par les membres';
COMMENT ON COLUMN invitations_envoyees.canal IS 'Canal utilisé: whatsapp, facebook, email, sms, qr_code, autre';
COMMENT ON COLUMN invitations_envoyees.statut IS 'Statut: envoyee, ouverte, conversion, ignoree';


