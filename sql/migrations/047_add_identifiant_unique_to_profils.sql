-- ============================================
-- Migration: Ajouter identifiant_unique à la table profils
-- Objectif: Permettre l'identifiant unique pour tous les profils (pasteurs, superviseurs, disciples)
-- ============================================

-- Ajouter la colonne identifiant_unique si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profils' AND column_name = 'identifiant_unique'
    ) THEN
        ALTER TABLE profils 
        ADD COLUMN identifiant_unique TEXT UNIQUE;
        
        -- Créer un index pour améliorer les performances
        CREATE INDEX IF NOT EXISTS idx_profils_identifiant_unique ON profils(identifiant_unique);
        
        RAISE NOTICE 'Colonne identifiant_unique ajoutée à la table profils';
    ELSE
        RAISE NOTICE 'Colonne identifiant_unique existe déjà';
    END IF;
END $$;

-- Commentaire pour documentation
COMMENT ON COLUMN profils.identifiant_unique IS 'Identifiant unique du profil (ex: PASTEUR-001, FAM001-001)';
