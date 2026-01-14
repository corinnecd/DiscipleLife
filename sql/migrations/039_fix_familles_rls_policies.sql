-- ============================================
-- Migration: Correction des politiques RLS pour familles_disciples
-- Objectif: Permettre à tous les utilisateurs authentifiés de voir les familles
-- ============================================

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Users can view families" ON familles_disciples;
DROP POLICY IF EXISTS "Admins can manage families" ON familles_disciples;

-- Politique : Tous les utilisateurs authentifiés peuvent voir les familles
CREATE POLICY "Users can view families" ON familles_disciples
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Politique : Seuls les admins et super_admins peuvent créer/modifier/supprimer des familles
CREATE POLICY "Admins can manage families" ON familles_disciples
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profils 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profils 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

