-- ============================================
-- CRÉATION COMPLÈTE DE LA TABLE codes_invitation
-- Version robuste qui gère tous les cas
-- ============================================

-- 1. Créer la fonction update_updated_at_column si elle n'existe pas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Supprimer la table si elle existe (pour repartir de zéro si nécessaire)
-- DÉCOMMENTEZ LA LIGNE SUIVANTE SEULEMENT SI VOUS VOULEZ TOUT RECRÉER
-- DROP TABLE IF EXISTS codes_invitation CASCADE;

-- 3. Créer la table codes_invitation
CREATE TABLE IF NOT EXISTS codes_invitation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  code TEXT UNIQUE NOT NULL,
  lien_invitation TEXT NOT NULL,
  nombre_invites INTEGER DEFAULT 0,
  nombre_conversions INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_codes_invitation_user_id FOREIGN KEY (user_id) REFERENCES profils(id) ON DELETE CASCADE,
  CONSTRAINT unique_user_id UNIQUE (user_id)
);

-- 4. Ajouter la colonne lien_invitation si elle n'existe pas (pour les tables existantes)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        AND table_name = 'codes_invitation' 
        AND column_name = 'lien_invitation'
    ) THEN
        ALTER TABLE codes_invitation 
        ADD COLUMN lien_invitation TEXT;
        
        -- Mettre à jour les enregistrements existants
        UPDATE codes_invitation 
        SET lien_invitation = CONCAT('https://app.disciplelife.com/invitation/', code)
        WHERE lien_invitation IS NULL OR lien_invitation = '';
        
        -- Rendre NOT NULL après avoir rempli les valeurs
        ALTER TABLE codes_invitation 
        ALTER COLUMN lien_invitation SET NOT NULL;
        
        RAISE NOTICE 'Colonne lien_invitation ajoutée avec succès';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de l''ajout de la colonne: %', SQLERRM;
END $$;

-- 5. Créer les index
CREATE INDEX IF NOT EXISTS idx_codes_invitation_user_id ON codes_invitation(user_id);
CREATE INDEX IF NOT EXISTS idx_codes_invitation_code ON codes_invitation(code);

-- 6. Créer le trigger pour updated_at
DROP TRIGGER IF EXISTS update_codes_invitation_updated_at ON codes_invitation;
CREATE TRIGGER update_codes_invitation_updated_at 
    BEFORE UPDATE ON codes_invitation
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Activer RLS
ALTER TABLE codes_invitation ENABLE ROW LEVEL SECURITY;

-- 8. Supprimer toutes les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own invitation codes" ON codes_invitation;
DROP POLICY IF EXISTS "Users can insert their own invitation codes" ON codes_invitation;
DROP POLICY IF EXISTS "Users can update their own invitation codes" ON codes_invitation;
DROP POLICY IF EXISTS "Users can delete their own invitation codes" ON codes_invitation;
DROP POLICY IF EXISTS "Enable read access for all users" ON codes_invitation;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON codes_invitation;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON codes_invitation;

-- 9. Créer les nouvelles politiques RLS

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

-- Politique INSERT : Les utilisateurs authentifiés peuvent créer leurs propres codes
CREATE POLICY "Users can insert their own invitation codes" ON codes_invitation
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND user_id = auth.uid()
    );

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

-- 10. Créer la table invitations_envoyees si elle n'existe pas
CREATE TABLE IF NOT EXISTS invitations_envoyees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_invitation_id UUID REFERENCES codes_invitation(id) ON DELETE CASCADE,
  invitant_id UUID REFERENCES profils(id) ON DELETE CASCADE,
  visiteur_id UUID REFERENCES visiteurs(id) ON DELETE SET NULL,
  email TEXT,
  telephone TEXT,
  nom TEXT,
  prenom TEXT,
  canal TEXT CHECK (canal IN ('whatsapp', 'facebook', 'email', 'sms', 'qr_code', 'autre')),
  message TEXT,
  statut TEXT DEFAULT 'envoyee' CHECK (statut IN ('envoyee', 'ouverte', 'conversion', 'ignoree')),
  date_envoi TIMESTAMP DEFAULT NOW(),
  date_ouverture TIMESTAMP,
  date_conversion TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 11. Activer RLS pour invitations_envoyees
ALTER TABLE invitations_envoyees ENABLE ROW LEVEL SECURITY;

-- 12. Supprimer les anciennes politiques pour invitations_envoyees
DROP POLICY IF EXISTS "Users can view their own invitations" ON invitations_envoyees;
DROP POLICY IF EXISTS "Users can insert their own invitations" ON invitations_envoyees;
DROP POLICY IF EXISTS "Users can update their own invitations" ON invitations_envoyees;
DROP POLICY IF EXISTS "Users can delete their own invitations" ON invitations_envoyees;

-- 13. Créer les politiques RLS pour invitations_envoyees
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
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND invitant_id = auth.uid()
    );

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

-- 14. Créer les index pour invitations_envoyees
CREATE INDEX IF NOT EXISTS idx_invitations_code_invitation_id ON invitations_envoyees(code_invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitant_id ON invitations_envoyees(invitant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_visiteur_id ON invitations_envoyees(visiteur_id);
CREATE INDEX IF NOT EXISTS idx_invitations_statut ON invitations_envoyees(statut);

-- 15. Commentaires
COMMENT ON TABLE codes_invitation IS 'Codes d''invitation uniques par membre pour le système de parrainage';
COMMENT ON TABLE invitations_envoyees IS 'Suivi des invitations envoyées par les membres';
COMMENT ON COLUMN invitations_envoyees.canal IS 'Canal utilisé: whatsapp, facebook, email, sms, qr_code, autre';
COMMENT ON COLUMN invitations_envoyees.statut IS 'Statut: envoyee, ouverte, conversion, ignoree';

-- 16. Vérification finale
DO $$
BEGIN
    -- Vérifier que la table existe
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'codes_invitation'
    ) THEN
        RAISE NOTICE '✅ Table codes_invitation créée avec succès !';
        
        -- Vérifier que la colonne lien_invitation existe
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'codes_invitation' 
            AND column_name = 'lien_invitation'
        ) THEN
            RAISE NOTICE '✅ Colonne lien_invitation présente !';
        ELSE
            RAISE WARNING '⚠️ Colonne lien_invitation manquante !';
        END IF;
    ELSE
        RAISE EXCEPTION '❌ Erreur : La table codes_invitation n''a pas pu être créée !';
    END IF;
END $$;


