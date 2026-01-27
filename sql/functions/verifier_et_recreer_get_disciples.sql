-- ============================================
-- Script: Vérifier et recréer la fonction get_disciples_by_superviseurs
-- Objectif: S'assurer que la fonction existe et est accessible
-- ============================================

-- 1. Vérifier si la fonction existe
SELECT 
    '=== VÉRIFICATION DE LA FONCTION ===' AS info;

SELECT 
    proname AS function_name,
    pg_get_function_arguments(oid) AS arguments,
    pronargs AS num_arguments,
    prorettype::regtype AS return_type,
    CASE 
        WHEN prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END AS security_type
FROM pg_proc
WHERE proname = 'get_disciples_by_superviseurs'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 2. Supprimer la fonction si elle existe (pour la recréer proprement)
DROP FUNCTION IF EXISTS public.get_disciples_by_superviseurs(uuid[]);

-- 3. Recréer la fonction avec toutes les options nécessaires
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

-- 4. Ajouter le commentaire
COMMENT ON FUNCTION public.get_disciples_by_superviseurs(uuid[]) IS 
'Récupère les disciples dans cercle_personnes pour une liste de superviseurs donnée. Utilise SECURITY DEFINER pour contourner les restrictions RLS.';

-- 5. Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.get_disciples_by_superviseurs(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_disciples_by_superviseurs(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION public.get_disciples_by_superviseurs(uuid[]) TO service_role;

-- 6. Vérifier que la fonction a été créée
SELECT 
    '=== FONCTION CRÉÉE ===' AS info;

SELECT 
    'Fonction get_disciples_by_superviseurs créée avec succès' AS status,
    proname AS function_name,
    pg_get_function_arguments(oid) AS arguments,
    CASE 
        WHEN prosecdef THEN '✅ SECURITY DEFINER'
        ELSE '⚠️ SECURITY INVOKER'
    END AS security_type
FROM pg_proc
WHERE proname = 'get_disciples_by_superviseurs'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- 7. Test de la fonction avec un superviseur réel
SELECT 
    '=== TEST DE LA FONCTION ===' AS info;

-- Tester avec Alain SIL (superviseur de PS PEGGY NN)
SELECT 
    COUNT(*) AS nb_disciples_alain_sil
FROM public.get_disciples_by_superviseurs(ARRAY[
    (SELECT id FROM profils WHERE first_name ILIKE '%alain%' AND last_name ILIKE '%sil%' AND role = 'superviseur' LIMIT 1)
]::uuid[]);

-- IMPORTANT: Après avoir exécuté ce script, vous devrez peut-être :
-- 1. Attendre 1-2 minutes pour que Supabase rafraîchisse son cache
-- 2. Ou redémarrer le service PostgREST dans Supabase Dashboard (Settings > API > Restart)
-- 3. Ou vider le cache du navigateur et recharger la page
