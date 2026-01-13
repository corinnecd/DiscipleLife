-- ============================================
-- OBJECTIF 1: ÉVANGÉLISATION
-- Tables pour tracker les visiteurs, campagnes d'évangélisation et le système de parrainage
-- ============================================

-- Table pour tracker les visiteurs/nouveaux/éloignés
CREATE TABLE IF NOT EXISTS visiteurs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT,
  prenom TEXT,
  email TEXT UNIQUE,
  telephone TEXT,
  statut TEXT CHECK (statut IN ('visiteur', 'eloigne', 'nouveau_contact', 'retourne')),
  source_contact TEXT, -- comment ils ont entendu parler (réseaux sociaux, invitation, etc.)
  date_premier_contact TIMESTAMP DEFAULT NOW(),
  date_dernier_contact TIMESTAMP,
  invitant_id UUID REFERENCES profils(id) ON DELETE SET NULL, -- qui les a invités
  notes TEXT,
  interesse_par TEXT[], -- domaines d'intérêt
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table pour les campagnes d'évangélisation
CREATE TABLE IF NOT EXISTS campagnes_evangelisation (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom TEXT NOT NULL,
  description TEXT,
  type_campagne TEXT CHECK (type_campagne IN ('online', 'evenement', 'mission', 'reseau_social')),
  date_debut DATE,
  date_fin DATE,
  responsable_id UUID REFERENCES profils(id) ON DELETE SET NULL,
  objectif_participants INTEGER,
  statut TEXT DEFAULT 'planifiee' CHECK (statut IN ('planifiee', 'en_cours', 'terminee', 'annulee')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table de liaison campagne-visiteurs
CREATE TABLE IF NOT EXISTS campagne_visiteurs (
  campagne_id UUID REFERENCES campagnes_evangelisation(id) ON DELETE CASCADE,
  visiteur_id UUID REFERENCES visiteurs(id) ON DELETE CASCADE,
  date_inscription TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (campagne_id, visiteur_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_visiteurs_invitant_id ON visiteurs(invitant_id);
CREATE INDEX IF NOT EXISTS idx_visiteurs_statut ON visiteurs(statut);
CREATE INDEX IF NOT EXISTS idx_visiteurs_email ON visiteurs(email);
CREATE INDEX IF NOT EXISTS idx_visiteurs_date_premier_contact ON visiteurs(date_premier_contact);
CREATE INDEX IF NOT EXISTS idx_campagnes_responsable_id ON campagnes_evangelisation(responsable_id);
CREATE INDEX IF NOT EXISTS idx_campagnes_statut ON campagnes_evangelisation(statut);
CREATE INDEX IF NOT EXISTS idx_campagne_visiteurs_campagne_id ON campagne_visiteurs(campagne_id);
CREATE INDEX IF NOT EXISTS idx_campagne_visiteurs_visiteur_id ON campagne_visiteurs(visiteur_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_visiteurs_updated_at BEFORE UPDATE ON visiteurs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campagnes_evangelisation_updated_at BEFORE UPDATE ON campagnes_evangelisation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Politiques RLS (Row Level Security)
ALTER TABLE visiteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campagnes_evangelisation ENABLE ROW LEVEL SECURITY;
ALTER TABLE campagne_visiteurs ENABLE ROW LEVEL SECURITY;

-- Politiques pour visiteurs
-- Les utilisateurs peuvent voir leurs propres visiteurs
CREATE POLICY "Users can view their own visitors" ON visiteurs
    FOR SELECT USING (invitant_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    ));

-- Les utilisateurs peuvent insérer leurs propres visiteurs
CREATE POLICY "Users can insert their own visitors" ON visiteurs
    FOR INSERT WITH CHECK (invitant_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leurs propres visiteurs
CREATE POLICY "Users can update their own visitors" ON visiteurs
    FOR UPDATE USING (invitant_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    ));

-- Les admins et mentors peuvent tout voir
CREATE POLICY "Admins and mentors can view all visitors" ON visiteurs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    ));

-- Politiques pour campagnes_evangelisation
-- Tout le monde peut voir les campagnes actives
CREATE POLICY "Users can view campaigns" ON campagnes_evangelisation
    FOR SELECT USING (true);

-- Les mentors et admins peuvent créer des campagnes
CREATE POLICY "Mentors and admins can create campaigns" ON campagnes_evangelisation
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    ) OR responsable_id = auth.uid());

-- Les responsables peuvent mettre à jour leurs campagnes
CREATE POLICY "Responsables can update their campaigns" ON campagnes_evangelisation
    FOR UPDATE USING (responsable_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin'
    ));

-- Politiques pour campagne_visiteurs
-- Les utilisateurs peuvent voir les inscriptions de leurs campagnes
CREATE POLICY "Users can view campaign visitors" ON campagne_visiteurs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM campagnes_evangelisation 
        WHERE id = campagne_visiteurs.campagne_id 
        AND (responsable_id = auth.uid() OR EXISTS (
            SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
        ))
    ));

-- Les responsables peuvent ajouter des visiteurs à leurs campagnes
CREATE POLICY "Responsables can add visitors to campaigns" ON campagne_visiteurs
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM campagnes_evangelisation 
        WHERE id = campagne_id 
        AND (responsable_id = auth.uid() OR EXISTS (
            SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
        ))
    ));

-- Commentaires pour la documentation
COMMENT ON TABLE visiteurs IS 'Table pour tracker les visiteurs, nouveaux contacts et personnes éloignées';
COMMENT ON TABLE campagnes_evangelisation IS 'Table pour gérer les campagnes d''évangélisation';
COMMENT ON TABLE campagne_visiteurs IS 'Table de liaison entre les campagnes et les visiteurs';

COMMENT ON COLUMN visiteurs.statut IS 'Statut: visiteur, eloigne, nouveau_contact, retourne';
COMMENT ON COLUMN visiteurs.source_contact IS 'Source du contact: réseaux sociaux, invitation, ami, etc.';
COMMENT ON COLUMN visiteurs.interesse_par IS 'Tableau des domaines d''intérêt';
COMMENT ON COLUMN campagnes_evangelisation.type_campagne IS 'Type: online, evenement, mission, reseau_social';
COMMENT ON COLUMN campagnes_evangelisation.statut IS 'Statut: planifiee, en_cours, terminee, annulee';





