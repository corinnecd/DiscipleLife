-- ============================================
-- Script pour créer les comptes superviseurs dans profils
-- ATTENTION: Ce script crée seulement les enregistrements dans profils
-- Les comptes d'authentification doivent être créés via l'interface d'authentification Supabase
-- ============================================

-- IMPORTANT: Ce script NE CRÉE PAS les comptes d'authentification Supabase
-- Il crée seulement les enregistrements dans la table profils
-- Vous devez créer les comptes d'authentification via l'interface Supabase Auth ou l'application

-- Option 1: Créer les enregistrements dans profils (nécessite que les comptes Auth existent déjà)
-- Note: Cette approche nécessite que les comptes d'authentification existent déjà dans auth.users

-- Fonction pour créer un profil superviseur si le compte Auth existe
DO $$
DECLARE
  superviseur_record RECORD;
  user_uuid UUID;
BEGIN
  -- Liste des 26 superviseurs
  FOR superviseur_record IN
    SELECT * FROM (VALUES
      ('FAM001', 'Alain', 'SIL', 'alain.sil@example.com'),
      ('FAM002', 'Andréa', 'ERNEST', 'andrea.ernest@example.com'),
      ('FAM003', 'Béraca', 'KAZONGO', 'beraca.kazongo@example.com'),
      ('FAM004', 'BETSALEEL', 'BADILA', 'betsaleel.badila@example.com'),
      ('FAM005', 'CARINE', 'MATONDO', 'carine.matondo@example.com'),
      ('FAM006', 'COCO', 'OKANZI', 'coco.okanzi@example.com'),
      ('FAM007', 'CYNTHIA', 'ALLOH', 'cynthia.alloh@example.com'),
      ('FAM008', 'ELISABETH', 'AMECY', 'elisabeth.amecy@example.com'),
      ('FAM009', 'Andréa', 'Ernest', 'andrea.ernest2@example.com'),
      ('FAM010', 'EPHREM', 'MBA', 'ephrem.mba@example.com'),
      ('FAM011', 'GERVAIS', 'NKATOULOULOU', 'gervais.nkatouloulou@example.com'),
      ('FAM012', 'Andréa', 'Ernest', 'andrea.ernest3@example.com'),
      ('FAM013', 'HÉLÈNE', 'LAMAGO', 'helene.lamago@example.com'),
      ('FAM014', 'JOCELYNE', 'FORTUNE', 'jocelyne.fortune@example.com'),
      ('FAM015', 'KARINE', 'WILLIAM', 'karine.william@example.com'),
      ('FAM016', 'KEVIN', 'THÉA', 'kevin.thea@example.com'),
      ('FAM017', 'LAETITIA', 'OBAME', 'laetitia.obame@example.com'),
      ('FAM018', 'MANICIA', 'THÉA', 'manicia.thea@example.com'),
      ('FAM019', 'NANCY', 'NZI', 'nancy.nzi@example.com'),
      ('FAM020', 'NASDÈNE', 'KODIA', 'nasdene.kodia@example.com'),
      ('FAM021', 'PATRICK', 'BATSIAGA', 'patrick.batsiaga@example.com'),
      ('FAM022', 'PROSPERE', 'LEBA', 'prospere.leba@example.com'),
      ('FAM023', 'ROCHELLE', 'PASSI BEN', 'rochelle.passiben@example.com'),
      ('FAM024', 'SERGE', 'AMANY', 'serge.amany@example.com'),
      ('FAM025', 'SNELLA', 'MOUSSIO', 'snella.moussio@example.com'),
      ('FAM026', 'YVAN', 'DESSANDE', 'yvan.dessande@example.com')
    ) AS t(famille_id, prenom, nom, email)
  LOOP
    -- Chercher si le compte Auth existe déjà
    SELECT id INTO user_uuid
    FROM auth.users
    WHERE email = superviseur_record.email
    LIMIT 1;
    
    -- Si le compte existe, créer ou mettre à jour le profil
    IF user_uuid IS NOT NULL THEN
      INSERT INTO profils (id, first_name, last_name, email, role)
      VALUES (user_uuid, superviseur_record.prenom, superviseur_record.nom, superviseur_record.email, 'superviseur')
      ON CONFLICT (id) DO UPDATE
      SET 
        first_name = superviseur_record.prenom,
        last_name = superviseur_record.nom,
        role = 'superviseur',
        updated_at = NOW();
      
      RAISE NOTICE 'Profil créé/mis à jour pour % % (email: %)', superviseur_record.prenom, superviseur_record.nom, superviseur_record.email;
    ELSE
      RAISE NOTICE 'Compte Auth non trouvé pour % % (email: %). Créez d''abord le compte via l''interface Auth.', superviseur_record.prenom, superviseur_record.nom, superviseur_record.email;
    END IF;
  END LOOP;
END $$;

-- Note: Pour créer les comptes d'authentification, vous devez utiliser:
-- 1. L'interface Supabase Auth (Dashboard > Authentication > Users > Add User)
-- 2. Ou l'interface d'inscription de l'application
-- 3. Ensuite, exécutez ce script pour créer les profils avec le rôle 'superviseur'

