-- ============================================
-- OBJECTIF 2: Fidéliser les âmes
-- Système de points, badges et programmes de fidélisation
-- ============================================

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Table pour le scoring d'engagement mensuel
CREATE TABLE IF NOT EXISTS engagement_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) ON DELETE CASCADE NOT NULL,
  score_total INTEGER DEFAULT 0 NOT NULL,
  score_presence INTEGER DEFAULT 0 NOT NULL,
  score_priere INTEGER DEFAULT 0 NOT NULL,
  score_resources INTEGER DEFAULT 0 NOT NULL,
  score_service INTEGER DEFAULT 0 NOT NULL,
  score_communaute INTEGER DEFAULT 0 NOT NULL,
  mois TEXT NOT NULL, -- Format: 'YYYY-MM'
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, mois)
);

-- Indexes pour engagement_scores
CREATE INDEX IF NOT EXISTS idx_engagement_scores_user_id ON engagement_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_mois ON engagement_scores(mois);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_user_mois ON engagement_scores(user_id, mois);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_score_total ON engagement_scores(score_total DESC);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_engagement_scores_updated_at ON engagement_scores;
CREATE TRIGGER update_engagement_scores_updated_at BEFORE UPDATE ON engagement_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Table pour l'historique détaillé des actions d'engagement
CREATE TABLE IF NOT EXISTS engagement_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  action_type TEXT CHECK (action_type IN ('presence', 'priere', 'resource', 'service', 'communaute')) NOT NULL,
  points INTEGER DEFAULT 0 NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes pour engagement_history
CREATE INDEX IF NOT EXISTS idx_engagement_history_user_id ON engagement_history(user_id);
CREATE INDEX IF NOT EXISTS idx_engagement_history_date ON engagement_history(date);
CREATE INDEX IF NOT EXISTS idx_engagement_history_action_type ON engagement_history(action_type);
CREATE INDEX IF NOT EXISTS idx_engagement_history_user_date ON engagement_history(user_id, date DESC);

-- 3. Table pour les badges/récompenses
CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT UNIQUE NOT NULL,
  description TEXT,
  icone TEXT, -- Emoji ou nom d'icône (lucide-react)
  conditions JSONB DEFAULT '{}'::jsonb, -- Conditions pour obtenir le badge
  points_requis INTEGER DEFAULT 0,
  categorie TEXT CHECK (categorie IN ('presence', 'priere', 'service', 'communaute', 'general', 'special')) DEFAULT 'general',
  statut TEXT CHECK (statut IN ('actif', 'inactif')) DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Ajouter la colonne statut si elle n'existe pas (pour les tables existantes)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'badges' AND column_name = 'statut'
  ) THEN
    ALTER TABLE badges ADD COLUMN statut TEXT CHECK (statut IN ('actif', 'inactif')) DEFAULT 'actif';
  END IF;
END $$;

-- Indexes pour badges (créés après vérification de la colonne statut)
CREATE INDEX IF NOT EXISTS idx_badges_categorie ON badges(categorie);
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'badges' AND column_name = 'statut'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_badges_statut ON badges(statut);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_badges_points_requis ON badges(points_requis);

-- 4. Table pour les badges obtenus par utilisateur
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE NOT NULL,
  date_obtention TIMESTAMP DEFAULT NOW() NOT NULL,
  notifie BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, badge_id)
);

-- Ajouter la colonne notifie si elle n'existe pas (pour les tables existantes)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_badges' AND column_name = 'notifie'
  ) THEN
    ALTER TABLE user_badges ADD COLUMN notifie BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Indexes pour user_badges
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_date_obtention ON user_badges(date_obtention DESC);
-- Index conditionnel pour notifie (créé seulement si la colonne existe)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_badges' AND column_name = 'notifie'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_user_badges_notifie ON user_badges(notifie) WHERE notifie = false;
  END IF;
END $$;

-- 5. Table pour les programmes de fidélisation
CREATE TABLE IF NOT EXISTS programmes_fidelisation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  duree_jours INTEGER NOT NULL,
  objectifs JSONB DEFAULT '[]'::jsonb, -- Array d'objectifs
  recompenses JSONB DEFAULT '{}'::jsonb, -- Récompenses à la fin
  statut TEXT CHECK (statut IN ('actif', 'inactif', 'termine')) DEFAULT 'actif',
  date_debut DATE,
  date_fin DATE,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Ajouter la colonne statut si elle n'existe pas (pour les tables existantes)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'programmes_fidelisation' AND column_name = 'statut'
  ) THEN
    ALTER TABLE programmes_fidelisation ADD COLUMN statut TEXT CHECK (statut IN ('actif', 'inactif', 'termine')) DEFAULT 'actif';
  END IF;
END $$;

