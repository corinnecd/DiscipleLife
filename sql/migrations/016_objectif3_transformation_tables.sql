-- ============================================
-- OBJECTIF 3: Édifier, construire, guérir et transformer les vies
-- Tables pour les parcours de transformation, journal et évaluations
-- ============================================

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 1. Table pour les parcours de transformation
CREATE TABLE IF NOT EXISTS parcours_transformation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  thematique TEXT NOT NULL, -- Thématique principale du parcours
  duree_jours INTEGER DEFAULT 30, -- Durée estimée en jours
  niveau TEXT CHECK (niveau IN ('debutant', 'intermediaire', 'avance')) DEFAULT 'debutant',
  objectifs JSONB DEFAULT '[]'::jsonb, -- Objectifs du parcours
  image_url TEXT, -- URL de l'image du parcours
  statut TEXT CHECK (statut IN ('actif', 'inactif', 'brouillon')) DEFAULT 'actif',
  ordre_affichage INTEGER DEFAULT 0, -- Ordre d'affichage
  categorie TEXT CHECK (categorie IN (
    'identite_christ',
    'fondements_royaume',
    'restauration_ame',
    'deploiement',
    'finances',
    'vie_famille',
    'marcher_esprit',
    'discipolat'
  )), -- Catégorie du parcours
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Table pour les modules d'un parcours
CREATE TABLE IF NOT EXISTS modules_parcours (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parcours_id UUID REFERENCES parcours_transformation(id) ON DELETE CASCADE NOT NULL,
  titre TEXT NOT NULL,
  description TEXT,
  contenu TEXT, -- Contenu détaillé du module (markdown ou HTML)
  type_contenu TEXT CHECK (type_contenu IN ('texte', 'video', 'audio', 'interactif', 'mixte')) DEFAULT 'texte',
  duree_estimee INTEGER DEFAULT 15, -- Durée estimée en minutes
  ordre INTEGER NOT NULL, -- Ordre dans le parcours
  ressources JSONB DEFAULT '[]'::jsonb, -- Ressources additionnelles (liens, fichiers, etc.)
  exercices JSONB DEFAULT '[]'::jsonb, -- Exercices pratiques
  statut TEXT CHECK (statut IN ('actif', 'inactif')) DEFAULT 'actif',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Table pour la progression utilisateur dans les parcours
CREATE TABLE IF NOT EXISTS user_parcours_progression (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) ON DELETE CASCADE NOT NULL,
  parcours_id UUID REFERENCES parcours_transformation(id) ON DELETE CASCADE NOT NULL,
  date_inscription TIMESTAMP DEFAULT NOW() NOT NULL,
  date_debut TIMESTAMP,
  date_fin_prevue TIMESTAMP,
  date_fin_reelle TIMESTAMP,
  progression_pourcentage INTEGER DEFAULT 0 CHECK (progression_pourcentage >= 0 AND progression_pourcentage <= 100),
  modules_completes INTEGER DEFAULT 0,
  statut TEXT CHECK (statut IN ('inscrit', 'en_cours', 'termine', 'abandonne', 'suspendu')) DEFAULT 'inscrit',
  notes_personnelles TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, parcours_id)
);

