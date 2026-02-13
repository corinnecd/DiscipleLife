-- ============================================
-- Objectif 3 : RLS journal_transformation – WITH CHECK sur INSERT
-- La politique INSERT actuelle n'impose pas user_id = auth.uid() côté base.
-- Ce script remplace la politique INSERT par une version avec WITH CHECK.
-- ============================================

-- Supprimer l'ancienne politique INSERT (sans condition sur user_id)
DROP POLICY IF EXISTS "Users can create their own journal" ON public.journal_transformation;

-- Recréer la politique INSERT avec WITH CHECK : seules les lignes avec user_id = auth.uid() sont autorisées
CREATE POLICY "Users can create their own journal"
  ON public.journal_transformation
  FOR INSERT
  TO public
  WITH CHECK (user_id = auth.uid());
