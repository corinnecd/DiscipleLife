-- ============================================
-- VÉRIFICATION ET CRÉATION DE codes_invitation
-- Version simplifiée et robuste
-- ============================================

-- Créer la fonction update_updated_at_column si elle n'existe pas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ÉTAPE 1 : Vérifier si la table existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'codes_invitation'
    ) THEN
        RAISE NOTICE 'La table codes_invitation n''existe pas. Création en cours...';
        
        -- Créer la table codes_invitation
        CREATE TABLE codes_invitation (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          code TEXT UNIQUE NOT NULL,
          lien_invitation TEXT NOT NULL,
          nombre_invites INTEGER DEFAULT 0,
          nombre_conversions INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        -- Ajouter la contrainte de clé étrangère si la table profils existe
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'profils'
            ) THEN
                ALTER TABLE codes_invitation 
                ADD CONSTRAINT fk_codes_invitation_user_id 
                FOREIGN KEY (user_id) REFERENCES profils(id) ON DELETE CASCADE;
                
                ALTER TABLE codes_invitation 
                ADD CONSTRAINT unique_user_id UNIQUE (user_id);
            END IF;
        END $$;
        
        -- Créer les index
        CREATE INDEX idx_codes_invitation_user_id ON codes_invitation(user_id);
        CREATE INDEX idx_codes_invitation_code ON codes_invitation(code);
        
        -- Créer le trigger
        CREATE TRIGGER update_codes_invitation_updated_at 
            BEFORE UPDATE ON codes_invitation
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
        
        -- Activer RLS
        ALTER TABLE codes_invitation ENABLE ROW LEVEL SECURITY;
        
        -- Créer les politiques RLS
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
        
        CREATE POLICY "Users can insert their own invitation codes" ON codes_invitation
            FOR INSERT 
            WITH CHECK (
                auth.uid() IS NOT NULL 
                AND user_id = auth.uid()
            );
        
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
        
        RAISE NOTICE '✅ Table codes_invitation créée avec succès !';
    ELSE
        RAISE NOTICE 'La table codes_invitation existe déjà.';
        
        -- Vérifier si la colonne lien_invitation existe
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'codes_invitation' 
            AND column_name = 'lien_invitation'
        ) THEN
            RAISE NOTICE 'Ajout de la colonne lien_invitation...';
            
            ALTER TABLE codes_invitation 
            ADD COLUMN lien_invitation TEXT;
            
            UPDATE codes_invitation 
            SET lien_invitation = CONCAT('https://app.disciplelife.com/invitation/', code)
            WHERE lien_invitation IS NULL OR lien_invitation = '';
            
            ALTER TABLE codes_invitation 
            ALTER COLUMN lien_invitation SET NOT NULL;
            
            RAISE NOTICE '✅ Colonne lien_invitation ajoutée !';
        ELSE
            RAISE NOTICE '✅ Colonne lien_invitation existe déjà.';
        END IF;
    END IF;
END $$;

-- ÉTAPE 2 : Vérification finale
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'codes_invitation'
    ) THEN
        RAISE NOTICE '✅ VÉRIFICATION : La table codes_invitation existe maintenant !';
        
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            AND table_name = 'codes_invitation' 
            AND column_name = 'lien_invitation'
        ) THEN
            RAISE NOTICE '✅ VÉRIFICATION : La colonne lien_invitation existe !';
        ELSE
            RAISE WARNING '⚠️ ATTENTION : La colonne lien_invitation est manquante !';
        END IF;
    ELSE
        RAISE EXCEPTION '❌ ERREUR : La table codes_invitation n''a pas pu être créée !';
    END IF;
END $$;

-- ÉTAPE 3 : Créer la table invitations_envoyees si elle n'existe pas
CREATE TABLE IF NOT EXISTS invitations_envoyees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code_invitation_id UUID,
  invitant_id UUID,
  visiteur_id UUID,
  email TEXT,
  telephone TEXT,
  nom TEXT,
  prenom TEXT,
  canal TEXT,
  message TEXT,
  statut TEXT DEFAULT 'envoyee',
  date_envoi TIMESTAMP DEFAULT NOW(),
  date_ouverture TIMESTAMP,
  date_conversion TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Ajouter les contraintes de clé étrangère si les tables existent
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'codes_invitation'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'invitations_envoyees_code_invitation_id_fkey'
        ) THEN
            ALTER TABLE invitations_envoyees 
            ADD CONSTRAINT invitations_envoyees_code_invitation_id_fkey 
            FOREIGN KEY (code_invitation_id) REFERENCES codes_invitation(id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'profils'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'invitations_envoyees_invitant_id_fkey'
        ) THEN
            ALTER TABLE invitations_envoyees 
            ADD CONSTRAINT invitations_envoyees_invitant_id_fkey 
            FOREIGN KEY (invitant_id) REFERENCES profils(id) ON DELETE CASCADE;
        END IF;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'visiteurs'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'invitations_envoyees_visiteur_id_fkey'
        ) THEN
            ALTER TABLE invitations_envoyees 
            ADD CONSTRAINT invitations_envoyees_visiteur_id_fkey 
            FOREIGN KEY (visiteur_id) REFERENCES visiteurs(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Activer RLS pour invitations_envoyees
ALTER TABLE invitations_envoyees ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS pour invitations_envoyees
DROP POLICY IF EXISTS "Users can view their own invitations" ON invitations_envoyees;
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

DROP POLICY IF EXISTS "Users can insert their own invitations" ON invitations_envoyees;
CREATE POLICY "Users can insert their own invitations" ON invitations_envoyees
    FOR INSERT 
    WITH CHECK (
        auth.uid() IS NOT NULL 
        AND invitant_id = auth.uid()
    );

DROP POLICY IF EXISTS "Users can update their own invitations" ON invitations_envoyees;
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

-- Créer les index
CREATE INDEX IF NOT EXISTS idx_invitations_code_invitation_id ON invitations_envoyees(code_invitation_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invitant_id ON invitations_envoyees(invitant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_visiteur_id ON invitations_envoyees(visiteur_id);
CREATE INDEX IF NOT EXISTS idx_invitations_statut ON invitations_envoyees(statut);

-- Message de confirmation final
DO $$
BEGIN
    RAISE NOTICE '✅ Migration terminée avec succès !';
END $$;

