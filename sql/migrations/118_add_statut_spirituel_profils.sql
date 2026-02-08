-- ============================================
-- Migration 118 : Ajouter la colonne statut_spirituel à profils
-- Utilisée par le dashboard superviseur et les filtres (actif / inactif).
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profils' AND column_name = 'statut_spirituel'
  ) THEN
    ALTER TABLE profils
    ADD COLUMN statut_spirituel TEXT DEFAULT 'actif';
    COMMENT ON COLUMN profils.statut_spirituel IS 'Statut spirituel du disciple : actif ou inactif. Utilisé pour les filtres et badges.';
  END IF;
END $$;
