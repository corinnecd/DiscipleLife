-- ============================================
-- OBJECTIF 3: Module de Suivi Post-Crise
-- Table pour le suivi personnalisé après une crise
-- ============================================

-- Table pour le suivi post-crise
CREATE TABLE IF NOT EXISTS suivi_post_crise (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) ON DELETE CASCADE NOT NULL,
  date_debut DATE NOT NULL DEFAULT CURRENT_DATE,
  type_crise TEXT CHECK (type_crise IN (
    'deuil',
    'divorce',
    'maladie',
    'chomage',
    'trauma',
    'depression',
    'addiction',
    'conflit_familial',
    'crise_spirituelle',
    'autre'
  )) NOT NULL,
  description TEXT, -- Description de la crise
  gravite INTEGER CHECK (gravite >= 1 AND gravite <= 10) DEFAULT 5, -- Gravité de 1 à 10
  objectifs TEXT[], -- Objectifs de guérison/restauration
  etat_actuel TEXT, -- État actuel de la personne
  besoins_specifiques TEXT[], -- Besoins spécifiques identifiés
  ressources_utilisees TEXT[], -- Ressources déjà utilisées ou recommandées
  prochaine_action TEXT, -- Prochaine action prévue
  date_prochaine_action DATE, -- Date de la prochaine action
  rappel_actif BOOLEAN DEFAULT true, -- Activer les rappels
  frequence_rappels TEXT CHECK (frequence_rappels IN ('quotidien', 'hebdomadaire', 'bihebdomadaire', 'mensuel')) DEFAULT 'hebdomadaire',
  dernier_rappel_envoye TIMESTAMP, -- Date du dernier rappel envoyé
  prochain_rappel TIMESTAMP, -- Date du prochain rappel
  statut TEXT CHECK (statut IN ('actif', 'en_amelioration', 'stabilise', 'resolu', 'archive')) DEFAULT 'actif',
  notes TEXT, -- Notes personnelles
  mentor_id UUID REFERENCES profils(id) ON DELETE SET NULL, -- Mentor accompagnateur (optionnel)
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Table pour l'historique de guérison (suivi de l'évolution)
CREATE TABLE IF NOT EXISTS historique_guerison (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  suivi_id UUID REFERENCES suivi_post_crise(id) ON DELETE CASCADE NOT NULL,
  date_suivi DATE NOT NULL DEFAULT CURRENT_DATE,
  etat_mental INTEGER CHECK (etat_mental >= 1 AND etat_mental <= 10) DEFAULT 5, -- État mental de 1 à 10
  etat_spirituel INTEGER CHECK (etat_spirituel >= 1 AND etat_spirituel <= 10) DEFAULT 5, -- État spirituel de 1 à 10
  etat_physique INTEGER CHECK (etat_physique >= 1 AND etat_physique <= 10) DEFAULT 5, -- État physique de 1 à 10
  progres_observes TEXT, -- Progrès observés
  defis_rencontres TEXT, -- Défis rencontrés
  victoires TEXT, -- Victoires/avancées
  versets_bibliques TEXT[], -- Versets bibliques qui ont aidé
  prieres_exaucees TEXT[], -- Prières exaucées
  actions_prises TEXT[], -- Actions concrètes prises
  notes TEXT, -- Notes additionnelles
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- Colonnes manquantes (si la table existait déjà avec un ancien schéma)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'type_crise') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN type_crise TEXT NOT NULL DEFAULT 'autre';
    ALTER TABLE suivi_post_crise ADD CONSTRAINT suivi_post_crise_type_crise_check
      CHECK (type_crise IN ('deuil','divorce','maladie','chomage','trauma','depression','addiction','conflit_familial','crise_spirituelle','autre'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'description') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN description TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'gravite') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN gravite INTEGER DEFAULT 5;
    ALTER TABLE suivi_post_crise ADD CONSTRAINT suivi_post_crise_gravite_check CHECK (gravite >= 1 AND gravite <= 10);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'objectifs') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN objectifs TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'etat_actuel') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN etat_actuel TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'besoins_specifiques') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN besoins_specifiques TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'ressources_utilisees') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN ressources_utilisees TEXT[];
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'prochaine_action') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN prochaine_action TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'date_prochaine_action') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN date_prochaine_action DATE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'rappel_actif') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN rappel_actif BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'frequence_rappels') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN frequence_rappels TEXT DEFAULT 'hebdomadaire';
    ALTER TABLE suivi_post_crise ADD CONSTRAINT suivi_post_crise_frequence_rappels_check CHECK (frequence_rappels IN ('quotidien', 'hebdomadaire', 'bihebdomadaire', 'mensuel'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'dernier_rappel_envoye') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN dernier_rappel_envoye TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'prochain_rappel') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN prochain_rappel TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'statut') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN statut TEXT DEFAULT 'actif';
    ALTER TABLE suivi_post_crise ADD CONSTRAINT suivi_post_crise_statut_check CHECK (statut IN ('actif', 'en_amelioration', 'stabilise', 'resolu', 'archive'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'notes') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'mentor_id') THEN
    ALTER TABLE suivi_post_crise ADD COLUMN mentor_id UUID REFERENCES profils(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Indexes pour améliorer les performances (créés seulement si la colonne existe)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'user_id') THEN
    CREATE INDEX IF NOT EXISTS idx_suivi_user_id ON suivi_post_crise(user_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'statut') THEN
    CREATE INDEX IF NOT EXISTS idx_suivi_statut ON suivi_post_crise(statut);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'type_crise') THEN
    CREATE INDEX IF NOT EXISTS idx_suivi_type_crise ON suivi_post_crise(type_crise);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'date_debut') THEN
    CREATE INDEX IF NOT EXISTS idx_suivi_date_debut ON suivi_post_crise(date_debut);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'prochain_rappel') THEN
    CREATE INDEX IF NOT EXISTS idx_suivi_prochain_rappel ON suivi_post_crise(prochain_rappel);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'user_id') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suivi_post_crise' AND column_name = 'statut') THEN
    CREATE INDEX IF NOT EXISTS idx_suivi_user_statut ON suivi_post_crise(user_id, statut);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'historique_guerison' AND column_name = 'suivi_id') THEN
    CREATE INDEX IF NOT EXISTS idx_historique_suivi_id ON historique_guerison(suivi_id);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'historique_guerison' AND column_name = 'date_suivi') THEN
    CREATE INDEX IF NOT EXISTS idx_historique_date_suivi ON historique_guerison(date_suivi);
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'historique_guerison' AND column_name = 'suivi_id') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'historique_guerison' AND column_name = 'date_suivi') THEN
    CREATE INDEX IF NOT EXISTS idx_historique_suivi_date ON historique_guerison(suivi_id, date_suivi DESC);
  END IF;
