-- ============================================
-- OBJECTIF 1B: Faire revenir les anciens qui ne revenaient plus
-- Tables pour tracking des relances et historique de présence
-- ============================================

-- 1. Table pour tracker les tentatives de relance
CREATE TABLE IF NOT EXISTS contacts_relance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visiteur_id UUID REFERENCES visiteurs(id) ON DELETE CASCADE NOT NULL,
  contacteur_id UUID REFERENCES profils(id) ON DELETE SET NULL,
  date_contact TIMESTAMP DEFAULT NOW() NOT NULL,
  type_contact TEXT CHECK (type_contact IN ('telephone', 'email', 'sms', 'whatsapp', 'visite', 'autre')) NOT NULL,
  statut TEXT CHECK (statut IN ('tente', 'joint', 'pas_de_reponse', 'refuse', 'interesse')) DEFAULT 'tente',
  notes TEXT,
  prochaine_relance TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes pour contacts_relance
CREATE INDEX IF NOT EXISTS idx_contacts_relance_visiteur_id ON contacts_relance(visiteur_id);
CREATE INDEX IF NOT EXISTS idx_contacts_relance_contacteur_id ON contacts_relance(contacteur_id);
CREATE INDEX IF NOT EXISTS idx_contacts_relance_date_contact ON contacts_relance(date_contact);
CREATE INDEX IF NOT EXISTS idx_contacts_relance_statut ON contacts_relance(statut);
CREATE INDEX IF NOT EXISTS idx_contacts_relance_prochaine_relance ON contacts_relance(prochaine_relance);

-- Trigger pour updated_at
DROP TRIGGER IF EXISTS update_contacts_relance_updated_at ON contacts_relance;
CREATE TRIGGER update_contacts_relance_updated_at BEFORE UPDATE ON contacts_relance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Table pour tracker l'historique de présence
CREATE TABLE IF NOT EXISTS historique_presence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visiteur_id UUID REFERENCES visiteurs(id) ON DELETE CASCADE NOT NULL,
  date_presence DATE NOT NULL,
  type_presence TEXT CHECK (type_presence IN ('culte_dimanche', 'activite_semaine', 'evenement', 'autre')) DEFAULT 'culte_dimanche',
  presence_confirmee BOOLEAN DEFAULT true,
  notes TEXT,
  enregistre_par UUID REFERENCES profils(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes pour historique_presence
CREATE INDEX IF NOT EXISTS idx_historique_presence_visiteur_id ON historique_presence(visiteur_id);
CREATE INDEX IF NOT EXISTS idx_historique_presence_date_presence ON historique_presence(date_presence);
CREATE INDEX IF NOT EXISTS idx_historique_presence_type_presence ON historique_presence(type_presence);
CREATE INDEX IF NOT EXISTS idx_historique_presence_date_visiteur ON historique_presence(visiteur_id, date_presence);

-- RLS Policies pour contacts_relance
ALTER TABLE contacts_relance ENABLE ROW LEVEL SECURITY;

-- Policy: Tous les utilisateurs authentifiés peuvent voir les contacts de relance
CREATE POLICY "Les utilisateurs authentifiés peuvent voir les contacts de relance"
ON contacts_relance FOR SELECT
TO authenticated
USING (true);

-- Policy: Les admins et le contacteur peuvent créer/modifier/supprimer
CREATE POLICY "Les admins peuvent gérer les contacts de relance"
ON contacts_relance FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profils
    WHERE profils.id = auth.uid()
    AND profils.role = 'admin'
  )
  OR contacteur_id = auth.uid()
);

-- RLS Policies pour historique_presence
ALTER TABLE historique_presence ENABLE ROW LEVEL SECURITY;

-- Policy: Tous les utilisateurs authentifiés peuvent voir l'historique
CREATE POLICY "Les utilisateurs authentifiés peuvent voir l'historique de présence"
ON historique_presence FOR SELECT
TO authenticated
USING (true);

-- Policy: Les admins et la personne qui a enregistré peuvent créer/modifier/supprimer
CREATE POLICY "Les admins peuvent gérer l'historique de présence"
ON historique_presence FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profils
    WHERE profils.id = auth.uid()
    AND profils.role = 'admin'
  )
  OR enregistre_par = auth.uid()
);

-- Commentaires sur les tables
COMMENT ON TABLE contacts_relance IS 'Table pour tracker les tentatives de relance des membres éloignés';
COMMENT ON TABLE historique_presence IS 'Table pour tracker l''historique de présence des visiteurs';


