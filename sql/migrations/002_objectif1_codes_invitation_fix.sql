-- ============================================
-- FIX: Ajouter la colonne lien_invitation si elle n'existe pas
-- ============================================

-- Vérifier et ajouter la colonne lien_invitation si elle n'existe pas
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

