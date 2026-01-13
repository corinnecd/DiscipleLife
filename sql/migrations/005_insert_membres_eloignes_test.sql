-- ============================================
-- Insertion de 2 membres éloignés fictifs pour test
-- ============================================

-- Calculer la date d'il y a 4 mois (pour être sûr que c'est > 3 mois)
DO $$
DECLARE
  date_ancienne TIMESTAMP;
  user_test_id UUID;
BEGIN
  -- Récupérer un utilisateur existant pour l'invitant_id (ou utiliser NULL si aucun)
  SELECT id INTO user_test_id FROM profils LIMIT 1;
  
  -- Date d'il y a 4 mois
  date_ancienne := NOW() - INTERVAL '4 months';
  
  -- Insérer 2 membres éloignés
  INSERT INTO visiteurs (
    prenom,
    nom,
    email,
    telephone,
    statut,
    type,
    date_premier_contact,
    date_dernier_contact,
    invitant_id,
    source_contact,
    notes
  ) VALUES 
  (
    'Jean',
    'Dupont',
    'jean.dupont@example.com',
    '+33123456789',
    'eloigne',
    'ancien_eloigne',
    date_ancienne - INTERVAL '1 year', -- Premier contact il y a 1 an
    date_ancienne, -- Dernier contact il y a 4 mois
    user_test_id,
    'Invitation',
    'Membre éloigné depuis 4 mois - Test'
  ),
  (
    'Marie',
    'Martin',
    'marie.martin@example.com',
    '+33987654321',
    'eloigne',
    'ancien_eloigne',
    date_ancienne - INTERVAL '8 months', -- Premier contact il y a 8 mois
    date_ancienne - INTERVAL '1 month', -- Dernier contact il y a 5 mois
    user_test_id,
    'Événement',
    'Membre éloigné depuis 5 mois - Test'
  )
  ON CONFLICT (email) DO NOTHING; -- Éviter les doublons si on exécute plusieurs fois
  
END $$;

-- Vérification
SELECT 
  prenom,
  nom,
  email,
  statut,
  date_dernier_contact,
  NOW() - date_dernier_contact AS temps_ecoule
FROM visiteurs
WHERE statut = 'eloigne'
  AND date_dernier_contact < NOW() - INTERVAL '3 months'
ORDER BY date_dernier_contact ASC;