-- 4. Table pour le journal de transformation personnel
CREATE TABLE IF NOT EXISTS journal_transformation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) ON DELETE CASCADE NOT NULL,
  date_entree DATE NOT NULL DEFAULT CURRENT_DATE,
  titre TEXT,
  contenu TEXT NOT NULL, -- Contenu de l'entrée du journal
  thematique TEXT, -- Thématique liée (optionnel)
  parcours_id UUID REFERENCES parcours_transformation(id) ON DELETE SET NULL,
  module_id UUID REFERENCES modules_parcours(id) ON DELETE SET NULL,
  emotions JSONB DEFAULT '[]'::jsonb, -- Émotions ressenties
  revelations TEXT, -- Révélations ou insights
  actions_prises TEXT, -- Actions concrètes prises
  gratitude TEXT, -- Éléments de gratitude
  prieres TEXT, -- Prières ou méditations
  tags TEXT[], -- Tags pour catégoriser
  is_private BOOLEAN DEFAULT true, -- Journal privé par défaut
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 5. Table pour les évaluations de croissance spirituelle
CREATE TABLE IF NOT EXISTS evaluations_croissance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profils(id) ON DELETE CASCADE NOT NULL,
  date_evaluation DATE NOT NULL DEFAULT CURRENT_DATE,
  type_evaluation TEXT CHECK (type_evaluation IN ('initiale', 'mensuelle', 'trimestrielle', 'annuelle', 'personnalisee')) DEFAULT 'mensuelle',
  domaine_evalue TEXT CHECK (domaine_evalue IN ('relation_dieu', 'priere', 'parole', 'service', 'communaute', 'temperament', 'finances', 'sante', 'relations', 'autre')) NOT NULL,
  score INTEGER CHECK (score >= 0 AND score <= 100), -- Score sur 100
  questions_reponses JSONB DEFAULT '{}'::jsonb, -- Questions et réponses de l'évaluation
  points_forts TEXT[], -- Points forts identifiés
  axes_amelioration TEXT[], -- Axes d'amélioration
  objectifs_fixes JSONB DEFAULT '[]'::jsonb, -- Objectifs fixés suite à l'évaluation
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Indexes pour améliorer les performances

-- Indexes pour parcours_transformation
CREATE INDEX IF NOT EXISTS idx_parcours_thematique ON parcours_transformation(thematique);
CREATE INDEX IF NOT EXISTS idx_parcours_niveau ON parcours_transformation(niveau);
CREATE INDEX IF NOT EXISTS idx_parcours_statut ON parcours_transformation(statut);
CREATE INDEX IF NOT EXISTS idx_parcours_ordre ON parcours_transformation(ordre_affichage);
CREATE INDEX IF NOT EXISTS idx_parcours_categorie ON parcours_transformation(categorie);

-- Indexes pour modules_parcours
CREATE INDEX IF NOT EXISTS idx_modules_parcours_id ON modules_parcours(parcours_id);
CREATE INDEX IF NOT EXISTS idx_modules_ordre ON modules_parcours(parcours_id, ordre);
CREATE INDEX IF NOT EXISTS idx_modules_statut ON modules_parcours(statut);

-- Indexes pour user_parcours_progression
CREATE INDEX IF NOT EXISTS idx_user_parcours_user_id ON user_parcours_progression(user_id);
CREATE INDEX IF NOT EXISTS idx_user_parcours_parcours_id ON user_parcours_progression(parcours_id);
CREATE INDEX IF NOT EXISTS idx_user_parcours_statut ON user_parcours_progression(statut);
CREATE INDEX IF NOT EXISTS idx_user_parcours_user_statut ON user_parcours_progression(user_id, statut);

