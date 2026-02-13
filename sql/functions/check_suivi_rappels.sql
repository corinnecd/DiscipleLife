-- ============================================
-- Fonction pour vérifier et générer les rappels de suivi post-crise
-- À exécuter périodiquement (via cron job ou trigger)
-- ============================================

CREATE OR REPLACE FUNCTION check_suivi_rappels()
RETURNS TABLE (
  suivi_id UUID,
  user_id UUID,
  type_crise TEXT,
  description TEXT,
  prochain_rappel TIMESTAMP,
  frequence_rappels TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    spc.id AS suivi_id,
    spc.user_id,
    spc.type_crise,
    spc.description,
    spc.prochain_rappel,
    spc.frequence_rappels
  FROM suivi_post_crise spc
  WHERE spc.rappel_actif = true
    AND spc.statut IN ('actif', 'en_amelioration')
    AND (
      spc.prochain_rappel IS NULL 
      OR spc.prochain_rappel <= NOW()
    );
END;
$$;

-- ============================================
-- Fonction pour mettre à jour le prochain rappel
-- ============================================

CREATE OR REPLACE FUNCTION update_prochain_rappel(p_suivi_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_frequence TEXT;
  v_interval INTERVAL;
BEGIN
  -- Récupérer la fréquence du suivi
  SELECT frequence_rappels INTO v_frequence
  FROM suivi_post_crise
  WHERE id = p_suivi_id;

  -- Calculer l'intervalle selon la fréquence
  CASE v_frequence
    WHEN 'quotidien' THEN v_interval := '1 day'::INTERVAL;
    WHEN 'hebdomadaire' THEN v_interval := '7 days'::INTERVAL;
    WHEN 'bihebdomadaire' THEN v_interval := '14 days'::INTERVAL;
    WHEN 'mensuel' THEN v_interval := '30 days'::INTERVAL;
    ELSE v_interval := '7 days'::INTERVAL; -- Par défaut hebdomadaire
  END CASE;

  -- Mettre à jour les dates de rappel
  UPDATE suivi_post_crise
  SET 
    dernier_rappel_envoye = NOW(),
    prochain_rappel = NOW() + v_interval,
    updated_at = NOW()
  WHERE id = p_suivi_id;
END;
$$;

-- ============================================
-- Fonction pour créer une notification de rappel
-- (Suppose l'existence d'une table notifications)
-- ============================================

CREATE OR REPLACE FUNCTION create_suivi_notification(
  p_user_id UUID,
  p_suivi_id UUID,
  p_type_crise TEXT,
  p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
  v_message TEXT;
BEGIN
  -- Construire le message de notification
  v_message := format(
    'Rappel de suivi post-crise : %s. %s',
    p_type_crise,
    COALESCE(SUBSTRING(p_description, 1, 100), '')
  );

  -- Créer la notification (adapter selon votre schéma de table notifications)
  -- Si la table n'existe pas encore, cette partie peut être commentée
  /*
  INSERT INTO notifications (user_id, type, message, link, read, created_at)
  VALUES (
    p_user_id,
    'suivi_post_crise',
    v_message,
    '/suivi-post-crise/' || p_suivi_id,
    false,
    NOW()
  )
  RETURNING id INTO v_notification_id;
  */

  -- Pour l'instant, on retourne juste un UUID fictif
  v_notification_id := uuid_generate_v4();

  RETURN v_notification_id;
END;
$$;

-- ============================================
-- Fonction principale pour traiter tous les rappels en attente
-- ============================================

CREATE OR REPLACE FUNCTION process_all_suivi_rappels()
RETURNS TABLE (
  processed_count INTEGER,
  notifications_created INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_suivi RECORD;
  v_processed_count INTEGER := 0;
  v_notifications_created INTEGER := 0;
  v_notification_id UUID;
BEGIN
  -- Parcourir tous les suivis nécessitant un rappel
  FOR v_suivi IN 
    SELECT * FROM check_suivi_rappels()
  LOOP
    -- Créer une notification
    v_notification_id := create_suivi_notification(
      v_suivi.user_id,
      v_suivi.suivi_id,
      v_suivi.type_crise,
      v_suivi.description
    );

    -- Mettre à jour le prochain rappel
    PERFORM update_prochain_rappel(v_suivi.suivi_id);

    v_processed_count := v_processed_count + 1;
    IF v_notification_id IS NOT NULL THEN
      v_notifications_created := v_notifications_created + 1;
    END IF;
  END LOOP;

  RETURN QUERY SELECT v_processed_count, v_notifications_created;
END;
$$;

-- ============================================
-- Commentaires pour la documentation
-- ============================================

COMMENT ON FUNCTION check_suivi_rappels() IS 'Vérifie les suivis post-crise nécessitant un rappel';
COMMENT ON FUNCTION update_prochain_rappel(UUID) IS 'Met à jour la date du prochain rappel pour un suivi';
COMMENT ON FUNCTION create_suivi_notification(UUID, UUID, TEXT, TEXT) IS 'Crée une notification de rappel pour un suivi';
COMMENT ON FUNCTION process_all_suivi_rappels() IS 'Traite tous les rappels en attente et crée les notifications';

-- ============================================
-- Exemple d'utilisation
-- ============================================

-- Pour vérifier les suivis nécessitant un rappel :
-- SELECT * FROM check_suivi_rappels();

-- Pour traiter tous les rappels en attente :
-- SELECT * FROM process_all_suivi_rappels();

-- Pour mettre à jour manuellement un rappel spécifique :
-- SELECT update_prochain_rappel('UUID_DU_SUIVI');
