-- ============================================
-- FINALISATION OBJECTIF 1
-- Vérification et complétion des éléments manquants
-- ============================================

-- ============================================
-- 1. VÉRIFICATION DES TABLES
-- ============================================

DO $$
BEGIN
  -- Vérifier que toutes les tables existent
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'visiteurs') THEN
    RAISE EXCEPTION 'Table visiteurs manquante. Exécutez d''abord 001_objectif1_evangelisation_tables.sql';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campagnes_evangelisation') THEN
    RAISE EXCEPTION 'Table campagnes_evangelisation manquante. Exécutez d''abord 001_objectif1_evangelisation_tables.sql';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'codes_invitation') THEN
    RAISE EXCEPTION 'Table codes_invitation manquante. Exécutez d''abord 009_create_codes_invitation_simple.sql';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts_relance') THEN
    RAISE EXCEPTION 'Table contacts_relance manquante. Exécutez d''abord 004_objectif1b_retour_eloignes.sql';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'historique_presence') THEN
    RAISE EXCEPTION 'Table historique_presence manquante. Exécutez d''abord 004_objectif1b_retour_eloignes.sql';
  END IF;

  RAISE NOTICE '✅ Toutes les tables requises existent';
END $$;

-- ============================================
-- 2. VÉRIFICATION ET COMPLÉTION DES COLONNES
-- ============================================

-- Vérifier et ajouter la colonne 'type' à visiteurs si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'visiteurs' AND column_name = 'type'
  ) THEN
    ALTER TABLE visiteurs
    ADD COLUMN type TEXT CHECK (type IN ('nouvelle_ame', 'ancien_eloigne')) DEFAULT 'nouvelle_ame';
    
    UPDATE visiteurs SET type = 'nouvelle_ame' WHERE type IS NULL;
    
    CREATE INDEX IF NOT EXISTS idx_visiteurs_type ON visiteurs(type);
    
    RAISE NOTICE '✅ Colonne type ajoutée à la table visiteurs';
  ELSE
    RAISE NOTICE '✅ Colonne type existe déjà dans visiteurs';
  END IF;
END $$;

-- ============================================
-- 3. VÉRIFICATION DES INDEXES
-- ============================================

-- Indexes pour visiteurs
CREATE INDEX IF NOT EXISTS idx_visiteurs_invitant_id ON visiteurs(invitant_id);
CREATE INDEX IF NOT EXISTS idx_visiteurs_statut ON visiteurs(statut);
CREATE INDEX IF NOT EXISTS idx_visiteurs_email ON visiteurs(email);
CREATE INDEX IF NOT EXISTS idx_visiteurs_date_premier_contact ON visiteurs(date_premier_contact);
CREATE INDEX IF NOT EXISTS idx_visiteurs_type ON visiteurs(type);

-- Indexes pour campagnes
CREATE INDEX IF NOT EXISTS idx_campagnes_responsable_id ON campagnes_evangelisation(responsable_id);
CREATE INDEX IF NOT EXISTS idx_campagnes_statut ON campagnes_evangelisation(statut);

-- Indexes pour campagne_visiteurs
CREATE INDEX IF NOT EXISTS idx_campagne_visiteurs_campagne_id ON campagne_visiteurs(campagne_id);
CREATE INDEX IF NOT EXISTS idx_campagne_visiteurs_visiteur_id ON campagne_visiteurs(visiteur_id);

-- Indexes pour contacts_relance
CREATE INDEX IF NOT EXISTS idx_contacts_relance_visiteur_id ON contacts_relance(visiteur_id);
CREATE INDEX IF NOT EXISTS idx_contacts_relance_contacteur_id ON contacts_relance(contacteur_id);
CREATE INDEX IF NOT EXISTS idx_contacts_relance_date_contact ON contacts_relance(date_contact);
CREATE INDEX IF NOT EXISTS idx_contacts_relance_statut ON contacts_relance(statut);

-- Indexes pour historique_presence
CREATE INDEX IF NOT EXISTS idx_historique_presence_visiteur_id ON historique_presence(visiteur_id);
CREATE INDEX IF NOT EXISTS idx_historique_presence_date_presence ON historique_presence(date_presence);
CREATE INDEX IF NOT EXISTS idx_historique_presence_type_presence ON historique_presence(type_presence);

-- ============================================
-- 4. VÉRIFICATION DES TRIGGERS
-- ============================================

-- Fonction update_updated_at_column (si elle n'existe pas)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_visiteurs_updated_at ON visiteurs;
CREATE TRIGGER update_visiteurs_updated_at BEFORE UPDATE ON visiteurs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campagnes_evangelisation_updated_at ON campagnes_evangelisation;
CREATE TRIGGER update_campagnes_evangelisation_updated_at BEFORE UPDATE ON campagnes_evangelisation
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_relance_updated_at ON contacts_relance;
CREATE TRIGGER update_contacts_relance_updated_at BEFORE UPDATE ON contacts_relance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. VÉRIFICATION DES POLITIQUES RLS
-- ============================================

-- Activer RLS sur toutes les tables
ALTER TABLE visiteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campagnes_evangelisation ENABLE ROW LEVEL SECURITY;
ALTER TABLE campagne_visiteurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts_relance ENABLE ROW LEVEL SECURITY;
ALTER TABLE historique_presence ENABLE ROW LEVEL SECURITY;

-- Vérifier et créer les politiques RLS pour visiteurs
DO $$
BEGIN
  -- Supprimer les anciennes politiques si elles existent
  DROP POLICY IF EXISTS "Users can view their own visitors" ON visiteurs;
  DROP POLICY IF EXISTS "Users can insert their own visitors" ON visiteurs;
  DROP POLICY IF EXISTS "Users can update their own visitors" ON visiteurs;
  DROP POLICY IF EXISTS "Admins and mentors can view all visitors" ON visiteurs;
  
  -- Créer les nouvelles politiques
  CREATE POLICY "Users can view their own visitors" ON visiteurs
    FOR SELECT USING (invitant_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    ));

  CREATE POLICY "Users can insert their own visitors" ON visiteurs
    FOR INSERT WITH CHECK (invitant_id = auth.uid());

  CREATE POLICY "Users can update their own visitors" ON visiteurs
    FOR UPDATE USING (invitant_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    ));

  CREATE POLICY "Admins and mentors can view all visitors" ON visiteurs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    ));
    
  RAISE NOTICE '✅ Politiques RLS pour visiteurs créées/mises à jour';