-- Indexes pour programmes_fidelisation (créés après vérification de la colonne statut)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'programmes_fidelisation' AND column_name = 'statut'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_programmes_fidelisation_statut ON programmes_fidelisation(statut);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_programmes_fidelisation_date_debut ON programmes_fidelisation(date_debut);
CREATE INDEX IF NOT EXISTS idx_programmes_fidelisation_date_fin ON programmes_fidelisation(date_fin);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_programmes_fidelisation_updated_at ON programmes_fidelisation;
CREATE TRIGGER update_programmes_fidelisation_updated_at BEFORE UPDATE ON programmes_fidelisation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 6. Table pour le suivi de participation aux programmes
CREATE TABLE IF NOT EXISTS user_programmes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) ON DELETE CASCADE NOT NULL,
  programme_id UUID REFERENCES programmes_fidelisation(id) ON DELETE CASCADE NOT NULL,
  date_inscription TIMESTAMP DEFAULT NOW() NOT NULL,
  date_debut DATE,
  date_fin DATE,
  progression INTEGER DEFAULT 0, -- Pourcentage de progression (0-100)
  statut TEXT CHECK (statut IN ('inscrit', 'en_cours', 'termine', 'abandonne')) DEFAULT 'inscrit',
  objectifs_atteints JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, programme_id)
);

-- Ajouter la colonne statut si elle n'existe pas (pour les tables existantes)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_programmes' AND column_name = 'statut'
  ) THEN
    ALTER TABLE user_programmes ADD COLUMN statut TEXT CHECK (statut IN ('inscrit', 'en_cours', 'termine', 'abandonne')) DEFAULT 'inscrit';
  END IF;
END $$;

-- Indexes pour user_programmes (créés après vérification de la colonne statut)
CREATE INDEX IF NOT EXISTS idx_user_programmes_user_id ON user_programmes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_programmes_programme_id ON user_programmes(programme_id);
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_programmes' AND column_name = 'statut'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_user_programmes_statut ON user_programmes(statut);
  END IF;
END $$;

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_user_programmes_updated_at ON user_programmes;
CREATE TRIGGER update_user_programmes_updated_at BEFORE UPDATE ON user_programmes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS POLICIES
-- ============================================

-- RLS pour engagement_scores
ALTER TABLE engagement_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir leurs propres scores"
ON engagement_scores FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Les admins peuvent voir tous les scores"
ON engagement_scores FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profils
    WHERE profils.id = auth.uid()
    AND profils.role = 'admin'
  )
);

CREATE POLICY "Le système peut créer/mettre à jour les scores"
ON engagement_scores FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS pour engagement_history
ALTER TABLE engagement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir leur propre historique"
ON engagement_history FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Les admins peuvent voir tout l'historique"
ON engagement_history FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profils
    WHERE profils.id = auth.uid()
    AND profils.role = 'admin'
  )
);

CREATE POLICY "Le système peut créer l'historique"
ON engagement_history FOR INSERT
TO authenticated
WITH CHECK (true);

-- RLS pour badges
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tous les utilisateurs authentifiés peuvent voir les badges"
ON badges FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Seuls les admins peuvent gérer les badges"
ON badges FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profils
    WHERE profils.id = auth.uid()
    AND profils.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profils
    WHERE profils.id = auth.uid()
    AND profils.role = 'admin'
  )
);

-- RLS pour user_badges
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir leurs propres badges"
ON user_badges FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Les admins peuvent voir tous les badges utilisateurs"
ON user_badges FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profils
    WHERE profils.id = auth.uid()
    AND profils.role = 'admin'
  )
);

CREATE POLICY "Le système peut attribuer des badges"
ON user_badges FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Le système peut mettre à jour les notifications"
ON user_badges FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- RLS pour programmes_fidelisation
ALTER TABLE programmes_fidelisation ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tous les utilisateurs authentifiés peuvent voir les programmes actifs"
ON programmes_fidelisation FOR SELECT
TO authenticated
USING (statut = 'actif' OR EXISTS (
  SELECT 1 FROM profils
  WHERE profils.id = auth.uid()
  AND profils.role = 'admin'
));

CREATE POLICY "Seuls les admins peuvent gérer les programmes"
ON programmes_fidelisation FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profils
    WHERE profils.id = auth.uid()
    AND profils.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profils
    WHERE profils.id = auth.uid()
    AND profils.role = 'admin'
  )
);

-- RLS pour user_programmes
ALTER TABLE user_programmes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir leurs propres programmes"
ON user_programmes FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Les admins peuvent voir tous les programmes utilisateurs"
ON user_programmes FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profils
    WHERE profils.id = auth.uid()
    AND profils.role = 'admin'
  )
);

CREATE POLICY "Les utilisateurs peuvent s'inscrire aux programmes"
ON user_programmes FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Les utilisateurs peuvent mettre à jour leur progression"
ON user_programmes FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- FONCTIONS UTILITAIRES
-- ============================================

-- Fonction pour calculer/mettre à jour le score d'engagement mensuel
CREATE OR REPLACE FUNCTION calculer_score_engagement(
  p_user_id UUID,
  p_mois TEXT
) RETURNS VOID AS $$
DECLARE
  v_score_presence INTEGER := 0;
  v_score_priere INTEGER := 0;
  v_score_resources INTEGER := 0;
  v_score_service INTEGER := 0;
  v_score_communaute INTEGER := 0;
  v_score_total INTEGER := 0;
