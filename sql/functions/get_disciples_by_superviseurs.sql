-- ============================================
-- Fonction RPC: Récupérer les disciples par superviseurs
-- Objectif: Contourner les restrictions RLS en utilisant une fonction serveur
-- ============================================

-- Supprimer la fonction si elle existe déjà
DROP FUNCTION IF EXISTS public.get_disciples_by_superviseurs(uuid[]);

-- Créer la fonction qui retourne les IDs des disciples
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

-- Commentaire
COMMENT ON FUNCTION public.get_disciples_by_superviseurs(uuid[]) IS 
'Récupère les disciples dans cercle_personnes pour une liste de superviseurs donnée. Utilise SECURITY DEFINER pour contourner les restrictions RLS.';

-- Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION public.get_disciples_by_superviseurs(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_disciples_by_superviseurs(uuid[]) TO anon;

-- Vérifier que la fonction a été créée
SELECT 
    'Fonction get_disciples_by_superviseurs créée avec succès' AS status,
    proname AS function_name,
    pg_get_function_arguments(oid) AS arguments
FROM pg_proc
WHERE proname = 'get_disciples_by_superviseurs';
