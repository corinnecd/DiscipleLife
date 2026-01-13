-- ============================================
-- OBJECTIF 2: Système de notifications proactives
-- Notifications pour badges, suggestions, rappels
-- ============================================

-- 1. Table pour les notifications d'engagement
CREATE TABLE IF NOT EXISTS engagement_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) ON DELETE CASCADE NOT NULL,
  type_notification TEXT CHECK (type_notification IN ('badge_obtenu', 'suggestion_action', 'rappel_activite', 'objectif_atteint', 'encouragement')) NOT NULL,
  titre TEXT NOT NULL,
  message TEXT NOT NULL,
  lien_action TEXT, -- URL ou route pour l'action
  lu BOOLEAN DEFAULT false,
  date_creation TIMESTAMP DEFAULT NOW() NOT NULL,
  date_expiration TIMESTAMP, -- Date d'expiration de la notification
  metadata JSONB DEFAULT '{}'::jsonb -- Données supplémentaires
);

-- Indexes pour engagement_notifications
CREATE INDEX IF NOT EXISTS idx_engagement_notifications_user_id ON engagement_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_notifications_lu ON engagement_notifications(lu) WHERE lu = false;
CREATE INDEX IF NOT EXISTS idx_engagement_notifications_date_creation ON engagement_notifications(date_creation DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_notifications_user_lu ON engagement_notifications(user_id, lu);

-- RLS pour engagement_notifications
ALTER TABLE engagement_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir leurs propres notifications"
ON engagement_notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Les utilisateurs peuvent marquer leurs notifications comme lues"
ON engagement_notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Le système peut créer des notifications"
ON engagement_notifications FOR INSERT
TO authenticated
WITH CHECK (true);

-- 2. Fonction pour créer une notification de badge obtenu
CREATE OR REPLACE FUNCTION creer_notification_badge(
  p_user_id UUID,
  p_badge_id UUID
) RETURNS UUID AS $$
DECLARE
  v_badge RECORD;
  v_notification_id UUID;
BEGIN
  -- Récupérer les informations du badge
  SELECT * INTO v_badge
  FROM badges
  WHERE id = p_badge_id;

  IF v_badge IS NULL THEN
    RAISE EXCEPTION 'Badge introuvable: %', p_badge_id;
  END IF;

  -- Créer la notification
  INSERT INTO engagement_notifications (
    user_id,
    type_notification,
    titre,
    message,
    lien_action,
    metadata
  )
  VALUES (
    p_user_id,
    'badge_obtenu',
    '🎉 Nouveau badge obtenu !',
    format('Félicitations ! Vous avez obtenu le badge "%s" : %s', v_badge.nom, v_badge.description),
    '/engagement?tab=badges',
    jsonb_build_object(
      'badge_id', p_badge_id,
      'badge_nom', v_badge.nom,
      'badge_icone', v_badge.icone
    )
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fonction pour créer des suggestions d'actions
CREATE OR REPLACE FUNCTION creer_suggestions_actions(
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  v_score RECORD;
  v_suggestions TEXT[];
  v_suggestion TEXT;
BEGIN
  -- Récupérer le score actuel
  SELECT * INTO v_score
  FROM engagement_scores
  WHERE user_id = p_user_id
  AND mois = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  LIMIT 1;

  -- Si pas de score, créer un score par défaut
  IF v_score IS NULL THEN
    v_score := ROW(0, 0, 0, 0, 0, 0);
  END IF;

  -- Générer des suggestions basées sur les scores les plus bas
  v_suggestions := ARRAY[]::TEXT[];

  -- Suggestion pour présence
  IF v_score.score_presence < 40 THEN
    v_suggestions := array_append(v_suggestions, 'Assistez à un culte cette semaine pour gagner 10 points de présence !');
  END IF;

  -- Suggestion pour prière
  IF v_score.score_priere < 25 THEN
    v_suggestions := array_append(v_suggestions, 'Planifiez une prière aujourd''hui pour gagner 5 points !');
  END IF;

  -- Suggestion pour ressources
  IF v_score.score_resources < 15 THEN
    v_suggestions := array_append(v_suggestions, 'Consultez une ressource biblique pour gagner 3 points !');
  END IF;

  -- Suggestion pour service
  IF v_score.score_service < 15 THEN
    v_suggestions := array_append(v_suggestions, 'Participez à un service communautaire pour gagner 15 points !');
  END IF;

  -- Suggestion pour communauté
  IF v_score.score_communaute < 15 THEN
    v_suggestions := array_append(v_suggestions, 'Interagissez avec la communauté pour gagner 5 points !');
  END IF;

  -- Créer une notification pour chaque suggestion (maximum 3)
  FOR i IN 1..LEAST(array_length(v_suggestions, 1), 3) LOOP
    INSERT INTO engagement_notifications (
      user_id,
      type_notification,
      titre,
      message,
      lien_action,
      date_expiration
    )
    VALUES (
      p_user_id,
      'suggestion_action',
      '💡 Suggestion pour vous',
      v_suggestions[i],
      '/engagement',
      CURRENT_DATE + INTERVAL '7 days'
    )
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Fonction pour créer des rappels d'activités manquées
CREATE OR REPLACE FUNCTION creer_rappels_activites(
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  v_derniere_presence DATE;
  v_derniere_priere DATE;
  v_jours_sans_presence INTEGER;
  v_jours_sans_priere INTEGER;
BEGIN
  -- Vérifier la dernière présence
  SELECT MAX(date_presence) INTO v_derniere_presence
  FROM historique_presence
  WHERE visiteur_id IN (
    SELECT id FROM visiteurs WHERE user_id = p_user_id
  );

  -- Vérifier la dernière prière
  SELECT MAX(DATE(scheduled_date)) INTO v_derniere_priere
  FROM prayer_sessions
  WHERE (disciple_id = p_user_id OR mentor_id = p_user_id)
  AND status = 'scheduled';

  -- Calculer les jours sans activité
  v_jours_sans_presence := COALESCE(CURRENT_DATE - v_derniere_presence, 999);
  v_jours_sans_priere := COALESCE(CURRENT_DATE - v_derniere_priere, 999);

  -- Créer un rappel si pas de présence depuis 7 jours
  IF v_jours_sans_presence >= 7 THEN
    INSERT INTO engagement_notifications (
      user_id,
      type_notification,
      titre,
      message,
      lien_action,
      date_expiration
    )
    VALUES (
      p_user_id,
      'rappel_activite',
      '📅 Rappel de présence',
      format('Vous n''avez pas assisté à un culte depuis %s jours. Rejoignez-nous cette semaine !', v_jours_sans_presence),
      '/attendance',
      CURRENT_DATE + INTERVAL '3 days'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Créer un rappel si pas de prière depuis 3 jours
  IF v_jours_sans_priere >= 3 THEN
    INSERT INTO engagement_notifications (
      user_id,
      type_notification,
      titre,
      message,
      lien_action,
      date_expiration
    )
    VALUES (
      p_user_id,
      'rappel_activite',
      '🙏 Rappel de prière',
      format('Vous n''avez pas planifié de prière depuis %s jours. Prenez un moment pour prier aujourd''hui !', v_jours_sans_priere),
      '/my-prayers',
      CURRENT_DATE + INTERVAL '2 days'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Fonction pour créer des encouragements
CREATE OR REPLACE FUNCTION creer_encouragements(
  p_user_id UUID
) RETURNS VOID AS $$
DECLARE
  v_score_total INTEGER;
  v_messages TEXT[];
  v_message TEXT;
BEGIN
  -- Récupérer le score total du mois
  SELECT COALESCE(score_total, 0) INTO v_score_total
  FROM engagement_scores
  WHERE user_id = p_user_id
  AND mois = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  LIMIT 1;

  -- Messages d'encouragement selon le score
  IF v_score_total >= 500 THEN
    v_message := '🌟 Excellent travail ! Vous êtes un exemple d''engagement. Continuez ainsi !';
  ELSIF v_score_total >= 300 THEN
    v_message := '💪 Vous progressez bien ! Votre engagement est remarquable.';
  ELSIF v_score_total >= 150 THEN
    v_message := '✨ Bon travail ! Vous êtes sur la bonne voie.';
  ELSIF v_score_total >= 50 THEN
    v_message := '🌱 Vous commencez bien ! Continuez à vous engager.';
  ELSE
    v_message := '💫 Chaque petit pas compte ! Commencez par une action aujourd''hui.';
  END IF;

  -- Créer la notification d'encouragement (une fois par semaine maximum)
  IF NOT EXISTS (
    SELECT 1 FROM engagement_notifications
    WHERE user_id = p_user_id
    AND type_notification = 'encouragement'
    AND date_creation > CURRENT_DATE - INTERVAL '7 days'
  ) THEN
    INSERT INTO engagement_notifications (
      user_id,
      type_notification,
      titre,
      message,
      lien_action,
      date_expiration
    )
    VALUES (
      p_user_id,
      'encouragement',
      '💝 Encouragement',
      v_message,
      '/engagement',
      CURRENT_DATE + INTERVAL '7 days'
    )
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Trigger pour créer automatiquement une notification quand un badge est obtenu
CREATE OR REPLACE FUNCTION trigger_notification_badge()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer une notification pour le nouveau badge
  PERFORM creer_notification_badge(NEW.user_id, NEW.badge_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_notification_badge ON user_badges;
CREATE TRIGGER trigger_notification_badge
  AFTER INSERT ON user_badges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_notification_badge();

-- 7. Fonction principale pour générer toutes les notifications proactives
CREATE OR REPLACE FUNCTION generer_notifications_proactives(
  p_user_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Vérifier et attribuer les nouveaux badges (les notifications seront créées automatiquement par le trigger)
  PERFORM verifier_et_attribuer_badges(p_user_id);

  -- Créer des suggestions d'actions
  PERFORM creer_suggestions_actions(p_user_id);

  -- Créer des rappels d'activités
  PERFORM creer_rappels_activites(p_user_id);

  -- Créer des encouragements
  PERFORM creer_encouragements(p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Fonction pour nettoyer les notifications expirées
CREATE OR REPLACE FUNCTION nettoyer_notifications_expirees()
RETURNS VOID AS $$
BEGIN
  DELETE FROM engagement_notifications
  WHERE date_expiration IS NOT NULL
  AND date_expiration < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE engagement_notifications IS 'Notifications proactives pour l''engagement des utilisateurs';
COMMENT ON FUNCTION creer_notification_badge(UUID, UUID) IS 'Crée une notification lorsqu''un badge est obtenu';
COMMENT ON FUNCTION creer_suggestions_actions(UUID) IS 'Génère des suggestions d''actions basées sur les scores';
COMMENT ON FUNCTION creer_rappels_activites(UUID) IS 'Crée des rappels pour les activités manquées';
COMMENT ON FUNCTION creer_encouragements(UUID) IS 'Crée des messages d''encouragement personnalisés';
COMMENT ON FUNCTION generer_notifications_proactives(UUID) IS 'Fonction principale pour générer toutes les notifications proactives';
COMMENT ON FUNCTION nettoyer_notifications_expirees() IS 'Nettoie les notifications expirées';

