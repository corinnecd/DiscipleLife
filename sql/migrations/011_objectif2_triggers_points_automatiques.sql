-- ============================================
-- OBJECTIF 2: Triggers pour attribution automatique de points
-- Attribution automatique de points d'engagement
-- ============================================

-- 1. Trigger pour attribuer des points lors d'une présence enregistrée
CREATE OR REPLACE FUNCTION attribuer_points_presence()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Récupérer le user_id depuis le visiteur
  SELECT user_id INTO v_user_id
  FROM visiteurs
  WHERE id = NEW.visiteur_id
  LIMIT 1;

  -- Si un user_id est trouvé, enregistrer l'action dans engagement_history
  IF v_user_id IS NOT NULL THEN
    INSERT INTO engagement_history (
      user_id,
      date,
      action_type,
      points,
      details
    )
    VALUES (
      v_user_id,
      NEW.date_presence,
      'presence',
      10, -- 10 points pour une présence
      jsonb_build_object(
        'visiteur_id', NEW.visiteur_id,
        'type_presence', NEW.type_presence,
        'presence_confirmee', NEW.presence_confirmee
      )
    )
    ON CONFLICT DO NOTHING;

    -- Recalculer le score du mois en cours
    PERFORM calculer_score_engagement(v_user_id, TO_CHAR(NEW.date_presence, 'YYYY-MM'));

    -- Vérifier et attribuer des badges
    PERFORM verifier_et_attribuer_badges(v_user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_attribuer_points_presence ON historique_presence;
CREATE TRIGGER trigger_attribuer_points_presence
  AFTER INSERT ON historique_presence
  FOR EACH ROW
  EXECUTE FUNCTION attribuer_points_presence();

-- 2. Trigger pour attribuer des points lors d'une prière planifiée
CREATE OR REPLACE FUNCTION attribuer_points_priere()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Utiliser disciple_id ou mentor_id selon qui a créé la prière
  v_user_id := COALESCE(NEW.disciple_id, NEW.mentor_id);

  -- Si un user_id est trouvé, enregistrer l'action dans engagement_history
  IF v_user_id IS NOT NULL THEN
    INSERT INTO engagement_history (
      user_id,
      date,
      action_type,
      points,
      details
    )
    VALUES (
      v_user_id,
      DATE(NEW.scheduled_date),
      'priere',
      5, -- 5 points pour une prière
      jsonb_build_object(
        'prayer_session_id', NEW.id,
        'prayer_topic', NEW.prayer_topic,
        'status', NEW.status
      )
    )
    ON CONFLICT DO NOTHING;

    -- Recalculer le score du mois en cours
    PERFORM calculer_score_engagement(v_user_id, TO_CHAR(NEW.scheduled_date, 'YYYY-MM'));

    -- Vérifier et attribuer des badges
    PERFORM verifier_et_attribuer_badges(v_user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_attribuer_points_priere ON prayer_sessions;
CREATE TRIGGER trigger_attribuer_points_priere
  AFTER INSERT ON prayer_sessions
  FOR EACH ROW
  WHEN (NEW.status = 'scheduled')
  EXECUTE FUNCTION attribuer_points_priere();

-- 3. Trigger pour attribuer des points lors d'une requête de prière
CREATE OR REPLACE FUNCTION attribuer_points_requete_priere()
RETURNS TRIGGER AS $$
BEGIN
  -- Enregistrer l'action dans engagement_history
  IF NEW.user_id IS NOT NULL THEN
    INSERT INTO engagement_history (
      user_id,
      date,
      action_type,
      points,
      details
    )
    VALUES (
      NEW.user_id,
      DATE(NEW.created_at),
      'priere',
      3, -- 3 points pour une requête de prière
      jsonb_build_object(
        'prayer_request_id', NEW.id,
        'is_urgent', COALESCE(NEW.is_urgent, false)
      )
    )
    ON CONFLICT DO NOTHING;

    -- Recalculer le score du mois en cours
    PERFORM calculer_score_engagement(NEW.user_id, TO_CHAR(NEW.created_at, 'YYYY-MM'));

    -- Vérifier et attribuer des badges
    PERFORM verifier_et_attribuer_badges(NEW.user_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_attribuer_points_requete_priere ON prayer_requests;
CREATE TRIGGER trigger_attribuer_points_requete_priere
  AFTER INSERT ON prayer_requests
  FOR EACH ROW
  EXECUTE FUNCTION attribuer_points_requete_priere();

-- 4. Fonction pour attribuer des points manuellement (pour ressources, service, communauté)
-- Cette fonction peut être appelée depuis le frontend
CREATE OR REPLACE FUNCTION attribuer_points_manuel(
  p_user_id UUID,
  p_action_type TEXT,
  p_points INTEGER DEFAULT 0,
  p_details JSONB DEFAULT '{}'::jsonb
) RETURNS VOID AS $$
BEGIN
  -- Vérifier que l'action_type est valide
  IF p_action_type NOT IN ('presence', 'priere', 'resource', 'service', 'communaute') THEN
    RAISE EXCEPTION 'Type d''action invalide: %', p_action_type;
  END IF;

  -- Enregistrer l'action dans engagement_history
  INSERT INTO engagement_history (
    user_id,
    date,
    action_type,
    points,
    details
  )
  VALUES (
    p_user_id,
    CURRENT_DATE,
    p_action_type,
    p_points,
    p_details
  )
  ON CONFLICT DO NOTHING;

  -- Recalculer le score du mois en cours
  PERFORM calculer_score_engagement(p_user_id, TO_CHAR(CURRENT_DATE, 'YYYY-MM'));

  -- Vérifier et attribuer des badges
  PERFORM verifier_et_attribuer_badges(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonction pour recalculer tous les scores mensuels (à appeler périodiquement)
CREATE OR REPLACE FUNCTION recalculer_scores_mensuels()
RETURNS VOID AS $$
DECLARE
  v_user RECORD;
  v_mois TEXT;
BEGIN
  -- Pour chaque utilisateur
  FOR v_user IN
    SELECT DISTINCT user_id FROM engagement_history
    WHERE user_id IS NOT NULL
  LOOP
    -- Recalculer pour le mois en cours et les 6 derniers mois
    FOR i IN 0..5 LOOP
      v_mois := TO_CHAR(CURRENT_DATE - (i || ' months')::interval, 'YYYY-MM');
      PERFORM calculer_score_engagement(v_user.user_id, v_mois);
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fonction pour vérifier et notifier les nouveaux badges
CREATE OR REPLACE FUNCTION notifier_nouveaux_badges(
  p_user_id UUID
) RETURNS TABLE(badge_id UUID, badge_nom TEXT, badge_icone TEXT) AS $$
DECLARE
  v_badge RECORD;
BEGIN
  -- Vérifier et attribuer les badges
  FOR v_badge IN
    SELECT * FROM verifier_et_attribuer_badges(p_user_id)
  LOOP
    -- Marquer le badge comme non notifié (pour affichage dans l'UI)
    UPDATE user_badges
    SET notifie = false
    WHERE user_id = p_user_id
    AND badge_id = v_badge.badge_id
    AND notifie = false;

    -- Retourner les informations du badge
    SELECT b.id, b.nom, b.icone
    INTO badge_id, badge_nom, badge_icone
    FROM badges b
    WHERE b.id = v_badge.badge_id;

    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON FUNCTION attribuer_points_presence() IS 'Attribue automatiquement 10 points de présence lors de l''enregistrement d''une présence';
COMMENT ON FUNCTION attribuer_points_priere() IS 'Attribue automatiquement 5 points de prière lors de la planification d''une prière';
COMMENT ON FUNCTION attribuer_points_requete_priere() IS 'Attribue automatiquement 3 points de prière lors de la création d''une requête de prière';
COMMENT ON FUNCTION attribuer_points_manuel(UUID, TEXT, INTEGER, JSONB) IS 'Fonction pour attribuer manuellement des points (ressources, service, communauté)';
COMMENT ON FUNCTION recalculer_scores_mensuels() IS 'Recalcule tous les scores mensuels pour tous les utilisateurs';
COMMENT ON FUNCTION notifier_nouveaux_badges(UUID) IS 'Vérifie et retourne les nouveaux badges obtenus par un utilisateur';



