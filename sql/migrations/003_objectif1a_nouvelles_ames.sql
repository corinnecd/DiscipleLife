-- ============================================
-- OBJECTIF 1A: Attirer les nouvelles âmes
-- Ajout champ type à visiteurs, tables événements et solidarité
-- ============================================

-- 1. Ajouter champ type à la table visiteurs
ALTER TABLE visiteurs
ADD COLUMN IF NOT EXISTS type TEXT CHECK (type IN ('nouvelle_ame', 'ancien_eloigne')) DEFAULT 'nouvelle_ame';

-- Mettre à jour les visiteurs existants (par défaut: nouvelle_ame)
UPDATE visiteurs
SET type = 'nouvelle_ame'
WHERE type IS NULL;

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_visiteurs_type ON visiteurs(type);

-- 2. Table pour les événements d'évangélisation (thématiques, banque alimentaire, solidarité, agape)
CREATE TABLE IF NOT EXISTS evenements_evangelisation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  type_evenement TEXT CHECK (type_evenement IN ('thematique', 'banque_alimentaire', 'solidarite', 'agape', 'autre')),
  date_evenement DATE NOT NULL,
  heure_debut TIME,
  heure_fin TIME,
  lieu TEXT,
  responsable_id UUID REFERENCES profils(id) ON DELETE SET NULL,
  objectif_participants INTEGER,
  nombre_participants INTEGER DEFAULT 0,
  nombre_nouvelles_ames INTEGER DEFAULT 0,
  statut TEXT DEFAULT 'planifie' CHECK (statut IN ('planifie', 'en_cours', 'termine', 'annule')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes pour evenements_evangelisation
CREATE INDEX IF NOT EXISTS idx_evenements_date_evenement ON evenements_evangelisation(date_evenement);
CREATE INDEX IF NOT EXISTS idx_evenements_type_evenement ON evenements_evangelisation(type_evenement);
CREATE INDEX IF NOT EXISTS idx_evenements_responsable_id ON evenements_evangelisation(responsable_id);
CREATE INDEX IF NOT EXISTS idx_evenements_statut ON evenements_evangelisation(statut);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_evenements_evangelisation_updated_at ON evenements_evangelisation;
CREATE TRIGGER update_evenements_evangelisation_updated_at BEFORE UPDATE ON evenements_evangelisation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Table de liaison événement-visiteurs
CREATE TABLE IF NOT EXISTS evenement_visiteurs (
  evenement_id UUID REFERENCES evenements_evangelisation(id) ON DELETE CASCADE,
  visiteur_id UUID REFERENCES visiteurs(id) ON DELETE CASCADE,
  date_inscription TIMESTAMP DEFAULT NOW(),
  present BOOLEAN DEFAULT false,
  date_presence TIMESTAMP,
  PRIMARY KEY (evenement_id, visiteur_id)
);

-- Indexes pour evenement_visiteurs
CREATE INDEX IF NOT EXISTS idx_evenement_visiteurs_evenement_id ON evenement_visiteurs(evenement_id);
CREATE INDEX IF NOT EXISTS idx_evenement_visiteurs_visiteur_id ON evenement_visiteurs(visiteur_id);
CREATE INDEX IF NOT EXISTS idx_evenement_visiteurs_present ON evenement_visiteurs(present);

-- 4. Table pour tracking Banque Alimentaire / Solidarité
CREATE TABLE IF NOT EXISTS activites_solidarite (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_activite TEXT CHECK (type_activite IN ('banque_alimentaire', 'solidarite', 'autre')),
  date_activite DATE NOT NULL,
  nombre_personnes_services INTEGER DEFAULT 0,
  nombre_nouvelles_ames INTEGER DEFAULT 0,
  responsable_id UUID REFERENCES profils(id) ON DELETE SET NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes pour activites_solidarite
CREATE INDEX IF NOT EXISTS idx_activites_solidarite_type_activite ON activites_solidarite(type_activite);
CREATE INDEX IF NOT EXISTS idx_activites_solidarite_date_activite ON activites_solidarite(date_activite);
CREATE INDEX IF NOT EXISTS idx_activites_solidarite_responsable_id ON activites_solidarite(responsable_id);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_activites_solidarite_updated_at ON activites_solidarite;
CREATE TRIGGER update_activites_solidarite_updated_at BEFORE UPDATE ON activites_solidarite
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security)
ALTER TABLE evenements_evangelisation ENABLE ROW LEVEL SECURITY;
ALTER TABLE evenement_visiteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activites_solidarite ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour evenements_evangelisation
-- Tous les utilisateurs authentifiés peuvent voir les événements
DROP POLICY IF EXISTS "Users can view events" ON evenements_evangelisation;
CREATE POLICY "Users can view events" ON evenements_evangelisation
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Les utilisateurs peuvent créer des événements
DROP POLICY IF EXISTS "Users can insert events" ON evenements_evangelisation;
CREATE POLICY "Users can insert events" ON evenements_evangelisation
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Les responsables et admins peuvent modifier leurs événements
DROP POLICY IF EXISTS "Responsables and admins can update events" ON evenements_evangelisation;
CREATE POLICY "Responsables and admins can update events" ON evenements_evangelisation
    FOR UPDATE USING (
        responsable_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor'))
    );

-- Les responsables et admins peuvent supprimer leurs événements
DROP POLICY IF EXISTS "Responsables and admins can delete events" ON evenements_evangelisation;
CREATE POLICY "Responsables and admins can delete events" ON evenements_evangelisation
    FOR DELETE USING (
        responsable_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor'))
    );

-- Politiques RLS pour evenement_visiteurs
-- Tous les utilisateurs authentifiés peuvent voir les liaisons
DROP POLICY IF EXISTS "Users can view event_visitors" ON evenement_visiteurs;
CREATE POLICY "Users can view event_visitors" ON evenement_visiteurs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Les utilisateurs peuvent créer des liaisons
DROP POLICY IF EXISTS "Users can insert event_visitors" ON evenement_visiteurs;
CREATE POLICY "Users can insert event_visitors" ON evenement_visiteurs
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Les utilisateurs peuvent mettre à jour les liaisons
DROP POLICY IF EXISTS "Users can update event_visitors" ON evenement_visiteurs;
CREATE POLICY "Users can update event_visitors" ON evenement_visiteurs
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Les utilisateurs peuvent supprimer les liaisons
DROP POLICY IF EXISTS "Users can delete event_visitors" ON evenement_visiteurs;
CREATE POLICY "Users can delete event_visitors" ON evenement_visiteurs
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Politiques RLS pour activites_solidarite
-- Tous les utilisateurs authentifiés peuvent voir les activités
DROP POLICY IF EXISTS "Users can view activites_solidarite" ON activites_solidarite;
CREATE POLICY "Users can view activites_solidarite" ON activites_solidarite
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Les utilisateurs peuvent créer des activités
DROP POLICY IF EXISTS "Users can insert activites_solidarite" ON activites_solidarite;
CREATE POLICY "Users can insert activites_solidarite" ON activites_solidarite
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Les responsables et admins peuvent modifier leurs activités
DROP POLICY IF EXISTS "Responsables and admins can update activites_solidarite" ON activites_solidarite;
CREATE POLICY "Responsables and admins can update activites_solidarite" ON activites_solidarite
    FOR UPDATE USING (
        responsable_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor'))
    );

-- Les responsables et admins peuvent supprimer leurs activités
DROP POLICY IF EXISTS "Responsables and admins can delete activites_solidarite" ON activites_solidarite;
CREATE POLICY "Responsables and admins can delete activites_solidarite" ON activites_solidarite
    FOR DELETE USING (
        responsable_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor'))
    );