END $$;

-- Vérifier et créer les politiques RLS pour campagnes_evangelisation
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view campaigns" ON campagnes_evangelisation;
  DROP POLICY IF EXISTS "Mentors and admins can create campaigns" ON campagnes_evangelisation;
  DROP POLICY IF EXISTS "Responsables can update their campaigns" ON campagnes_evangelisation;
  
  CREATE POLICY "Users can view campaigns" ON campagnes_evangelisation
    FOR SELECT USING (true);

  CREATE POLICY "Mentors and admins can create campaigns" ON campagnes_evangelisation
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
    ) OR responsable_id = auth.uid());

  CREATE POLICY "Responsables can update their campaigns" ON campagnes_evangelisation
    FOR UPDATE USING (responsable_id = auth.uid() OR EXISTS (
        SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'admin'
    ));
    
  RAISE NOTICE '✅ Politiques RLS pour campagnes_evangelisation créées/mises à jour';
END $$;

-- Vérifier et créer les politiques RLS pour campagne_visiteurs
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view campaign visitors" ON campagne_visiteurs;
  DROP POLICY IF EXISTS "Responsables can add visitors to campaigns" ON campagne_visiteurs;
  
  CREATE POLICY "Users can view campaign visitors" ON campagne_visiteurs
    FOR SELECT USING (EXISTS (
        SELECT 1 FROM campagnes_evangelisation 
        WHERE id = campagne_visiteurs.campagne_id 
        AND (responsable_id = auth.uid() OR EXISTS (
            SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
        ))
    ));

  CREATE POLICY "Responsables can add visitors to campaigns" ON campagne_visiteurs
    FOR INSERT WITH CHECK (EXISTS (
        SELECT 1 FROM campagnes_evangelisation 
        WHERE id = campagne_id 
        AND (responsable_id = auth.uid() OR EXISTS (
            SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('admin', 'mentor')
        ))
    ));
    
  RAISE NOTICE '✅ Politiques RLS pour campagne_visiteurs créées/mises à jour';
END $$;

-- Vérifier et créer les politiques RLS pour contacts_relance
DO $$
BEGIN
  DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir les contacts de relance" ON contacts_relance;
  DROP POLICY IF EXISTS "Les admins peuvent gérer les contacts de relance" ON contacts_relance;
  
  CREATE POLICY "Les utilisateurs authentifiés peuvent voir les contacts de relance"
  ON contacts_relance FOR SELECT
  TO authenticated
  USING (true);

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
  
  RAISE NOTICE '✅ Politiques RLS pour contacts_relance créées/mises à jour';
END $$;

-- Vérifier et créer les politiques RLS pour historique_presence
DO $$
BEGIN
  DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir l'historique de présence" ON historique_presence;
  DROP POLICY IF EXISTS "Les admins peuvent gérer l'historique de présence" ON historique_presence;
  
  CREATE POLICY "Les utilisateurs authentifiés peuvent voir l'historique de présence"
  ON historique_presence FOR SELECT
  TO authenticated
  USING (true);

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
  
  RAISE NOTICE '✅ Politiques RLS pour historique_presence créées/mises à jour';
END $$;

-- ============================================
-- 6. VÉRIFICATION FINALE
-- ============================================

DO $$
DECLARE
  table_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Compter les tables
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN ('visiteurs', 'campagnes_evangelisation', 'campagne_visiteurs', 
                     'codes_invitation', 'invitations_envoyees', 'contacts_relance', 
                     'historique_presence', 'evenements_evangelisation', 'activites_solidarite');
  
  -- Compter les politiques RLS
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  AND tablename IN ('visiteurs', 'campagnes_evangelisation', 'campagne_visiteurs',
                    'contacts_relance', 'historique_presence');
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ FINALISATION OBJECTIF 1 TERMINÉE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables vérifiées: %', table_count;
  RAISE NOTICE 'Politiques RLS vérifiées: %', policy_count;
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- COMMENTAIRES FINAUX
-- ============================================

COMMENT ON TABLE visiteurs IS 'Table pour tracker les visiteurs, nouveaux contacts et personnes éloignées - Objectif 1';
COMMENT ON TABLE campagnes_evangelisation IS 'Table pour gérer les campagnes d''évangélisation - Objectif 1A';
COMMENT ON TABLE campagne_visiteurs IS 'Table de liaison entre les campagnes et les visiteurs - Objectif 1A';
COMMENT ON TABLE contacts_relance IS 'Table pour tracker les tentatives de relance des membres éloignés - Objectif 1B';
COMMENT ON TABLE historique_presence IS 'Table pour tracker l''historique de présence des visiteurs - Objectif 1B';


