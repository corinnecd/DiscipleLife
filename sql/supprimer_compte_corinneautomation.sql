-- ============================================
-- Supprimer le compte corinneautomation@gmail.com
-- Pour retester la création d'inscription
-- Exécuter dans Supabase → SQL Editor
-- ============================================

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Récupérer l'ID utilisateur
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE LOWER(TRIM(email)) = 'corinneautomation@gmail.com'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Aucun compte trouvé pour corinneautomation@gmail.com';
    RETURN;
  END IF;

  -- 1. Cercle : annuler parent_disciple_id qui pointe vers ce profil
  UPDATE public.cercle_personnes
  SET parent_disciple_id = NULL
  WHERE parent_disciple_id IN (SELECT id FROM public.cercle_personnes WHERE profil_id = v_user_id);

  -- 2. Supprimer les lignes cercle_personnes de cet utilisateur
  DELETE FROM public.cercle_personnes WHERE profil_id = v_user_id;

  -- 3. Supprimer inscription_step1 (lien en attente si présent)
  DELETE FROM public.inscription_step1 WHERE LOWER(TRIM(email)) = 'corinneautomation@gmail.com';

  -- 4. auth.identities
  DELETE FROM auth.identities WHERE user_id = v_user_id;

  -- 5. profils (les CASCADE/SET NULL des autres tables gèrent les FK)
  DELETE FROM public.profils WHERE id = v_user_id;

  -- 6. auth.users
  DELETE FROM auth.users WHERE id = v_user_id;

  RAISE NOTICE 'Compte corinneautomation@gmail.com supprimé avec succès.';
END;
$$;
