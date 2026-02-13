-- ============================================
-- Objectif 3 : RLS – WITH CHECK sur INSERT pour toutes les tables user_id
-- Garantit que chaque table n'accepte en INSERT que les lignes où l'utilisateur
-- est bien le propriétaire (user_id = auth.uid() ou suivi détenu par l'utilisateur).
-- journal_transformation est corrigée en 108 ; ici : user_parcours_progression,
-- evaluations_croissance, suivi_post_crise, historique_guerison.
-- Les blocs ne s'exécutent que si la table existe (migration 073 optionnelle).
-- ============================================

-- ----------------------------------------
-- 1. user_parcours_progression
-- ----------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_parcours_progression') THEN
    DROP POLICY IF EXISTS "Users can create their own progression" ON public.user_parcours_progression;
    CREATE POLICY "Users can create their own progression"
      ON public.user_parcours_progression
      FOR INSERT
      TO public
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ----------------------------------------
-- 2. evaluations_croissance
-- ----------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'evaluations_croissance') THEN
    DROP POLICY IF EXISTS "Users can create their own evaluations" ON public.evaluations_croissance;
    CREATE POLICY "Users can create their own evaluations"
      ON public.evaluations_croissance
      FOR INSERT
      TO public
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ----------------------------------------
-- 3. suivi_post_crise
-- ----------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suivi_post_crise') THEN
    DROP POLICY IF EXISTS "Users can create their own suivi" ON public.suivi_post_crise;
    CREATE POLICY "Users can create their own suivi"
      ON public.suivi_post_crise
      FOR INSERT
      TO public
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ----------------------------------------
-- 4. historique_guerison
-- (l'utilisateur ne peut insérer que pour un suivi dont il est propriétaire)
-- ----------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'historique_guerison') THEN
    DROP POLICY IF EXISTS "Users can create their own historique" ON public.historique_guerison;
    CREATE POLICY "Users can create their own historique"
      ON public.historique_guerison
      FOR INSERT
      TO public
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM suivi_post_crise
          WHERE id = historique_guerison.suivi_id
            AND user_id = auth.uid()
        )
      );
  END IF;
END $$;