-- Indexes pour journal_transformation
CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_transformation(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_transformation(date_entree);
CREATE INDEX IF NOT EXISTS idx_journal_parcours_id ON journal_transformation(parcours_id);
CREATE INDEX IF NOT EXISTS idx_journal_thematique ON journal_transformation(thematique);
CREATE INDEX IF NOT EXISTS idx_journal_user_date ON journal_transformation(user_id, date_entree DESC);

-- Indexes pour evaluations_croissance
CREATE INDEX IF NOT EXISTS idx_evaluations_user_id ON evaluations_croissance(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_date ON evaluations_croissance(date_evaluation);
CREATE INDEX IF NOT EXISTS idx_evaluations_type ON evaluations_croissance(type_evaluation);
CREATE INDEX IF NOT EXISTS idx_evaluations_domaine ON evaluations_croissance(domaine_evalue);
CREATE INDEX IF NOT EXISTS idx_evaluations_user_date ON evaluations_croissance(user_id, date_evaluation DESC);

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_parcours_transformation_updated_at ON parcours_transformation;
CREATE TRIGGER update_parcours_transformation_updated_at BEFORE UPDATE ON parcours_transformation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_modules_parcours_updated_at ON modules_parcours;
CREATE TRIGGER update_modules_parcours_updated_at BEFORE UPDATE ON modules_parcours
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_parcours_progression_updated_at ON user_parcours_progression;
CREATE TRIGGER update_user_parcours_progression_updated_at BEFORE UPDATE ON user_parcours_progression
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_journal_transformation_updated_at ON journal_transformation;
CREATE TRIGGER update_journal_transformation_updated_at BEFORE UPDATE ON journal_transformation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_evaluations_croissance_updated_at ON evaluations_croissance;
CREATE TRIGGER update_evaluations_croissance_updated_at BEFORE UPDATE ON evaluations_croissance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE parcours_transformation ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules_parcours ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_parcours_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_transformation ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluations_croissance ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour parcours_transformation
-- Tous les utilisateurs authentifiés peuvent voir les parcours actifs
CREATE POLICY "Users can view active parcours" ON parcours_transformation
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND statut = 'actif'
    );

-- Les admins peuvent tout voir et gérer
CREATE POLICY "Admins can manage all parcours" ON parcours_transformation
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques RLS pour modules_parcours
-- Les utilisateurs authentifiés peuvent voir les modules des parcours actifs
CREATE POLICY "Users can view active modules" ON modules_parcours
    FOR SELECT USING (
        auth.uid() IS NOT NULL AND statut = 'actif' AND EXISTS (
            SELECT 1 FROM parcours_transformation 
            WHERE id = modules_parcours.parcours_id AND statut = 'actif'
        )
    );

-- Les admins peuvent tout voir et gérer
CREATE POLICY "Admins can manage all modules" ON modules_parcours
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques RLS pour user_parcours_progression
-- Les utilisateurs peuvent voir leur propre progression
CREATE POLICY "Users can view their own progression" ON user_parcours_progression
    FOR SELECT USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer leur propre progression
CREATE POLICY "Users can create their own progression" ON user_parcours_progression
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leur propre progression
CREATE POLICY "Users can update their own progression" ON user_parcours_progression
    FOR UPDATE USING (user_id = auth.uid());

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all progression" ON user_parcours_progression
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques RLS pour journal_transformation
-- Les utilisateurs peuvent voir leur propre journal
CREATE POLICY "Users can view their own journal" ON journal_transformation
    FOR SELECT USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer leur propre journal
CREATE POLICY "Users can create their own journal" ON journal_transformation
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leur propre journal
CREATE POLICY "Users can update their own journal" ON journal_transformation
    FOR UPDATE USING (user_id = auth.uid());

-- Les utilisateurs peuvent supprimer leur propre journal
CREATE POLICY "Users can delete their own journal" ON journal_transformation
    FOR DELETE USING (user_id = auth.uid());

-- Les admins peuvent tout voir (pour support)
CREATE POLICY "Admins can view all journals" ON journal_transformation
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Politiques RLS pour evaluations_croissance
-- Les utilisateurs peuvent voir leurs propres évaluations
CREATE POLICY "Users can view their own evaluations" ON evaluations_croissance
    FOR SELECT USING (user_id = auth.uid());

-- Les utilisateurs peuvent créer leurs propres évaluations
CREATE POLICY "Users can create their own evaluations" ON evaluations_croissance
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leurs propres évaluations
CREATE POLICY "Users can update their own evaluations" ON evaluations_croissance
    FOR UPDATE USING (user_id = auth.uid());

-- Les admins peuvent tout voir
CREATE POLICY "Admins can view all evaluations" ON evaluations_croissance
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profils 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Commentaires pour la documentation
COMMENT ON TABLE parcours_transformation IS 'Parcours de transformation spirituelle - Objectif 3';
COMMENT ON COLUMN parcours_transformation.categorie IS 'Catégorie du parcours: identite_christ, fondements_royaume, restauration_ame, deploiement, finances, vie_famille, marcher_esprit, discipolat';
COMMENT ON TABLE modules_parcours IS 'Modules composant un parcours de transformation - Objectif 3';
COMMENT ON TABLE user_parcours_progression IS 'Progression des utilisateurs dans les parcours - Objectif 3';
COMMENT ON TABLE journal_transformation IS 'Journal personnel de transformation - Objectif 3';
COMMENT ON TABLE evaluations_croissance IS 'Évaluations de croissance spirituelle - Objectif 3';

