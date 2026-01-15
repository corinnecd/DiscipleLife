-- ============================================
-- Script pour créer les profils superviseurs dans la table profils
-- ATTENTION: Ce script nécessite que les comptes Auth existent déjà
-- Utilisez-le APRÈS avoir créé les comptes via l'API ou l'interface Dashboard
-- ============================================

-- ⚠️ IMPORTANT: 
-- Ce script crée seulement les profils dans la table profils
-- Les comptes d'authentification doivent être créés d'abord via:
-- 1. L'interface Supabase Dashboard > Authentication > Users > Add User
-- 2. Ou le script Node.js: scripts/create_superviseurs.js
-- 3. Ou l'API Supabase Admin

-- Ce script fonctionne si les utilisateurs existent déjà dans auth.users
-- Il crée les profils correspondants dans la table profils

DO $$
DECLARE
  superviseur_record RECORD;
  user_uuid UUID;
  created_count INTEGER := 0;
  updated_count INTEGER := 0;
  error_count INTEGER := 0;
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
      ('FAM008', 'David', 'SERVA', 'david.serva@example.com'),
      ('FAM009', 'ÉLISABETH', 'AMECY', 'elisabeth.amecy@example.com'),
      ('FAM010', 'EPHREM', 'MBA', 'ephrem.mba@example.com'),
      ('FAM011', 'GERVAIS', 'NKATOULOULOU', 'gervais.nkatouloulou@example.com'),
      ('FAM012', 'HÉLÈNE', 'LAMAGO', 'helene.lamago@example.com'),
      ('FAM013', 'JOCELYNE', 'FORTUNE', 'jocelyne.fortune@example.com'),
      ('FAM014', 'KARINE', 'WILLIAM', 'karine.william@example.com'),
      ('FAM015', 'KEVIN', 'THÉA', 'kevin.thea@example.com'),
      ('FAM016', 'LAËTITIA', 'MISSATOU', 'laetitia.missatou@example.com'),
      ('FAM017', 'LAËTITIA', 'OBAME', 'laetitia.obame@example.com'),
      ('FAM018', 'MANICIA', 'THÉA', 'manicia.thea@example.com'),
      ('FAM019', 'NANCY', 'NZI', 'nancy.nzi@example.com'),
      ('FAM020', 'NASDÈNE', 'KODIA', 'nasdene.kodia@example.com'),
      ('FAM021', 'PATRICK', 'BATSIAKA', 'patrick.batsiaka@example.com'),
      ('FAM022', 'PROSPER', 'LEBA', 'prosper.leba@example.com'),
      ('FAM023', 'ROCHELLE', 'PASSI BEN', 'rochelle.passiben@example.com'),
      ('FAM024', 'SERGE', 'AMANY', 'serge.amany@example.com'),
      ('FAM025', 'SNELLA', 'MOUSSIO', 'snella.moussio@example.com'),
      ('FAM026', 'YVAN', 'DESSANDE', 'yvan.dessande@example.com')
    ) AS t(famille_id, prenom, nom, email)
  LOOP
    -- Chercher si le compte Auth existe (via l'email)
    -- Note: On ne peut pas accéder directement à auth.users depuis SQL
    -- Cette requête cherche dans profils si un utilisateur avec cet email existe déjà
    SELECT id INTO user_uuid
    FROM profils
    WHERE email = superviseur_record.email
    LIMIT 1;
    
    -- Si l'utilisateur existe déjà dans profils, mettre à jour le rôle
    IF user_uuid IS NOT NULL THEN
      UPDATE profils
      SET 
        first_name = superviseur_record.prenom,
        last_name = superviseur_record.nom,
        role = 'superviseur',
        updated_at = NOW()
      WHERE id = user_uuid;
      
      updated_count := updated_count + 1;
      RAISE NOTICE 'Profil mis à jour: % % (email: %)', superviseur_record.prenom, superviseur_record.nom, superviseur_record.email;
    ELSE
      -- Si l'utilisateur n'existe pas, on ne peut pas créer de profil sans ID Auth
      -- Le profil sera créé automatiquement lors de la première connexion
      -- ou via l'API/script Node.js
      RAISE NOTICE 'Compte Auth non trouvé pour % % (email: %). Créez d''abord le compte Auth, puis réexécutez ce script.', superviseur_record.prenom, superviseur_record.nom, superviseur_record.email;
      error_count := error_count + 1;
    END IF;
  END LOOP;
  
  RAISE NOTICE '=== RÉSUMÉ ===';
  RAISE NOTICE 'Profils mis à jour: %', updated_count;
  RAISE NOTICE 'Comptes Auth manquants: %', error_count;
END $$;

-- Vérification: Afficher les superviseurs créés
SELECT 
  id,
  first_name,
  last_name,
  email,
  role,
  created_at
FROM profils
WHERE role = 'superviseur'
ORDER BY last_name, first_name;

-- Note: Pour créer les comptes Auth, utilisez:
-- 1. L'interface Dashboard: Authentication > Users > Add User
-- 2. Le script Node.js: node scripts/create_superviseurs.js
-- 3. L'API Supabase Admin

