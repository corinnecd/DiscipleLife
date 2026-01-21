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

-- Indexes pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_suivi_user_id ON suivi_post_crise(user_id);
CREATE INDEX IF NOT EXISTS idx_suivi_statut ON suivi_post_crise(statut);
CREATE INDEX IF NOT EXISTS idx_suivi_type_crise ON suivi_post_crise(type_crise);
CREATE INDEX IF NOT EXISTS idx_suivi_date_debut ON suivi_post_crise(date_debut);
CREATE INDEX IF NOT EXISTS idx_suivi_prochain_rappel ON suivi_post_crise(prochain_rappel);
CREATE INDEX IF NOT EXISTS idx_suivi_user_statut ON suivi_post_crise(user_id, statut);

CREATE INDEX IF NOT EXISTS idx_historique_suivi_id ON historique_guerison(suivi_id);
CREATE INDEX IF NOT EXISTS idx_historique_date_suivi ON historique_guerison(date_suivi);
CREATE INDEX IF NOT EXISTS idx_historique_suivi_date ON historique_guerison(suivi_id, date_suivi DESC);

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

-- Politiques RLS pour suivi_post_crise
-- Les utilisateurs peuvent voir leur propre suivi
CREATE POLICY "Users can view their own suivi" ON suivi_post_crise
    FOR SELECT USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer leur propre suivi
CREATE POLICY "Users can create their own suivi" ON suivi_post_crise
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leur propre suivi
CREATE POLICY "Users can update their own suivi" ON suivi_post_crise
    FOR UPDATE USING (user_id = auth.uid());

-- Les utilisateurs peuvent supprimer leur propre suivi
CREATE POLICY "Users can delete their own suivi" ON suivi_post_crise
    FOR DELETE USING (user_id = auth.uid());

-- Les mentors peuvent voir le suivi de leurs disciples
CREATE POLICY "Mentors can view disciples suivi" ON suivi_post_crise
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() 
            AND (role = 'mentor' OR role = 'superviseur' OR role = 'pasteur' OR role = 'admin')
            AND (suivi_post_crise.user_id IN (
                SELECT id FROM cercle_personnes 
                WHERE user_id = auth.uid()
            ) OR suivi_post_crise.mentor_id = auth.uid())
        )
    );

-- Les admins peuvent tout voir
CREATE POLICY "Admins can manage all suivi" ON suivi_post_crise
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques RLS pour historique_guerison
-- Les utilisateurs peuvent voir l'historique de leur suivi
CREATE POLICY "Users can view their own historique" ON historique_guerison
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM suivi_post_crise 
            WHERE id = historique_guerison.suivi_id 
            AND user_id = auth.uid()
        )
    );

-- Les utilisateurs peuvent créer leur propre historique
CREATE POLICY "Users can create their own historique" ON historique_guerison
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM suivi_post_crise 
            WHERE id = historique_guerison.suivi_id 
            AND user_id = auth.uid()
        )
    );

-- Les utilisateurs peuvent mettre à jour leur propre historique
CREATE POLICY "Users can update their own historique" ON historique_guerison
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM suivi_post_crise 
            WHERE id = historique_guerison.suivi_id 
            AND user_id = auth.uid()
        )
    );

-- Les utilisateurs peuvent supprimer leur propre historique
CREATE POLICY "Users can delete their own historique" ON historique_guerison
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM suivi_post_crise 
            WHERE id = historique_guerison.suivi_id 
            AND user_id = auth.uid()
        )
    );

-- Les mentors peuvent voir l'historique de leurs disciples
CREATE POLICY "Mentors can view disciples historique" ON historique_guerison
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM suivi_post_crise 
            WHERE id = historique_guerison.suivi_id 
            AND EXISTS (
                SELECT 1 FROM profils 
                WHERE id = auth.uid() 
                AND (role = 'mentor' OR role = 'superviseur' OR role = 'pasteur' OR role = 'admin')
                AND (suivi_post_crise.user_id IN (
                    SELECT id FROM cercle_personnes 
                    WHERE user_id = auth.uid()
                ) OR suivi_post_crise.mentor_id = auth.uid())
            )
        )
    );

-- Les admins peuvent tout voir
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
