-- Migration: Ajouter pasteur_id à la table reports
-- Description: Permet de lier les rapports envoyés par les superviseurs à leur pasteur de tutelle
-- Date: 2025-01-XX

-- Vérifier si la colonne pasteur_id existe déjà, sinon l'ajouter
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'reports' 
        AND column_name = 'pasteur_id'
    ) THEN
        ALTER TABLE reports 
        ADD COLUMN pasteur_id UUID REFERENCES profils(id) ON DELETE SET NULL;
        
        -- Ajouter un index pour améliorer les performances des requêtes
        CREATE INDEX IF NOT EXISTS idx_reports_pasteur_id ON reports(pasteur_id);
        
        -- Ajouter un commentaire pour documenter la colonne
        COMMENT ON COLUMN reports.pasteur_id IS 'Référence au pasteur de tutelle du superviseur qui a envoyé le rapport';
    END IF;
END $$;