BEGIN
  -- Calculer score présence (basé sur historique_presence)
  SELECT COALESCE(COUNT(*) * 10, 0) INTO v_score_presence
  FROM historique_presence
  WHERE visiteur_id IN (
    SELECT id FROM visiteurs WHERE user_id = p_user_id
  )
  AND TO_CHAR(date_presence, 'YYYY-MM') = p_mois;

  -- Calculer score prière (basé sur prayer_sessions ou prayer_requests)
  SELECT COALESCE(COUNT(*) * 5, 0) INTO v_score_priere
  FROM prayer_sessions
  WHERE (disciple_id = p_user_id OR mentor_id = p_user_id)
  AND TO_CHAR(scheduled_date, 'YYYY-MM') = p_mois;

  -- Calculer score ressources (basé sur consommation de ressources)
  SELECT COALESCE(COUNT(*) * 3, 0) INTO v_score_resources
  FROM engagement_history
  WHERE user_id = p_user_id
  AND action_type = 'resource'
  AND TO_CHAR(date, 'YYYY-MM') = p_mois;

  -- Calculer score service (basé sur service/bénévolat)
  SELECT COALESCE(COUNT(*) * 15, 0) INTO v_score_service
  FROM engagement_history
  WHERE user_id = p_user_id
  AND action_type = 'service'
  AND TO_CHAR(date, 'YYYY-MM') = p_mois;

  -- Calculer score communauté (basé sur interactions)
  SELECT COALESCE(COUNT(*) * 5, 0) INTO v_score_communaute
  FROM engagement_history
  WHERE user_id = p_user_id
  AND action_type = 'communaute'
  AND TO_CHAR(date, 'YYYY-MM') = p_mois;

  -- Calculer le score total
  v_score_total := v_score_presence + v_score_priere + v_score_resources + v_score_service + v_score_communaute;

  -- Insérer ou mettre à jour le score
  INSERT INTO engagement_scores (
    user_id, mois, score_total, score_presence, score_priere,
    score_resources, score_service, score_communaute
  )
  VALUES (
    p_user_id, p_mois, v_score_total, v_score_presence, v_score_priere,
    v_score_resources, v_score_service, v_score_communaute
  )
  ON CONFLICT (user_id, mois)
  DO UPDATE SET
    score_total = EXCLUDED.score_total,
    score_presence = EXCLUDED.score_presence,
    score_priere = EXCLUDED.score_priere,
    score_resources = EXCLUDED.score_resources,
    score_service = EXCLUDED.score_service,
    score_communaute = EXCLUDED.score_communaute,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier et attribuer des badges
CREATE OR REPLACE FUNCTION verifier_et_attribuer_badges(
  p_user_id UUID
) RETURNS TABLE(badge_id UUID, badge_nom TEXT) AS $$
DECLARE
  v_badge RECORD;
  v_score_total INTEGER;
  v_conditions_remplies BOOLEAN;
BEGIN
  -- Récupérer le score total actuel (mois en cours)
  SELECT COALESCE(score_total, 0) INTO v_score_total
  FROM engagement_scores
  WHERE user_id = p_user_id
  AND mois = TO_CHAR(CURRENT_DATE, 'YYYY-MM')
  LIMIT 1;

  -- Parcourir tous les badges actifs
  FOR v_badge IN
    SELECT * FROM badges WHERE statut = 'actif'
  LOOP
    -- Vérifier si l'utilisateur a déjà ce badge
    IF NOT EXISTS (
      SELECT 1 FROM user_badges
      WHERE user_id = p_user_id AND badge_id = v_badge.id
    ) THEN
      -- Vérifier les conditions (simplifié - peut être étendu)
      v_conditions_remplies := true;

      -- Vérifier les points requis
      IF v_badge.points_requis > 0 AND v_score_total < v_badge.points_requis THEN
        v_conditions_remplies := false;
      END IF;

      -- Ici, on pourrait ajouter d'autres vérifications basées sur conditions JSONB

      -- Si les conditions sont remplies, attribuer le badge
      IF v_conditions_remplies THEN
        INSERT INTO user_badges (user_id, badge_id, notifie)
        VALUES (p_user_id, v_badge.id, false)
        ON CONFLICT (user_id, badge_id) DO NOTHING;

        -- Retourner le badge attribué
        badge_id := v_badge.id;
        badge_nom := v_badge.nom;
        RETURN NEXT;
      END IF;
    END IF;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTAIRES
-- ============================================

COMMENT ON TABLE engagement_scores IS 'Scores d''engagement mensuels par utilisateur';
COMMENT ON TABLE engagement_history IS 'Historique détaillé des actions d''engagement';
COMMENT ON TABLE badges IS 'Badges/récompenses disponibles';
COMMENT ON TABLE user_badges IS 'Badges obtenus par les utilisateurs';
COMMENT ON TABLE programmes_fidelisation IS 'Programmes de fidélisation structurés';
COMMENT ON TABLE user_programmes IS 'Suivi de participation aux programmes de fidélisation';