END $$;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_suivi_post_crise_updated_at ON suivi_post_crise;
CREATE TRIGGER update_suivi_post_crise_updated_at BEFORE UPDATE ON suivi_post_crise
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_historique_guerison_updated_at ON historique_guerison;
CREATE TRIGGER update_historique_guerison_updated_at BEFORE UPDATE ON historique_guerison
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE suivi_post_crise ENABLE ROW LEVEL SECURITY;
ALTER TABLE historique_guerison ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour suivi_post_crise (DROP IF EXISTS pour réexécution)
DROP POLICY IF EXISTS "Users can view their own suivi" ON suivi_post_crise;
CREATE POLICY "Users can view their own suivi" ON suivi_post_crise
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own suivi" ON suivi_post_crise;
CREATE POLICY "Users can create their own suivi" ON suivi_post_crise
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own suivi" ON suivi_post_crise;
CREATE POLICY "Users can update their own suivi" ON suivi_post_crise
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own suivi" ON suivi_post_crise;
CREATE POLICY "Users can delete their own suivi" ON suivi_post_crise
    FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Mentors can view disciples suivi" ON suivi_post_crise;
CREATE POLICY "Mentors can view disciples suivi" ON suivi_post_crise
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profils p
            WHERE p.id = auth.uid()
            AND (p.role = 'mentor' OR p.role = 'superviseur' OR p.role = 'pasteur' OR p.role = 'admin')
            AND (
                suivi_post_crise.mentor_id = auth.uid()
                OR suivi_post_crise.user_id IN (SELECT id FROM profils WHERE mentor_id = auth.uid())
                OR (p.famille_id IS NOT NULL AND suivi_post_crise.user_id IN (SELECT id FROM profils WHERE famille_id = p.famille_id))
            )
        )
    );

DROP POLICY IF EXISTS "Admins can manage all suivi" ON suivi_post_crise;
CREATE POLICY "Admins can manage all suivi" ON suivi_post_crise
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques RLS pour historique_guerison
DROP POLICY IF EXISTS "Users can view their own historique" ON historique_guerison;
CREATE POLICY "Users can view their own historique" ON historique_guerison
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM suivi_post_crise 
            WHERE id = historique_guerison.suivi_id 
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create their own historique" ON historique_guerison;
CREATE POLICY "Users can create their own historique" ON historique_guerison
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM suivi_post_crise 
            WHERE id = historique_guerison.suivi_id 
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update their own historique" ON historique_guerison;
CREATE POLICY "Users can update their own historique" ON historique_guerison
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM suivi_post_crise 
            WHERE id = historique_guerison.suivi_id 
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete their own historique" ON historique_guerison;
CREATE POLICY "Users can delete their own historique" ON historique_guerison
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM suivi_post_crise 
            WHERE id = historique_guerison.suivi_id 
            AND user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Mentors can view disciples historique" ON historique_guerison;
CREATE POLICY "Mentors can view disciples historique" ON historique_guerison
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM suivi_post_crise 
            WHERE id = historique_guerison.suivi_id 
            AND EXISTS (
                SELECT 1 FROM profils p
                WHERE p.id = auth.uid()
                AND (p.role = 'mentor' OR p.role = 'superviseur' OR p.role = 'pasteur' OR p.role = 'admin')
                AND (
                    suivi_post_crise.mentor_id = auth.uid()
                    OR suivi_post_crise.user_id IN (SELECT id FROM profils WHERE mentor_id = auth.uid())
                    OR (p.famille_id IS NOT NULL AND suivi_post_crise.user_id IN (SELECT id FROM profils WHERE famille_id = p.famille_id))
                )
            )
        )
    );

DROP POLICY IF EXISTS "Admins can manage all historique" ON historique_guerison;
CREATE POLICY "Admins can manage all historique" ON historique_guerison
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM suivi_post_crise 
            WHERE id = historique_guerison.suivi_id 
            AND EXISTS (
                SELECT 1 FROM profils 
                WHERE id = auth.uid() AND role = 'admin'
            )
        )
    );

-- Commentaires pour la documentation
COMMENT ON TABLE suivi_post_crise IS 'Suivi personnalisé après une crise - Objectif 3';
COMMENT ON TABLE historique_guerison IS 'Historique de guérison et restauration - Objectif 3';
