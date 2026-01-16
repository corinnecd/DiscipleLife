-- ============================================
-- Migration: Ajouter les champs pour les types de rapports
-- Objectif: Permettre les rapports hebdomadaires, mensuels et trimestriels
-- ============================================

-- 1. Ajouter le champ report_type (hebdomadaire, mensuel, trimestriel)
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS report_type TEXT DEFAULT 'mensuel';

-- Ajouter un commentaire
COMMENT ON COLUMN reports.report_type IS 'Type de rapport: hebdomadaire, mensuel, trimestriel';

-- Mettre à jour les rapports existants avec le type mensuel par défaut
UPDATE reports
SET report_type = 'mensuel'
WHERE report_type IS NULL;

-- 2. Ajouter le champ week_number pour les rapports hebdomadaires (1-52)
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS week_number INTEGER;

COMMENT ON COLUMN reports.week_number IS 'Numéro de semaine (1-52) pour les rapports hebdomadaires';

-- 3. Ajouter le champ quarter pour les rapports trimestriels (1-4)
ALTER TABLE reports
ADD COLUMN IF NOT EXISTS quarter INTEGER;

COMMENT ON COLUMN reports.quarter IS 'Trimestre (1-4) pour les rapports trimestriels';

-- 4. Modifier le champ month pour le rendre nullable (car non utilisé pour hebdomadaire et trimestriel)
-- Note: La colonne month existe déjà, on la laisse pour la rétrocompatibilité
-- On peut la rendre nullable si nécessaire

-- 5. Ajouter des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_reports_report_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_week_number ON reports(week_number) WHERE week_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reports_quarter ON reports(quarter) WHERE quarter IS NOT NULL;

-- 6. Vérification: Afficher la structure de la table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'reports'
ORDER BY ordinal_position;
