-- ============================================
-- Fonction RPC: Compter les disciples par superviseurs
-- Objectif: Contourner les restrictions RLS en utilisant une fonction serveur
-- ============================================

-- Supprimer la fonction si elle existe déjà
DROP FUNCTION IF EXISTS public.count_disciples_by_superviseurs(uuid[]);

-- Créer la fonction
CREATE FUNCTION public.count_disciples_by_superviseurs(superviseur_ids uuid[])
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_count bigint;
BEGIN
    SELECT COUNT(*) INTO total_count
    FROM cercle_personnes
    WHERE user_id = ANY(superviseur_ids);
    
    RETURN total_count;
END;
$$;

-- Commentaire
COMMENT ON FUNCTION public.count_disciples_by_superviseurs(uuid[]) IS 
'Compte le nombre total de disciples dans cercle_personnes pour une liste de superviseurs donnée. Utilise SECURITY DEFINER pour contourner les restrictions RLS.';

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.count_disciples_by_superviseurs(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.count_disciples_by_superviseurs(uuid[]) TO anon;

-- Vérifier que la fonction a été créée
SELECT 
    'Fonction créée avec succès' AS status,
    proname AS function_name,
    pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE proname = 'count_disciples_by_superviseurs';
