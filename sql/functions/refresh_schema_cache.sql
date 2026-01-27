-- ============================================
-- Script: Rafraîchir le cache de schéma Supabase
-- Objectif: Forcer Supabase à recharger les fonctions dans son cache
-- ============================================

-- Vérifier que la fonction existe
SELECT 
    '=== VÉRIFICATION DE LA FONCTION ===' AS info;

SELECT 
    proname AS function_name,
    pg_get_function_arguments(oid) AS arguments,
    pronargs AS num_arguments,
    prorettype::regtype AS return_type
FROM pg_proc
WHERE proname = 'get_disciples_by_superviseurs'
  AND pronamespace = 'public'::regnamespace;

-- Si la fonction n'existe pas, la recréer
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'get_disciples_by_superviseurs' 
        AND pronamespace = 'public'::regnamespace
    ) THEN
        RAISE NOTICE 'La fonction n''existe pas, création...';
        
        CREATE FUNCTION public.get_disciples_by_superviseurs(superviseur_ids uuid[])
        RETURNS TABLE (
            id uuid,
            user_id uuid
        )
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        STABLE
        AS $$
        BEGIN
            RETURN QUERY
            SELECT cp.id, cp.user_id
            FROM cercle_personnes cp
            WHERE cp.user_id = ANY(superviseur_ids);
        END;
        $$;
        
        GRANT EXECUTE ON FUNCTION public.get_disciples_by_superviseurs(uuid[]) TO authenticated;
        GRANT EXECUTE ON FUNCTION public.get_disciples_by_superviseurs(uuid[]) TO anon;
        
        RAISE NOTICE 'Fonction créée avec succès';
    ELSE
        RAISE NOTICE 'La fonction existe déjà';
    END IF;
END $$;

-- Tester la fonction avec un exemple
SELECT 
    '=== TEST DE LA FONCTION ===' AS info;

-- Tester avec les superviseurs de PS PEGGY NN
SELECT 
    COUNT(*) AS nb_disciples_test
FROM public.get_disciples_by_superviseurs(ARRAY[
    (SELECT id FROM profils WHERE first_name ILIKE '%alain%' AND last_name ILIKE '%sil%' AND role = 'superviseur' LIMIT 1)
]::uuid[]);

-- Note: Pour rafraîchir le cache de Supabase PostgREST, vous devrez peut-être :
-- 1. Attendre quelques secondes
-- 2. Ou redémarrer le service PostgREST dans Supabase Dashboard
-- 3. Ou utiliser l'API Supabase pour invalider le cache
