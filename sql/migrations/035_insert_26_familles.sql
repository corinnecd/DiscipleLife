-- ============================================
-- Migration: Insertion des 26 familles de disciples
-- Objectif: Créer les 26 familles avec leurs superviseurs
-- ============================================

-- Note: Les superviseurs doivent exister dans la table profils avant d'exécuter cette migration
-- Si les superviseurs n'existent pas encore, cette migration créera les familles sans superviseur_id
-- Il faudra ensuite mettre à jour les superviseur_id une fois les comptes créés

-- Fonction pour insérer une famille si elle n'existe pas déjà
DO $$
DECLARE
  famille_record RECORD;
  superviseur_uuid UUID;
BEGIN
  -- Liste des 26 familles avec leurs superviseurs (mise à jour)
  FOR famille_record IN
    SELECT * FROM (VALUES
      ('LES DÉTERMINÉS', 'FAM001', 'Alain SIL'),
      ('Les VAILLANTS', 'FAM002', 'Andréa ERNEST'),
      ('Les ENRACINÉS', 'FAM003', 'Béraca KAZONGO'),
      ('Les ÉCLAIRÉS', 'FAM004', 'BETSALEEL BADILA'),
      ('Les AMOUREUX', 'FAM005', 'CARINE MATONDO'),
      ('ZÉLES', 'FAM006', 'COCO OKANZI'),
      ('INNARRÊTABLES', 'FAM007', 'CYNTHIA ALLOH'),
      ('LES TÉMOINS', 'FAM008', 'David SERVA'),
      ('LES COMBATTANTS', 'FAM009', 'ELISABETH AMECY'),
      ('LES AGAPÉS', 'FAM010', 'EPHREM MBA'),
      ('LES FIDÈLES', 'FAM011', 'GERVAIS NKATOULOULOU'),
      ('LES GLORIEUX', 'FAM012', 'HÉLÈNE LAMAGO'),
      ('Les Vaillants', 'FAM013', 'HÉLÈNE LAMAGO'),
      ('LES PERSÉVERANTS', 'FAM014', 'JOCELYNE FORTUNE'),
      ('LES ÉQUIPÉS', 'FAM015', 'KARINE WILLIAM'),
      ('LES INGÉNIEUX', 'FAM016', 'KEVIN THÉA'),
      ('LES VICTORIEUX', 'FAM017', 'LAËTITIA MISSATOU'),
      ('LES RACHETÉS', 'FAM018', 'LAËTITIA OBAME'),
      ('LES RADIEUSES', 'FAM018', 'MANICIA THÉA'),
      ('LES INTIMES', 'FAM019', 'NANCY NZI'),
      ('LES INEBRANLABLES', 'FAM020', 'NASDÈNE KODIA'),
      ('LES CHOISIS', 'FAM021', 'PATRICK BATSIAKA'),
      ('LES BOULEVERSEURS', 'FAM022', 'PROSPER LEBA'),
      ('LES PASSIONNÉS', 'FAM023', 'ROCHELLE PASSI BEN'),
      ('LES CONSACRÉS', 'FAM024', 'SERGE AMANY'),
      ('LES EMBRASÉS', 'FAM025', 'SNELLA MOUSSIO'),
      ('LES DISCIPLES', 'FAM026', 'YVAN DESSANDE')
    ) AS t(nom, identifiant, superviseur_nom)
  LOOP
    -- Chercher le superviseur par nom (approximatif - à ajuster selon la structure réelle)
    -- Note: Cette recherche peut ne pas fonctionner si les noms ne correspondent pas exactement
    -- Il faudra peut-être mettre à jour manuellement les superviseur_id après création des comptes
    SELECT id INTO superviseur_uuid
    FROM profils
    WHERE (
      LOWER(first_name || ' ' || last_name) LIKE LOWER('%' || famille_record.superviseur_nom || '%')
      OR LOWER(last_name || ' ' || first_name) LIKE LOWER('%' || famille_record.superviseur_nom || '%')
    )
    LIMIT 1;
    
    -- Insérer la famille si elle n'existe pas déjà
    INSERT INTO familles_disciples (nom, identifiant_famille, superviseur_id, objectif_disciples, statut)
    VALUES (
      famille_record.nom,
      famille_record.identifiant,
      superviseur_uuid, -- Peut être NULL si le superviseur n'existe pas encore
      70,
      'actif'
    )
    ON CONFLICT (identifiant_famille) DO NOTHING;
    
    -- Log pour débogage
    IF superviseur_uuid IS NULL THEN
      RAISE NOTICE 'Famille % créée sans superviseur (superviseur % non trouvé)', famille_record.nom, famille_record.superviseur_nom;
    ELSE
      RAISE NOTICE 'Famille % créée avec superviseur %', famille_record.nom, famille_record.superviseur_nom;
    END IF;
  END LOOP;
END $$;

-- Vérification : Afficher les familles créées
SELECT 
  id,
  nom,
  identifiant_famille,
  superviseur_id,
  objectif_disciples,
  statut
FROM familles_disciples
ORDER BY identifiant_famille;

