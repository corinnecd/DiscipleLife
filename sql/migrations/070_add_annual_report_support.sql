-- ============================================
-- Migration: Ajouter le support des rapports annuels
-- Objectif: Permettre les rapports annuels en plus des rapports hebdomadaires, mensuels et trimestriels
-- ============================================

-- 1. Mettre à jour le commentaire de report_type pour inclure 'annuel'
COMMENT ON COLUMN reports.report_type IS 'Type de rapport: hebdomadaire, mensuel, trimestriel, annuel';

-- 2. Ajouter un champ year pour les rapports annuels (si pas déjà présent)
-- Note: Le champ year existe déjà pour les rapports mensuels, on peut l'utiliser aussi pour les annuels

-- 3. Vérifier que le champ year existe et est bien configuré
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'reports' AND column_name = 'year'
    ) THEN
        ALTER TABLE reports ADD COLUMN year INTEGER;
        COMMENT ON COLUMN reports.year IS 'Année pour les rapports mensuels, trimestriels et annuels';
    END IF;
END $$;

-- 4. Ajouter un index pour améliorer les performances des requêtes annuelles
CREATE INDEX IF NOT EXISTS idx_reports_year ON reports(year) WHERE year IS NOT NULL;

-- 5. Mettre à jour les rapports existants pour s'assurer qu'ils ont une année
UPDATE reports
SET year = EXTRACT(YEAR FROM created_at)::INTEGER
WHERE year IS NULL;

-- 6. Vérification: Afficher la structure de la table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'reports'
AND column_name IN ('report_type', 'year', 'month', 'week_number', 'quarter')
ORDER BY ordinal_position;
